import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

const AADHAAR_PROMPT = `This is an Indian Aadhaar card image. Extract ONLY the following fields and respond with valid JSON only (no markdown, no explanation):
{
  "name": "full name of the card holder",
  "fatherName": "father's or spouse's name (from S/O, D/O, W/O, C/O field)",
  "dob": "date of birth in DD/MM/YYYY format if shown, else empty string",
  "age": "calculated age as a number string, else empty string",
  "gender": "Male or Female",
  "address": "complete address as a single string"
}
If a field cannot be found, use an empty string. Do NOT include Aadhaar number in the response.`;

const PAN_PROMPT = `This is an Indian PAN card image. Extract ONLY the following fields and respond with valid JSON only (no markdown, no explanation):
{
  "name": "full name of the card holder",
  "fatherName": "father's name as shown on the card",
  "pan": "10-character PAN number (5 letters + 4 digits + 1 letter)",
  "dob": "date of birth in DD/MM/YYYY format if shown, else empty string"
}
If a field cannot be found, use an empty string.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageBase64, mimeType, docType } = await request.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    const prompt = docType === 'aadhaar' ? AADHAAR_PROMPT : PAN_PROMPT;

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    // Strip markdown fences if present
    const jsonStr = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    const content = start !== -1 ? jsonStr.slice(start, end + 1) : '{}';

    // Validate
    const parsed = JSON.parse(content);

    // Auto-calculate age from DOB if not provided
    if (!parsed.age && parsed.dob) {
      const parts = parsed.dob.split(/[\/\-]/);
      if (parts.length === 3) {
        const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
        if (year > 1900) parsed.age = String(new Date().getFullYear() - year);
      }
    }

    return new Response(JSON.stringify({ data: parsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ocr.ts] Error:', error?.message);
    return new Response(JSON.stringify({ data: {}, error: error?.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
