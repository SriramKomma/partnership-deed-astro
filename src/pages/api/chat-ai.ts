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

const SYSTEM_PROMPT = `You are a professional legal AI assistant tasked with drafting an Indian Partnership Deed.
Your goal is to converse with the user, answer their questions, and progressively extract all required details for the deed.

INSTRUCTIONS:
1. Examine the current deed data state provided by the system. Identify which fields are missing or empty.
2. Ask the user ONE or TWO simple questions at a time to gather the missing information.
3. If the user provides information that belongs in the deed, CALL THE 'update_deed_data' TOOL to save it.
4. If the user asks a legal or general question, answer it politely, then steer back to collecting the missing fields.
5. If all required fields are filled (minimum 2 partners with all details, business name, nature, address, start date, capital, profit share), congratulate them and say the deed is ready to download!
6. Do NOT ask for Aadhaar numbers since users will just upload IDs. If they upload an ID, the system will tell you the extracted details.

REQUIRED FIELDS TO BE CONSIDERED COMPLETE:
- businessName, natureOfBusiness, registeredAddress, durationStartDate
- At least 2 partners. EACH PARTNER MUST HAVE: fullName, fatherName, age, address.
- At least one managing partner, and at least one bank authorized partner.
- Each partner needs capitalContribution and profitShare (must sum to 100 across partners).
- businessObjective (you can draft this yourself using a tool call once businessName and natureOfBusiness are known!).

Call the 'update_deed_data' tool whenever you infer a field! You can call it and respond with text in the same turn.`;

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
