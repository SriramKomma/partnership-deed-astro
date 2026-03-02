import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// ─── Zod Schema for Deed Data Updates (Tool Call) ──────────────────────────
const PartnerUpdateSchema = z.object({
  fullName: z.string().optional().describe("Partner's full name"),
  fatherName: z.string().optional().describe("Partner's father's/spouse's name"),
  age: z.string().optional().describe("Partner's age in years"),
  address: z.string().optional().describe("Partner's residential address"),
  panNumber: z.string().optional().describe("Partner's PAN card number"),
  isManagingPartner: z.boolean().optional().describe("Whether partner is a managing partner (true/false)"),
  isBankAuthorized: z.boolean().optional().describe("Whether partner is authorized to operate bank account (true/false)"),
  capitalContribution: z.string().optional().describe("Capital contribution percentage (e.g. '50')"),
  profitShare: z.string().optional().describe("Profit share percentage (e.g. '50')"),
});

const DeedUpdateSchema = z.object({
  numPartners: z.union([z.number(), z.string().transform(v => v === "" ? undefined : Number(v))]).optional().describe("The total number of partners in the firm (e.g. 2, 3)"),
  executionDate: z.string().optional().describe("Deed execution date (e.g. '01st March 2026')"),
  businessName: z.string().optional().describe("Name of the firm"),
  natureOfBusiness: z.string().optional().describe("Nature of business (e.g. 'IT Services')"),
  durationType: z.string().optional().describe("Duration of partnership, e.g. 'AT WILL'"),
  durationStartDate: z.string().optional().describe("Start date of the firm"),
  registeredAddress: z.string().optional().describe("Registered address of the firm"),
  businessObjective: z.string().optional().describe("A 100-word paragraph drafting the business objectives"),
  partners: z.array(PartnerUpdateSchema).optional().describe("List of partners and their details"),
  // Shortcuts for the partner currently being discussed
  fullName: z.string().optional().describe("Shortcut to update a partner's full name"),
  fatherName: z.string().optional().describe("Shortcut to update a partner's father's name"),
  age: z.string().optional().describe("Shortcut to update a partner's age"),
  address: z.string().optional().describe("Shortcut to update a partner's address"),
  panNumber: z.string().optional().describe("Shortcut to update a partner's PAN"),
  partnerIndex: z.number().optional().describe("Index of the partner to update (0-indexed). Defaults to the first partner if not specified."),
});

const jsonSchema = zodToJsonSchema(DeedUpdateSchema, "DeedUpdateSchema");

function getMissingFields(data: any): string[] {
  const missing: string[] = [];

  if (!data?.numPartners) missing.push("Number of Partners");
  if (!data?.executionDate) missing.push("Execution Date");
  if (!data?.businessName) missing.push("Firm Name");
  if (!data?.natureOfBusiness) missing.push("Nature of Business");
  if (!data?.durationStartDate) missing.push("Business Start Date");
  if (!data?.registeredAddress) missing.push("Registered Address");

  const numProps = data?.numPartners || 0;
  if (numProps > 0) {
    for (let i = 0; i < numProps; i++) {
      const p = data?.partners?.[i] || {};
      const num = i + 1;
      if (!p.fullName) missing.push(`Partner ${num} Full Name`);
      if (!p.fatherName) missing.push(`Partner ${num} Father's Name`);
      if (!p.age) missing.push(`Partner ${num} Age`);
      if (!p.address) missing.push(`Partner ${num} Address`);
      if (!p.panNumber) missing.push(`Partner ${num} PAN Number`);
      if (!p.capitalContribution) missing.push(`Partner ${num} Capital Contribution %`);
      if (!p.profitShare) missing.push(`Partner ${num} Profit Share %`);
    }

    const allBasicsFilled = data?.partners?.slice(0, numProps).every((p: any) => p.fullName);
    if (allBasicsFilled && numProps >= 2) {
      const hasManager = data?.partners?.slice(0, numProps).some((p: any) => p.isManagingPartner);
      const hasBanker = data?.partners?.slice(0, numProps).some((p: any) => p.isBankAuthorized);
      if (!hasManager) missing.push(`Who will be the Managing Partner(s)?`);
      if (!hasBanker) missing.push(`Who will be Authorized to operate Bank Accounts?`);
    }
  }

  if (!data?.businessObjective && data?.businessName && data?.natureOfBusiness) {
    missing.push("Drafting the Business Objectives (AI can generate this automatically)");
  }

  return missing;
}

const SYSTEM_PROMPT = `You are a professional, warm, and highly capable legal AI assistant drafting an Indian Partnership Deed.
Your goal is to converse naturally with the user, progressively collecting ONLY the missing information required to finalize their deed.

CRITICAL INSTRUCTIONS:
1. Examine the \`MISSING_FIELDS\` list provided below.
2. Formulate a conversational question asking for ONLY 1 or 2 of the top missing items. 
   - NEVER ask a huge list of questions at once! Keep it to a maximum of 2 related missing variables per message.
3. For Partner Details (Name, Age, Address, Father's Name, PAN): 
   - Politely suggest they can use the "Upload Aadhaar" or "Upload PAN" buttons for magical autofill.
   - Example: "Are you ready to add details for Partner 1? To save time, you can just click the 'Upload Aadhaar' button below and I'll extract everything instantly!"
4. As soon as you receive ANY new piece of data from the user (or from OCR context), you MUST use the \`update_deed_data\` tool to save it into the system state.
   - 🚨 VERY IMPORTANT: When you call the tool, you MUST ALWAYS write an engaging text response simultaneously! Acknowledge the user's input, confirm the update, and immediately ask for the next missing field in your text response. DO NOT send a tool call without a text message.
5. Empathy & Psychology: Users may feel overwhelmed by legal jargon. Use a reassuring, professional yet friendly tone. Use emojis sparingly but effectively (e.g., 📝, 🏦, ✨).
6. Provide brief context when appropriate. If you ask for Capital Contribution, you can note "(usually percentages summing to 100%)". 
7. If the user provides a completely new \`numPartners\`, accept it and use the tool! 
8. If \`MISSING_FIELDS\` is EMPTY: warmly congratulate them! Tell them their Partnership Deed is fully drafted and they can download it as PDF or DOCX from the right panel.`;

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

    let currentDeedData = { ...deedData };
    let missingFields = getMissingFields(currentDeedData);

    // Provide the dynamic state clearly
    const stateMessage = {
      role: 'system' as const,
      content: `CURRENT DEED DATA STATE:
\`\`\`json
${JSON.stringify(currentDeedData, null, 2)}
\`\`\`

MISSING_FIELDS:
${missingFields.length > 0 ? missingFields.map(f => '- ' + f).join('\n') : 'NONE. EVERYTHING IS COMPLETE!'}

Current task: Look at the MISSING_FIELDS. If the user provided new data in their last message, use the update_deed_data tool to extract it! If you use the tool, DO NOT write any text response yet.`
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
            description: 'Update the partnership deed data state. Call this whenever the user provides ANY deed information.',
            parameters: (jsonSchema as any).definitions.DeedUpdateSchema || jsonSchema,
          }
        }
      ],
      tool_choice: 'auto',
      max_tokens: 1200,
      temperature: 0.3,
    });

    const responseMsg = completion.choices[0]?.message;
    let finalContent = responseMsg?.content || '';
    let extractedData: Record<string, any> | null = null;

    // STEP 2: Handle Tool Call and Force a Follow-Up Text Response
    if (responseMsg?.tool_calls?.length) {
      const call = responseMsg.tool_calls.find((t: any) => t.function.name === 'update_deed_data');
      if (call) {
        try {
          const parsed = JSON.parse(call.function.arguments);
          if (parsed && typeof parsed === 'object') {
            extractedData = parsed;

            // Merge newly extracted data into our local state string to calculate fresh missing fields
            currentDeedData = { ...currentDeedData, ...parsed };

            const targetNumPartners = Number(currentDeedData.numPartners || 0);
            if (targetNumPartners > 0 && (!currentDeedData.partners || currentDeedData.partners.length !== targetNumPartners)) {
              const oldPartners = currentDeedData.partners || [];
              currentDeedData.partners = Array.from({ length: targetNumPartners }, (_, i) => oldPartners[i] || {});
            }

            // Handle Partner Shortcuts
            const pShortcuts = {
              fullName: parsed.fullName,
              fatherName: parsed.fatherName,
              age: parsed.age,
              address: parsed.address,
              panNumber: parsed.panNumber
            };

            const hasShortcuts = Object.values(pShortcuts).some(v => v !== undefined);
            if (hasShortcuts) {
              const idx = (parsed.partnerIndex as number) ?? 0;
              if (!currentDeedData.partners) currentDeedData.partners = [];
              currentDeedData.partners[idx] = {
                ...(currentDeedData.partners[idx] || {}),
                ...Object.fromEntries(Object.entries(pShortcuts).filter(([_, v]) => v !== undefined))
              };
            }

            if (parsed.partners) {
              const mergedPartners = [...(currentDeedData.partners || [])];
              parsed.partners.forEach((pUpdate: any, i: number) => {
                mergedPartners[i] = { ...(mergedPartners[i] || {}), ...pUpdate };
              });
              currentDeedData.partners = mergedPartners;
            }
          }
        } catch (e) {
          console.error("Failed to parse tool call args:", call.function.arguments);
        }
      }

      // Re-calculate missing fields after data extraction!
      missingFields = getMissingFields(currentDeedData);

      const toolMsgs = responseMsg.tool_calls.map((t: any) => ({
        role: 'tool',
        tool_call_id: t.id,
        name: t.function.name,
        content: JSON.stringify({ success: true, instruction: 'Tool executed successfully.' })
      }));

      // Force the AI to ask the NEXT question based on true missing state
      const followupPrompt = {
        role: 'system' as const,
        content: `Tool execution complete. 
UPDATED MISSING_FIELDS:
${missingFields.length > 0 ? missingFields.map(f => '- ' + f).join('\n') : 'NONE. EVERYTHING IS COMPLETE!'}

INSTRUCTION: You MUST now reply to the user. Briefly acknowledge the data they just provided, and then YOU MUST ASK A QUESTION about 1 or 2 of the top items in the UPDATED MISSING_FIELDS list above. NEVER end your message without a question unless the missing fields list is empty.`
      };

      const secondCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system' as const, content: SYSTEM_PROMPT },
          stateMessage,
          ...messages.map(m => ({ role: m.role, content: m.content } as any)),
          responseMsg,
          ...toolMsgs,
          followupPrompt
        ] as any,
        max_tokens: 1200,
        temperature: 0.4,
      });

      finalContent = secondCompletion.choices[0]?.message?.content || '';
    } else {
      // If no tool was called, but missing fields still exist, enforce a question check.
      if (missingFields.length > 0 && finalContent.length > 0) {
        // just let it pass, but system prompt handles it
      }
    }

    // In case second step somehow still misses
    if (!finalContent || finalContent.trim() === '') {
      if (missingFields.length > 0) {
        finalContent = `Got it! Can you please tell me about: ${missingFields[0]}?`;
      } else {
        finalContent = `Thank you, your deed data has been updated.`;
      }
    }

    return new Response(JSON.stringify({
      content: finalContent,
      extractedData,
      missingFields // Return the latest missing fields strictly
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[chat-ai.ts] Error:', error?.message);
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
