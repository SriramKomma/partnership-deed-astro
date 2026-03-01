import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Regex-first validators ───────────────────────────────────────────────────
// Use LLM only as fallback for OCR correction

const PAN_RX   = /[A-Z]{5}[0-9]{4}[A-Z]/;
const AADH_RX  = /\d{4}\s?\d{4}\s?\d{4}/;

// Common OCR character corrections
function ocrCorrect(s: string): string {
  return s
    .replace(/O/g, '0').replace(/o/g, '0')  // O → 0 in numeric positions
    .replace(/I/g, '1').replace(/l/g, '1')  // I/l → 1
    .replace(/B/g, '8')                      // B → 8 in numeric context
    .replace(/S/g, '5');                     // S → 5 in numeric context
}

function extractPAN(text: string): string | null {
  // Try direct regex first
  const m = text.match(PAN_RX);
  if (m) return m[0];
  // Try after OCR corrections on candidate substrings (10-char blocks)
  const candidates = text.match(/[A-Za-z0-9BIOSlos]{10}/g) || [];
  for (const c of candidates) {
    const corrected = c.slice(0,5).toUpperCase() +
                      ocrCorrect(c.slice(5,9)) +
                      c.slice(9).toUpperCase();
    if (PAN_RX.test(corrected)) return corrected;
  }
  return null;
}

function extractAadhaar(text: string): string | null {
  const m = text.match(AADH_RX);
  if (!m) return null;
  const digits = m[0].replace(/\s/g, '');
  return digits.length === 12 ? digits : null;
}

// ─── Vision prompt ────────────────────────────────────────────────────────────

const AADHAAR_PROMPT = `This is an Indian Aadhaar card image. Extract these fields and respond ONLY with valid JSON (no markdown):
{
  "name": "card holder full name",
  "fatherName": "father or spouse name from S/O, D/O, W/O field",
  "dob": "date of birth DD/MM/YYYY or empty string",
  "age": "age as number string or empty string",
  "gender": "Male or Female or empty string",
  "address": "complete address as single string",
  "rawText": "all text you can see on the card concatenated"
}
Use empty string for any field not found. Do NOT include the 12-digit Aadhaar number in any field.`;

const PAN_PROMPT = `This is an Indian PAN card image. Extract these fields and respond ONLY with valid JSON (no markdown):
{
  "name": "card holder full name",
  "fatherName": "father name",
  "dob": "date of birth DD/MM/YYYY or empty string",
  "rawText": "all text you can see on the card concatenated"
}
Use empty string for any field not found. Do NOT include the PAN number in any field.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    // ── Step 1: Vision model extracts text + structured fields ──
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: docType === 'aadhaar' ? AADHAAR_PROMPT : PAN_PROMPT },
        ],
      }],
      max_tokens: 600,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const jsonStr = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    const s = jsonStr.indexOf('{'), e = jsonStr.lastIndexOf('}');
    const llmData = JSON.parse(s !== -1 ? jsonStr.slice(s, e + 1) : '{}');

    const rawText: string = llmData.rawText || raw;

    // ── Step 2: Regex-first PAN / Aadhaar extraction from rawText ──
    let pan: string | null = null;
    let aadhaarFound: string | null = null;

    if (docType === 'pan') {
      pan = extractPAN(rawText);
    } else {
      aadhaarFound = extractAadhaar(rawText);
    }

    // ── Step 3: Build final response ──
    let age = llmData.age || '';
    if (!age && llmData.dob) {
      const parts = (llmData.dob as string).split(/[\/\-]/);
      if (parts.length === 3) {
        const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
        if (yr > 1900) age = String(new Date().getFullYear() - yr);
      }
    }

    const data = docType === 'aadhaar'
      ? { name: llmData.name || '', fatherName: llmData.fatherName || '', dob: llmData.dob || '', age, gender: llmData.gender || '', address: llmData.address || '', aadhaarStored: !!aadhaarFound }
      : { name: llmData.name || '', fatherName: llmData.fatherName || '', dob: llmData.dob || '', pan: pan || '' };

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ocr.ts]', error?.message);
    return new Response(JSON.stringify({ data: {}, error: error?.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
