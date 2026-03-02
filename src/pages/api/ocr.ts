import 'dotenv/config';
import type { APIRoute } from 'astro';
import { generateObject } from 'ai';
import { z } from 'zod';

const SchemaAadhaar = z.object({
  name: z.string().describe("full name of card holder").optional(),
  fatherName: z.string().describe("extracted from S/O, D/O, or W/O field").optional(),
  dob: z.string().describe("DD/MM/YYYY format or empty").optional(),
  age: z.string().describe("Calculate from DOB if not explicit").optional(),
  gender: z.string().describe("Male or Female").optional(),
  address: z.string().describe("Complete address string").optional(),
  aadhaarStored: z.boolean().describe("true if a valid 12-digit Aadhaar number was found, do NOT return the number itself").optional()
});

const SchemaPAN = z.object({
  name: z.string().describe("full name of card holder").optional(),
  fatherName: z.string().describe("father's name").optional(),
  dob: z.string().describe("DD/MM/YYYY format").optional(),
  pan: z.string().describe("10-character alphanumeric PAN number (e.g. ABCDE1234F)").optional()
});

export const POST: APIRoute = async ({ request }) => {
  // Ensure the `ai` package uses the provided Vercel AI Gateway key
  const gatewayKey = process.env.VERCEL_AI_API_KEY || import.meta.env.VERCEL_AI_API_KEY;
  if (gatewayKey) {
    process.env.AI_GATEWAY_API_KEY = gatewayKey;
  }

  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    console.log(`[ocr-gemini] Received: docType=${docType}, mimeType=${mimeType}, base64len=${imageBase64?.length ?? 0}`);

    if (!imageBase64 || imageBase64.length < 100) {
      return new Response(
        JSON.stringify({ data: {}, error: 'Image data is empty or too small' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { object } = await generateObject({
      // We leverage the built-in Vercel AI Gateway resolver using the string format
      model: 'google/gemini-2.0-flash-lite',
      schema: docType === 'aadhaar' ? SchemaAadhaar : SchemaPAN,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert OCR and data extraction system for Indian ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} cards.
Carefully read ALL visible text on this document image. 
Extract the requested properties precisely according to the schema.
Only extract information clearly present on the card. Do not hallucinate.
Ensure dates are in DD/MM/YYYY format.`
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${imageBase64}`
            }
          ]
        }
      ],
      temperature: 0.1,
    });

    console.log(`[ocr-gemini] Extraction complete:`, object);

    let finalData: Record<string, any> = { ...object };

    // Safety check and age normalization for Aadhaar
    if (docType === 'aadhaar') {
      if (!finalData.age && finalData.dob) {
        const parts = String(finalData.dob).split(/[\/\-]/);
        if (parts.length === 3) {
          const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
          if (yr > 1900) finalData.age = String(new Date().getFullYear() - yr);
        }
      }
    }

    // Default missing string fields to empty strings for component compatibility 
    const requiredStrFields = docType === 'aadhaar'
      ? ['name', 'fatherName', 'dob', 'age', 'gender', 'address']
      : ['name', 'fatherName', 'dob', 'pan'];

    requiredStrFields.forEach(k => {
      if (!finalData[k]) finalData[k] = '';
    });

    if (docType === 'aadhaar' && finalData.aadhaarStored === undefined) {
      finalData.aadhaarStored = false;
    }

    return new Response(JSON.stringify({ data: finalData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[ocr-gemini] Error:', err);
    return new Response(JSON.stringify({ data: {}, error: err?.message || 'Failed to analyze document' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
