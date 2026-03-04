import { geminiChat, geminiFlash } from '../lib/gemini';
import { SchemaType } from '@google/generative-ai';

/**
 * Handle conversational logic using Gemini 1.5 Flash
 */
export async function chatWithAI(
  systemPrompt: string,
  stateMessage: string,
  userMessages: any[]
) {
  const result = await geminiChat.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: stateMessage },
          ...userMessages.map((m: any) => ({ text: m.content })),
        ],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "update_deed_data",
            description:
              "Update the partnership deed data state. Call this whenever the user provides ANY deed information.",
            parameters: {
              type: "object",
              properties: {
                numPartners: { type: "number", description: "Total number of partners" },
                executionDate: { type: "string", description: "Deed execution date" },
                businessName: { type: "string", description: "Name of the firm" },
                natureOfBusiness: { type: "string", description: "Nature of business" },
                durationType: { type: "string", description: "Duration of partnership" },
                durationStartDate: { type: "string", description: "Start date of the firm" },
                registeredAddress: { type: "string", description: "Registered address" },
                businessObjective: { type: "string", description: "Business objectives paragraph" },
                partnerIndex: { type: "number", description: "0-indexed partner to update shortcut" },
                fullName: { type: "string", description: "Partner full name" },
                fatherName: { type: "string", description: "Partner father's name" },
                age: { type: "string", description: "Partner age" },
                address: { type: "string", description: "Partner residential address" },
                panNumber: { type: "string", description: "Partner PAN card number" },
                partners: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fullName: { type: "string" },
                      fatherName: { type: "string" },
                      age: { type: "string" },
                      address: { type: "string" },
                      panNumber: { type: "string" },
                      isManagingPartner: { type: "boolean" },
                      isBankAuthorized: { type: "boolean" },
                      capitalContribution: { type: "string" },
                      profitShare: { type: "string" }
                    }
                  }
                }
              }
            } as any
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1200
    }
  });

  return result.response;
}

/**
 * Extract data from Aadhaar or PAN card image using Gemini 1.5 Flash
 */
export async function extractOCR(
  docType: 'aadhaar' | 'pan',
  mimeType: string,
  imageBase64: string
) {
  const isAadhaar = docType === 'aadhaar';

  const prompt = `You are a strict, accurate OCR extraction engine for Indian ${docType.toUpperCase()} cards.

Rules:
- Extract ONLY what is clearly visible in the image.
- DO NOT guess, hallucinate, or fill in missing information.
- Return empty string "" for any field that is unclear, partially visible, or not present.
- Dates MUST be in exact DD/MM/YYYY format (e.g. "15/03/1995").
- For Aadhaar: NEVER return the actual 12-digit number — set aadhaarStored = true only if a 12-digit number pattern is visible.
- For PAN: return the 10-character alphanumeric PAN exactly as shown.
- Respond ONLY with clean JSON — no explanations, no extra text.

Required output structure for ${docType}:
${
  isAadhaar
    ? `{
  "name": "",
  "fatherName": "",
  "dob": "",
  "age": "",
  "gender": "",
  "address": "",
  "aadhaarStored": false
}`
    : `{
  "name": "",
  "fatherName": "",
  "dob": "",
  "pan": ""
}`
}`;

  const result = await geminiFlash.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json'
    }
  });

  try {
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("OCR JSON parse failed:", err);
    return isAadhaar
      ? { name: "", fatherName: "", dob: "", age: "", gender: "", address: "", aadhaarStored: false }
      : { name: "", fatherName: "", dob: "", pan: "" };
  }
}

/**
 * Generate 3 professional Indian partnership firm name suggestions
 */
export async function generateBusinessNames(natureOfBusiness: string) {
  const result = await geminiFlash.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are a legal naming assistant for Indian partnership firms.

Task:
Given business nature: "${natureOfBusiness}"

Suggest exactly 3 formal, professional, legally suitable partnership firm names.
Use traditional/respectable styles (e.g. & Brothers, Enterprises, Associates, Traders, Infra, Ventures, Solutions, etc. when appropriate).

Respond ONLY with valid JSON — nothing else:
{"names": ["Name One", "Name Two", "Name Three"]}

Examples:
- IT: ["Nexlify Solutions", "CodeVeda Technologies", "InnovateSoft Associates"]
- Trading: ["Shree Ganesh Traders", "Vishnu Kumar & Brothers", "Elite Merchandise Enterprises"]

No explanations, no markdown, pure JSON only.`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json'
    }
  });

  try {
    return JSON.parse(result.response.text()).names;
  } catch (err) {
    console.error("Business names JSON parse failed:", err);
    return ["Suggested Name 1", "Suggested Name 2", "Suggested Name 3"];
  }
}

/**
 * Generate business objectives clause for the Partnership Deed
 */
export async function generateBusinessObjectives(businessName: string, natureOfBusiness: string) {
  const prompt = `You are an expert legal drafter for Indian Partnership Deeds (Indian Partnership Act, 1932).

Write a concise, professional "Business Objectives" clause for a partnership firm named "${businessName}" engaged in "${natureOfBusiness}".

Use formal legal language suitable for inclusion in a Partnership Deed.
Keep it 3–6 sentences maximum.
Focus on the main activities, without unnecessary fluff.

Respond ONLY with the clause text — no JSON, no explanations, no introductions.`;

  const result = await geminiFlash.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.25, // lower = more consistent legal tone
      maxOutputTokens: 400
    }
  });

  return result.response.text().trim();
}