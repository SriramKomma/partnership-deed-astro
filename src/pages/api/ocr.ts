import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── JWT auth for Google APIs (REST, no gRPC) ─────────────────────────────────

function loadKey() {
  const keyPath = resolve(process.cwd(), 'google-key.json');
  const raw = JSON.parse(readFileSync(keyPath, 'utf8'));
  return {
    client_email: raw.client_email as string,
    private_key:  raw.private_key  as string,
    token_uri:    (raw.token_uri || 'https://oauth2.googleapis.com/token') as string,
  };
}

async function getAccessToken(): Promise<string> {
  const key = loadKey();
  const now  = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud:   key.token_uri,
    iat:   now,
    exp:   now + 3600,
  };
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const sign    = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(key.private_key, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res  = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`JWT token error: ${data.error}`);
  return data.access_token;
}

// ─── Google Cloud Document AI — REST (avoids gRPC issues in Vite SSR) ─────────

async function documentAiOcr(imageBase64: string, mimeType: string): Promise<string> {
  const location    = import.meta.env.GOOGLE_LOCATION    || 'us';
  const projectId   = import.meta.env.GOOGLE_PROJECT_ID;
  const processorId = import.meta.env.GOOGLE_PROCESSOR_ID;

  if (!projectId || !processorId) {
    throw new Error('GOOGLE_PROJECT_ID and GOOGLE_PROCESSOR_ID must be set in .env');
  }

  const token    = await getAccessToken();
  const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

  // REST API — content is base64 string (NOT Buffer; that's for gRPC only)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: {
        content:  imageBase64,      // base64 string as-is for REST
        mimeType: normalizeMime(mimeType),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText }})) as any;
    throw new Error(`Document AI ${res.status}: ${err?.error?.message || JSON.stringify(err)}`);
  }

  const json = await res.json() as any;
  const text = json.document?.text || '';
  console.log(`[ocr] Document AI REST OK — ${text.length} chars:`, text.slice(0, 150));
  return text;
}

// ─── Normalize mimeType → only formats both APIs accept ───────────────────────

function normalizeMime(mimeType: string): string {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('pdf'))               return 'application/pdf';
  if (m.includes('png'))               return 'image/png';
  if (m.includes('tiff') || m.includes('tif')) return 'image/tiff';
  if (m.includes('gif'))               return 'image/gif';
  if (m.includes('webp'))              return 'image/webp';
  // HEIC, BMP, AVIF, unknown → force JPEG (client always converts to JPEG for non-PDF)
  return 'image/jpeg';
}

// ─── Groq Vision fallback ─────────────────────────────────────────────────────

async function groqVisionFallback(
  imageBase64: string, mimeType: string, docType: string
): Promise<string> {
  const safeMime = normalizeMime(mimeType);
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${safeMime};base64,${imageBase64}` } },
        {
          type: 'text',
          text: `Read ALL visible text on this Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card image, line by line. Include every word, number, and label.`,
        },
      ],
    }],
    max_tokens: 600,
    temperature: 0.1,
  });
  return completion.choices[0]?.message?.content || '';
}

// ─── Regex extraction (PAN / Aadhaar) ────────────────────────────────────────

const PAN_RX  = /[A-Z]{5}[0-9]{4}[A-Z]/;
const AADH_RX = /\d{4}[\s-]?\d{4}[\s-]?\d{4}/;
const OCR_FIX: Record<string, string> = { O: '0', I: '1', l: '1', B: '8', S: '5' };

function extractPAN(text: string): string | null {
  const direct = text.match(PAN_RX);
  if (direct) return direct[0];
  for (const chunk of text.match(/[A-Za-z0-9]{10}/g) || []) {
    const c = chunk.slice(0, 5).toUpperCase() +
              chunk.slice(5, 9).replace(/[OIlBS]/g, x => OCR_FIX[x] ?? x) +
              chunk.slice(9).toUpperCase();
    if (PAN_RX.test(c)) return c;
  }
  return null;
}

function extractAadhaar(text: string): string | null {
  const m = text.match(AADH_RX);
  if (!m) return null;
  const d = m[0].replace(/[\s-]/g, '');
  return d.length === 12 ? d : null;
}

// ─── Groq text model — structured field extraction ────────────────────────────

async function extractFields(rawText: string, docType: 'aadhaar' | 'pan') {
  const schema = docType === 'aadhaar'
    ? '{"name":"","fatherName":"","dob":"DD/MM/YYYY or empty","age":"","gender":"Male/Female","address":""}'
    : '{"name":"","fatherName":"","dob":"DD/MM/YYYY or empty"}';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: [
          `Extract fields from Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card OCR text.`,
          `Return ONLY this JSON (no markdown):\n${schema}`,
          '- name: full name of card holder',
          '- fatherName: from S/O, D/O, W/O field',
          '- dob: DD/MM/YYYY format',
          '- age: calculate from DOB if not explicit',
          '- address: complete address string (Aadhaar only)',
          'Do NOT fabricate. Use empty string for missing fields.',
        ].join('\n'),
      },
      { role: 'user', content: `OCR TEXT:\n${rawText.slice(0, 2500)}` },
    ],
    max_tokens: 300,
    temperature: 0.1,
  });

  try {
    const raw = completion.choices[0]?.message?.content || '{}';
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    return JSON.parse(s !== -1 ? raw.slice(s, e + 1) : '{}');
  } catch {
    return {};
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    console.log(`[ocr] Received: docType=${docType}, mimeType=${mimeType}, base64len=${imageBase64?.length ?? 0}`);

    if (!imageBase64 || imageBase64.length < 100) {
      return new Response(
        JSON.stringify({ data: {}, error: 'Image data is empty or too small' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Stage 1: Google Cloud Document AI REST ──
    let rawText = '';
    let source  = 'document_ai';

    try {
      rawText = await documentAiOcr(imageBase64, mimeType);
    } catch (docErr: any) {
      console.warn('[ocr] Document AI failed:', docErr?.message);
      source = 'groq_vision';
      try {
        rawText = await groqVisionFallback(imageBase64, mimeType, docType);
        console.log(`[ocr] Groq Vision fallback OK — ${rawText.length} chars`);
      } catch (groqErr: any) {
        throw new Error(
          `Both OCR services failed.\nDocument AI: ${docErr?.message}\nGroq Vision: ${groqErr?.message}`
        );
      }
    }

    console.log(`[ocr] source=${source} | preview:`, rawText.slice(0, 120));

    if (!rawText.trim()) {
      return new Response(
        JSON.stringify({ data: {}, error: 'No text detected — please try a clearer image' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Stage 2: Regex number extraction ──
    const pan     = docType === 'pan'     ? extractPAN(rawText)     : null;
    const aadhaar = docType === 'aadhaar' ? extractAadhaar(rawText) : null;

    // ── Stage 3: Groq text model — name / dob / address ──
    const fields = await extractFields(rawText, docType);

    let age = fields.age || '';
    if (!age && fields.dob) {
      const parts = (fields.dob as string).split(/[\/\-]/);
      if (parts.length === 3) {
        const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
        if (yr > 1900) age = String(new Date().getFullYear() - yr);
      }
    }

    const data = docType === 'aadhaar'
      ? { name: fields.name||'', fatherName: fields.fatherName||'', dob: fields.dob||'', age, gender: fields.gender||'', address: fields.address||'', aadhaarStored: !!aadhaar }
      : { name: fields.name||'', fatherName: fields.fatherName||'', dob: fields.dob||'', pan: pan||'' };

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[ocr] Unhandled error:', err?.message);
    return new Response(JSON.stringify({ data: {}, error: err?.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
