import type { APIRoute } from 'astro';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import Groq from 'groq-sdk';

// ─── Google Cloud Vision client ───────────────────────────────────────────────
// Credentials are stored as a JSON string in GOOGLE_APPLICATION_CREDENTIALS env var

function makeVisionClient(): ImageAnnotatorClient {
  const raw = import.meta.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  try {
    const credentials = JSON.parse(raw);
    // Fix escaped newlines in private_key (common when stored in .env as a string)
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return new ImageAnnotatorClient({ credentials });
  } catch {
    // Fallback: let the SDK pick up the env var as a file path
    return new ImageAnnotatorClient();
  }
}

const visionClient = makeVisionClient();
const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Stage 1 helpers: Regex-first PAN / Aadhaar extraction ───────────────────

const PAN_RX  = /[A-Z]{5}[0-9]{4}[A-Z]/;
const AADH_RX = /\d{4}\s?\d{4}\s?\d{4}/;

const OCR_MAP: Record<string, string> = { O: '0', I: '1', l: '1', B: '8', S: '5' };

function ocrCorrectBlock(s: string): string {
  return s.replace(/[OIlBS]/g, c => OCR_MAP[c] ?? c);
}

function extractPAN(text: string): string | null {
  const direct = text.match(PAN_RX);
  if (direct) return direct[0];
  const chunks = text.match(/[A-Za-z0-9]{10}/g) || [];
  for (const c of chunks) {
    const candidate =
      c.slice(0, 5).toUpperCase() +
      ocrCorrectBlock(c.slice(5, 9)) +
      c.slice(9).toUpperCase();
    if (PAN_RX.test(candidate)) return candidate;
  }
  return null;
}

function extractAadhaar(text: string): string | null {
  const m = text.match(AADH_RX);
  if (!m) return null;
  const digits = m[0].replace(/\s/g, '');
  return digits.length === 12 ? digits : null;
}

// ─── Stage 2: Groq text model — structured field extraction ──────────────────

const FIELD_EXTRACT_PROMPT = (docType: string) => `
You are an Indian identity document parser. Given the raw OCR text from an ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} card, extract the following fields.
Return ONLY valid JSON (no markdown, no explanation):
${docType === 'aadhaar'
    ? '{"name":"","fatherName":"","dob":"DD/MM/YYYY or empty","age":"number or empty","gender":"Male/Female or empty","address":""}'
    : '{"name":"","fatherName":"","dob":"DD/MM/YYYY or empty"}'
}
Rules:
- name: full name of card holder only
- fatherName: from S/O, D/O, W/O, C/O field
- dob: if shown, in DD/MM/YYYY; calculate age from DOB if age field missing
- address: complete address (Aadhaar only)
- Use empty string for missing fields. Do NOT fabricate data.
`;

async function extractFields(rawText: string, docType: 'aadhaar' | 'pan'): Promise<Record<string, string>> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: FIELD_EXTRACT_PROMPT(docType) },
        { role: 'user', content: `OCR TEXT:\n${rawText.slice(0, 2000)}` },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });
    const raw = completion.choices[0]?.message?.content || '{}';
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : '{}');
  } catch {
    return {};
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    // ── Stage 1: Google Cloud Vision — DOCUMENT_TEXT_DETECTION ──
    const [visionResult] = await visionClient.documentTextDetection({
      image: { content: imageBase64 },
    });
    const rawText = visionResult.fullTextAnnotation?.text || '';

    console.log('[ocr] Google Vision raw text length:', rawText.length);

    if (!rawText.trim()) {
      return new Response(JSON.stringify({ data: {}, error: 'No text detected by Google Vision' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Stage 2: Regex-first — PAN number & Aadhaar number ──
    const pan      = docType === 'pan'     ? extractPAN(rawText)     : null;
    const aadhaar  = docType === 'aadhaar' ? extractAadhaar(rawText) : null;

    // ── Stage 3: Groq text model — name, fatherName, DOB, age, address ──
    const fields = await extractFields(rawText, docType);

    // Auto-calculate age from DOB if not extracted
    let age = fields.age || '';
    if (!age && fields.dob) {
      const parts = fields.dob.split(/[\/\-]/);
      if (parts.length === 3) {
        const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
        if (yr > 1900 && yr < 2100) age = String(new Date().getFullYear() - yr);
      }
    }

    const data = docType === 'aadhaar'
      ? {
          name:        fields.name        || '',
          fatherName:  fields.fatherName  || '',
          dob:         fields.dob         || '',
          age,
          gender:      fields.gender      || '',
          address:     fields.address     || '',
          aadhaarStored: !!aadhaar,
        }
      : {
          name:        fields.name        || '',
          fatherName:  fields.fatherName  || '',
          dob:         fields.dob         || '',
          pan:         pan                || '',
        };

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[ocr] Error:', error?.message);
    return new Response(JSON.stringify({ data: {}, error: error?.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
