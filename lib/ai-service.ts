import { geminiChat, geminiFlash } from '../lib/gemini';
import { SchemaType } from '@google/generative-ai';

/**
 * Handle conversational logic using Gemini Flash
 * Uses proper multi-turn conversation format: alternating user/model roles.
 * systemPrompt is injected as a leading user message (Gemini has no system role).
 */
export async function chatWithAI(
  systemPrompt: string,
  stateMessage: string,
  userMessages: any[]
) {
  // Build proper alternating conversation history
  // Gemini requires: user → model → user → model … (must start and end with user)
  const historyContents: { role: string; parts: { text: string }[] }[] = [];

  // Always start with system prompt + current state as first user turn
  historyContents.push({
    role: "user",
    parts: [{ text: `${systemPrompt}\n\n---\n\n${stateMessage}` }],
  });

  // Interleave history. The first message in userMessages should be the initial
  // assistant greeting (role: assistant), so we need a dummy model reply for the
  // system turn first, then actual history.
  for (const m of userMessages) {
    const role = m.role === "assistant" ? "model" : "user";
    historyContents.push({
      role,
      parts: [{ text: m.content }],
    });
  }

  // Gemini requires the last turn to be "user". If history ends on model, add a
  // placeholder so Gemini generates the next model response.
  // (In normal flow the last message is always the current user message, so this
  // is a safety net.)
  const lastRole = historyContents[historyContents.length - 1]?.role;
  if (lastRole === "model") {
    historyContents.push({ role: "user", parts: [{ text: stateMessage }] });
  }

  const result = await geminiChat.generateContent({
    contents: historyContents as any,
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
 * Includes strict anti-hallucination measures
 */
export async function extractOCR(
  docType: 'aadhaar' | 'pan',
  mimeType: string,
  imageBase64: string
) {
  const isAadhaar = docType === 'aadhaar';

  const prompt = `You are a STRICT OCR extraction engine for Indian ${docType.toUpperCase()} cards. Your job is to **ONLY** extract what is visible in the image. NEVER guess or hallucinate.

ABSOLUTE RULES (CRITICAL):
1. Extract ONLY text that is crystal clear and unambiguous in the image.
2. If ANY field is unclear, partially visible, blurry, or missing → return empty string "".
3. DO NOT fill in, suggest, or invent missing information.
4. DO NOT make assumptions about illegible text.
5. Dates MUST be in exact DD/MM/YYYY format (e.g., "15/03/1995"). If unclear, return "".
6. For Aadhaar: NEVER return the actual 12-digit number for security. Set aadhaarStored=true only if pattern is clearly visible, never store the number itself.
7. For PAN: return exactly as shown, alphanumeric only.
8. Respond ONLY with the JSON object below — NO explanations, NO extra text, NO markdown.

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
  "aadhaarStored": false,
  "confidence": "high|medium|low"
}`
    : `{
  "name": "",
  "fatherName": "",
  "dob": "",
  "pan": "",
  "confidence": "high|medium|low"
}`
}

If you cannot confidently extract most fields, set confidence to "low" and only put values you are 100% certain about.`;

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
      temperature: 0.0, // Absolute zero for OCR - no creativity
      responseMimeType: 'application/json',
      maxOutputTokens: 300
    }
  });

  try {
    const parsed = JSON.parse(result.response.text());
    
    // Validate confidence level - if low, flag for manual review
    if (parsed.confidence === 'low') {
      console.warn(`OCR extraction returned low confidence for ${docType}`);
    }
    
    // Remove confidence from final response if you want, or keep for UI feedback
    const { confidence, ...extractedData } = parsed;
    return { ...extractedData, _confidence: confidence };
  } catch (err) {
    console.error(`OCR JSON parse failed for ${docType}:`, err);
    return isAadhaar
      ? { name: "", fatherName: "", dob: "", age: "", gender: "", address: "", aadhaarStored: false, _confidence: "error" }
      : { name: "", fatherName: "", dob: "", pan: "", _confidence: "error" };
  }
}

/**
 * Validate business name format (basic sanity check)
 */
function isValidBusinessName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 100) return false;
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  // No suspicious patterns
  if (/\d{10,}/.test(name)) return false; // Long digit sequences
  return true;
}

/**
 * Generate 3 professional Indian partnership firm name suggestions
 */
export async function generateBusinessNames(natureOfBusiness: string) {
  // Input sanitization
  const sanitizedBusiness = (natureOfBusiness || '').trim().slice(0, 150);
  if (!sanitizedBusiness) {
    console.warn("Empty business nature provided");
    return ["Select a Business Nature First", "Suggested Name 2", "Suggested Name 3"];
  }

  const result = await geminiFlash.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are a legal naming assistant for Indian partnership firms. Your ONLY job is to suggest names — do not make assumptions or invent information.

STRICT RULES:
- Suggest EXACTLY 3 names for business nature: "${sanitizedBusiness}"
- Each name must be professional, formal, and suitable for LEGAL registration in India
- Use suffixes like: & Brothers, & Associates, & Co., Enterprises, Solutions, Services, Traders, etc.
- DO NOT make up names that sound fake or unrelated to the business
- DO NOT suggest copyrighted or trademarked names
- Each name must be 3-60 characters

RESPOND ONLY with this exact JSON format — nothing else:
{"names": ["Name One", "Name Two", "Name Three"]}

If you cannot generate valid names, respond with:
{"names": ["Generic Name 1", "Generic Name 2", "Generic Name 3"]}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Much stricter than before
      responseMimeType: 'application/json',
      maxOutputTokens: 200
    }
  });

  try {
    const parsed = JSON.parse(result.response.text());
    const names = parsed.names || [];
    
    // Validate all returned names
    const validNames = names.filter(isValidBusinessName).slice(0, 3);
    
    if (validNames.length === 3) {
      return validNames;
    }
    
    // If validation failed, log and return defaults
    console.warn(`Only ${validNames.length} valid names returned, filling with defaults`);
    return [
      validNames[0] || `${sanitizedBusiness} Associates`,
      validNames[1] || `${sanitizedBusiness} Enterprises`,
      validNames[2] || `${sanitizedBusiness} Solutions`
    ];
  } catch (err) {
    console.error("Business names JSON parse failed:", err);
    return [`${sanitizedBusiness} & Co.`, `${sanitizedBusiness} Services`, `${sanitizedBusiness} Solutions`];
  }
}

/**
 * Generate business objectives clause for the Partnership Deed
 */
export async function generateBusinessObjectives(businessName: string, natureOfBusiness: string) {
  // Input sanitization
  const sanitizedName = (businessName || '').trim().slice(0, 200);
  const sanitizedNature = (natureOfBusiness || '').trim().slice(0, 200);
  
  if (!sanitizedName || !sanitizedNature) {
    return "The partnership business shall be carried on in accordance with the business nature as agreed by partners.";
  }

  const prompt = `You are an expert legal drafter for Indian Partnership Deeds under the Indian Partnership Act, 1932. Your ONLY job is to write a tight, accurate Business Objectives clause.

CRITICAL RULES:
- Write for a firm named: "${sanitizedName}"
- Business nature: "${sanitizedNature}"
- Use formal legal language ONLY — no marketing fluff
- Keep it SHORT: 2-4 sentences maximum
- Do NOT invent details not mentioned in the business nature
- Do NOT make assumptions about specific services, products, or markets
- Do NOT include irrelevant clauses
- Focus ONLY on what the ${sanitizedNature} business actually does

Respond ONLY with the clause text — no explanations, no JSON, no markdown, no extra words.`;

  const result = await geminiFlash.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.15, // Very low for legal consistency
      maxOutputTokens: 300
    }
  });

  let clause = result.response.text().trim();
  
  // Basic validation: should not be empty or too long
  if (!clause || clause.length < 20) {
    clause = `The partnership shall engage in the business of ${sanitizedNature}.`;
  } else if (clause.length > 1000) {
    // Truncate if Gemini got too verbose
    clause = clause.substring(0, 800) + "...";
  }
  
  return clause;
}