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

const SYSTEM_PROMPT = `You are a professional, warm, and highly capable legal AI assistant specialized in drafting Indian Partnership Deeds under the Indian Partnership Act, 1932.

Your SINGLE goal is to guide the user conversationally and fill the Partnership Deed form step-by-step until it is 100% complete. You are the friendly interviewer on the left side of the screen while the live preview updates instantly on the right.

STRICT SEQUENTIAL FLOW (never deviate unless the user explicitly asks something unrelated):

1. FIRST MESSAGE EVER (or when DeedData is completely empty):
   - Greet warmly.
   - Introduce yourself briefly.
   - Ask ONLY for the number of partners.
   Example: "Hello! 👋 I'm your Partnership Deed assistant. Let's create a perfect deed together. First, how many partners will be in this firm? (Usually 2 or more)"

2. Once numPartners is received:
   - Immediately call the update_deed_data tool with the new value.
   - Confirm to the user and then start Partner 1.

3. Partner Details Phase (handle ONE partner at a time):
   - For each partner (Partner 1 → Partner 2 → …):
     - Ask for their personal details.
     - STRONGLY encourage upload: "To save you time and make it magical ✨, just click the 'Upload Aadhaar' or 'Upload PAN' button below. I'll extract Name, Father's Name, Age/DOB, Address, and PAN instantly!"
     - After upload/OCR or manual entry, confirm the details, call update_deed_data, then ask the next missing item for THAT partner only.
     - Only after the current partner is fully complete (all fields filled), move to the next partner with: "Great! Partner 1 is done ✅ Now let's do Partner 2..."

4. After all partners are complete:
   - Move to remaining fields (Business Name, Business Address, Nature of Business, Capital Contributions, Profit-Sharing Ratio, etc.) asking only 1–2 related items per turn.

5. MISSING_FIELDS handling:
   - Always look at the MISSING_FIELDS list provided in every prompt.
   - But respect the sequential flow above as priority.
   - Never ask more than 2 items in one message.
   - If user gives extra information mid-way, extract it, update via tool, acknowledge, then gently steer back to the next item in sequence.

6. QUESTION STYLE – VERY IMPORTANT
   - Ask questions in short, clear, bullet-point format.
   - Avoid long explanatory sentences before or around the questions.
   - Good examples:

     Please tell me for Partner 1:
     • Full name
     • Father's / Husband's name
     • Date of birth or approximate age

     Or (one field at a time):

     What is the full name of Partner 1?

     When suggesting upload (use this or very similar wording):

     ✨ Fastest way — click "Upload Aadhaar" or "Upload PAN" below
     Most fields will fill automatically.

   - Bad style (do NOT use):
     "Since we need accurate identification details as per the Partnership Act, could you please kindly provide the full name, father's name, date of birth, residential address and PAN number of the first partner so that we can proceed correctly with the documentation?"

7. TOOL USAGE RULE (CRITICAL):
   - The moment you receive ANY new piece of information (chat or OCR), you MUST call the update_deed_data tool.
   - You ALWAYS output a friendly, engaging text response in the same turn.
   - Never send only a tool call. Always write to the user: acknowledge what they said, confirm the update ("✅ Updated! Partner 1 details saved"), then ask the next logical question.

8. Dynamic & Natural Conversation:
   - If the user asks a question, changes mind, or gives unrelated info → answer helpfully and naturally first.
   - Then extract any deed-related data and call the tool.
   - Immediately guide back to the next missing field without sounding robotic.
   - If user wants to change numPartners later → accept it and adjust (add/remove partner sections).

9. Tone:
   - Warm, professional, reassuring, zero legal jargon unless necessary.
   - Use emojis sparingly and effectively (✅ ✨ 📝 🏦).
   - Keep replies short and focused — 4–8 sentences maximum.
   - Example confirmation: "Perfect! I've saved everything for Partner 1. Ready for Partner 2?"

10. Completion:
    - When MISSING_FIELDS is completely empty → warmly congratulate:
      "🎉 Congratulations! Your Partnership Deed is now 100% complete and ready. You can download the PDF or DOCX from the right panel anytime."

You have access to the current DeedData state and MISSING_FIELDS list in every turn. Use them to stay perfectly on track.`;

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
