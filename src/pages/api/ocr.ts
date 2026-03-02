import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Google Cloud Vision via REST API (avoids gRPC issues in Astro SSR) ──────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function loadCredentials(): ServiceAccountKey {
  // GOOGLE_CREDENTIALS_FILE = single-line file path in .env (avoids multiline JSON parse issue)
  const filePath = import.meta.env.GOOGLE_CREDENTIALS_FILE ||
                   process.env.GOOGLE_CREDENTIALS_FILE;
  if (!filePath) throw new Error('GOOGLE_CREDENTIALS_FILE env var not set');

  const raw = readFileSync(filePath, 'utf8');
  const creds = JSON.parse(raw);
  return {
    client_email: creds.client_email,
    private_key:  creds.private_key,                    // file already has real newlines
    token_uri:    creds.token_uri || 'https://oauth2.googleapis.com/token',
  };
}

async function getAccessToken(creds: ServiceAccountKey): Promise<string> {
  // Build JWT using Web Crypto (available in Node 18+)
  const now  = Math.floor(Date.now() / 1000);
  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: creds.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const sigInput = `${header}.${payload}`;

  // Sign with RSA-SHA256 using Node crypto
  const { createSign } = await import('node:crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(sigInput);
  const signature = sign.sign(creds.private_key, 'base64url');

  const jwt = `${sigInput}.${signature}`;

  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Token error: ${data.error}`);
  return data.access_token;
}

async function googleVisionOCR(imageBase64: string): Promise<string> {
  const creds = loadCredentials();
  const token = await getAccessToken(creds);

  const res = await fetch(
    'https://vision.googleapis.com/v1/images:annotate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }),
    },
  );

  const json = await res.json() as any;
  if (json.error) throw new Error(json.error.message);
  return json.responses?.[0]?.fullTextAnnotation?.text || '';
}

// ─── Regex-first PAN / Aadhaar ────────────────────────────────────────────────

const PAN_RX  = /[A-Z]{5}[0-9]{4}[A-Z]/;
const AADH_RX = /\d{4}[\s-]?\d{4}[\s-]?\d{4}/;
const OCR_FIX: Record<string, string> = { O:'0', I:'1', l:'1', B:'8', S:'5' };

function extractPAN(text: string): string | null {
  const direct = text.match(PAN_RX);
  if (direct) return direct[0];
  for (const chunk of text.match(/[A-Za-z0-9]{10}/g) || []) {
    const c = chunk.slice(0,5).toUpperCase() +
              chunk.slice(5,9).replace(/[OIlBS]/g, x => OCR_FIX[x]??x) +
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
        content: `Extract fields from Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card OCR text. Return ONLY this JSON (no markdown):\n${schema}\n- name: full name of card holder\n- fatherName: from S/O, D/O, W/O field\n- dob: DD/MM/YYYY format\n- age: calculate from DOB if not explicit\n- address: complete address string (Aadhaar only)\nDo NOT fabricate. Use empty string for missing fields.`,
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
    const { imageBase64, mimeType: _mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    // Stage 1a: Google Cloud Vision OCR (primary)
    let rawText = '';
    let visionSource = 'google';
    try {
      rawText = await googleVisionOCR(imageBase64);
      console.log(`[ocr] Google Vision OK (${rawText.length} chars)`);
    } catch (gErr: any) {
      // Fallback to Groq Vision if Google Vision fails (billing, quota, etc.)
      console.warn('[ocr] Google Vision failed, falling back to Groq Vision:', gErr?.message);
      visionSource = 'groq';
      try {
        const fallback = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${_mimeType};base64,${imageBase64}` } },
              { type: 'text', text: `Read ALL the text you can see on this Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card image. Return only the raw text, line by line. Include every word, number, and label visible.` },
            ],
          }],
          max_tokens: 600,
          temperature: 0.1,
        });
        rawText = fallback.choices[0]?.message?.content || '';
        console.log(`[ocr] Groq Vision fallback OK (${rawText.length} chars)`);
      } catch (gqErr: any) {
        throw new Error(`Both OCR services failed. Google: ${gErr?.message}. Groq: ${gqErr?.message}`);
      }
    }
    console.log(`[ocr] Source: ${visionSource} | Text preview:`, rawText.slice(0, 150));

    if (!rawText.trim()) {
      return new Response(
        JSON.stringify({ data: {}, error: 'No text detected — please try a clearer image' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Stage 2: Regex-first number extraction
    const pan     = docType === 'pan'     ? extractPAN(rawText)     : null;
    const aadhaar = docType === 'aadhaar' ? extractAadhaar(rawText) : null;

    // Stage 3: Groq — name / father / DOB / address
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
    console.error('[ocr] Error:', err?.message);
    return new Response(JSON.stringify({ data: {}, error: err?.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
