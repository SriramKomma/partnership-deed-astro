import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Zod Schema for Deed Data Updates ──────────────────────────────────────────

const PartnerUpdateSchema = z.object({
  fullName: z.string().optional().describe("Partner's full name"),
  fatherName: z.string().optional().describe("Partner's father's/spouse's name"),
  age: z.string().optional().describe("Partner's age in years"),
  address: z.string().optional().describe("Partner's residential address"),
  panNumber: z.string().optional().describe("Partner's PAN card number"),
  isManagingPartner: z.boolean().optional().describe("Whether partner is a managing partner"),
  isBankAuthorized: z.boolean().optional().describe("Whether partner is authorized to operate bank account"),
  capitalContribution: z.string().optional().describe("Capital contribution percentage (e.g. '50')"),
  profitShare: z.string().optional().describe("Profit share percentage (e.g. '50')"),
});

const DeedUpdateSchema = z.object({
  numPartners: z.number().optional().describe("The total number of partners in the firm (e.g. 2, 3)"),
  executionDate: z.string().optional().describe("Deed execution date (e.g. '01st March 2026')"),
  businessName: z.string().optional().describe("Name of the firm"),
  natureOfBusiness: z.string().optional().describe("Nature of business (e.g. 'IT Services')"),
  durationType: z.string().optional().describe("Duration of partnership, e.g. 'AT WILL'"),
  durationStartDate: z.string().optional().describe("Start date of the firm"),
  registeredAddress: z.string().optional().describe("Registered address of the firm"),
  businessObjective: z.string().optional().describe("A 100-word paragraph drafting the business objectives"),
  // Note: we accept an array of partner updates. If there are 2 partners, array should have 2 elements.
  partners: z.array(PartnerUpdateSchema).optional().describe("List of partners and their details"),
});

const jsonSchema = zodToJsonSchema(DeedUpdateSchema, "DeedUpdateSchema");

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional legal AI assistant drafting an Indian Partnership Deed.
You MUST follow this STRICT chronological sequence to collect information:

PHASE 1: Number of Partners
- If 'numPartners' is absent, your ONLY question must be: "How many partners will be in this firm?"
- Once the user answers, call the update_deed_data tool with numPartners.

PHASE 2: Partner Details (Strictly via Uploads First)
- For each partner (from 1 up to numPartners), check if their basic details (name, fatherName, age, address, panNumber) are filled.
- If a partner's details are missing, you MUST ask the user to click the "Upload Aadhaar" and "Upload PAN" buttons for that specific partner.
  Example: "Great. Let's get details for Partner 1. Please click the 'Upload Aadhaar' and 'Upload PAN' buttons below to auto-fill their details. If you prefer, quote 'manual' and I will ask you for them."
- DO NOT ask them to manually type their name/age/address UNLESS they explicitly say they want to type it manually or their upload failed.
- The system will inject OCR results when they upload. Acknowledge them warmly and move to the next missing detail or next partner.
- Repeat this until all partners have their basic details filled.

PHASE 3: Business & Financial Details
- Once all partners' basic details are present, ask for:
  * Business Name, Nature of Business, Registered Address, Start Date.
  * Which partners are Managing Partners & Bank Authorized.
  * Capital Contribution and Profit Share percentages for each partner (must sum to 100).
  * businessObjective (you can draft this yourself using the tool once businessName and natureOfBusiness are known!).

GENERAL RULES:
1. Examine the CURRENT DEED DATA STATE to know exactly what phase you are in.
2. Ask for ONLY ONE thing at a time. Do not overwhelm the user.
3. If they provide data, ALWAYS emit a tool call to update_deed_data.
4. If they ask a legal or general question, answer it politely, then steer back to your current Phase.
5. If everything in Phase 1, 2, and 3 is complete, say: "✅ Your Partnership Deed is complete! You can review or download it from the right panel."`;

// ─── API Route ────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, deedData } = body as {
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
      deedData: Record<string, any>;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 });
    }

    // Inject the current state so the LLM knows what is missing
    const stateMessage = {
      role: 'system' as const,
      content: `CURRENT DEED DATA STATE:\n\`\`\`json\n${JSON.stringify(deedData, null, 2)}\n\`\`\`\n\nEvaluate what's missing and ask for it. If they just provided data, extract it using the tool!`
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        stateMessage,
        ...messages.map(m => ({ role: m.role, content: m.content } as any))
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'update_deed_data',
            description: 'Update the partnership deed data with newly extracted information from the user.',
            parameters: (jsonSchema as any).definitions.DeedUpdateSchema || jsonSchema,
          }
        }
      ],
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.2, // low temp for extraction reliability
    });

    const responseMsg = completion.choices[0]?.message;
    let textResponse = responseMsg?.content || '';
    let extractedData = null;

    if (responseMsg?.tool_calls?.length) {
      const call = responseMsg.tool_calls.find(t => t.function.name === 'update_deed_data');
      if (call) {
        try {
          extractedData = JSON.parse(call.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool call args:", call.function.arguments);
        }
      }
    }

    return new Response(JSON.stringify({
      content: textResponse,
      extractedData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[chat-ai.ts] Error:', error?.message);
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
