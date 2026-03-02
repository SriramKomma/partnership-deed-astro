import type { APIRoute } from 'astro';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { resolve } from 'node:path';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Google Cloud Document AI client ─────────────────────────────────────────
// Credentials: google-key.json in project root (GOOGLE_APPLICATION_CREDENTIALS=./google-key.json)
// Processor:   GOOGLE_PROJECT_ID / GOOGLE_LOCATION / GOOGLE_PROCESSOR_ID in .env

// google-key.json (project root) = oneasyai service account = has Document AI access
// GOOGLE_CREDENTIALS_FILE in .env is the OLD resumechecker account — don't use it for Doc AI
function makeDocAIClient() {
  const location = import.meta.env.GOOGLE_LOCATION || 'us';
  // Priority 1: google-key.json in project root (oneasyai credentials with Doc AI access)
  // Priority 2: GOOGLE_CREDENTIALS_FILE env var (fallback)
  const keyFile  = resolve(process.cwd(), 'google-key.json');
  return new DocumentProcessorServiceClient({
    keyFilename: keyFile,
    apiEndpoint: `${location}-documentai.googleapis.com`,
  });
}


async function googleDocAiOcr(imageBase64: string, mimeType: string): Promise<string> {
  const location    = import.meta.env.GOOGLE_LOCATION    || 'us';
  const projectId   = import.meta.env.GOOGLE_PROJECT_ID;
  const processorId = import.meta.env.GOOGLE_PROCESSOR_ID;

  if (!projectId || !processorId) {
    throw new Error('GOOGLE_PROJECT_ID and GOOGLE_PROCESSOR_ID must be set in .env');
  }

  const processorName =
    `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const client = makeDocAIClient();

  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: Buffer.from(imageBase64, 'base64'),
      mimeType: mimeType || 'image/jpeg',
    },
  });

  const text = result.document?.text || '';
  console.log(`[ocr] Document AI OK — ${text.length} chars:`, text.slice(0, 200));
  return text;
}

// ─── Regex-first PAN / Aadhaar extraction ─────────────────────────────────────

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

  const sysPrompt = [
    `Extract fields from Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card OCR text.`,
    `Return ONLY this JSON (no markdown):\n${schema}`,
    '- name: full name of card holder',
    '- fatherName: from S/O, D/O, W/O field',
    '- dob: DD/MM/YYYY format',
    '- age: calculate from DOB if not explicit',
    '- address: complete address string (Aadhaar only)',
    'Do NOT fabricate. Use empty string for missing fields.',
  ].join('\n');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user',   content: `OCR TEXT:\n${rawText.slice(0, 2500)}` },
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

// ─── Groq Vision fallback ─────────────────────────────────────────────────────

async function groqVisionFallback(
  imageBase64: string, mimeType: string, docType: string
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        {
          type: 'text',
          text: `Read ALL visible text on this Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card image. Return only the raw text, line by line. Include every word, number, and label.`,
        },
      ],
    }],
    max_tokens: 600,
    temperature: 0.1,
  });
  return completion.choices[0]?.message?.content || '';
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    // ── Stage 1: Google Cloud Document AI (primary) ──
    let rawText = '';
    let source  = 'document_ai';

    try {
      rawText = await googleDocAiOcr(imageBase64, mimeType);
    } catch (docAiErr: any) {
      console.warn('[ocr] Document AI failed, falling back to Groq Vision:', docAiErr?.message);
      source = 'groq_vision';
      try {
        rawText = await groqVisionFallback(imageBase64, mimeType, docType);
        console.log(`[ocr] Groq Vision fallback OK — ${rawText.length} chars`);
      } catch (groqErr: any) {
        throw new Error(
          `Both OCR services failed.\nDocument AI: ${docAiErr?.message}\nGroq Vision: ${groqErr?.message}`
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

    // ── Stage 2: Regex number extraction (zero hallucination) ──
    const pan     = docType === 'pan'     ? extractPAN(rawText)     : null;
    const aadhaar = docType === 'aadhaar' ? extractAadhaar(rawText) : null;

    // ── Stage 3: Groq text model — name / dob / address ──
    const fields = await extractFields(rawText, docType);

    // Auto-calculate age from DOB if missing
    let age = fields.age || '';
    if (!age && fields.dob) {
      const parts = (fields.dob as string).split(/[\/\-]/);
      if (parts.length === 3) {
        const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
        if (yr > 1900) age = String(new Date().getFullYear() - yr);
      }
    }

    const data = docType === 'aadhaar'
      ? {
          name:             fields.name      || '',
          fatherName:       fields.fatherName || '',
          dob:              fields.dob        || '',
          age,
          gender:           fields.gender    || '',
          address:          fields.address   || '',
          aadhaarStored:    !!aadhaar,
        }
      : {
          name:             fields.name      || '',
          fatherName:       fields.fatherName || '',
          dob:              fields.dob        || '',
          pan:              pan               || '',
        };

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
