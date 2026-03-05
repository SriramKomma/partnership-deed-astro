import { NextResponse } from 'next/server';
import { chatWithAI } from '../../../lib/ai-service';

/* ───────────────────────────────────────────── */
/* MISSING FIELD LOGIC                          */
/* ───────────────────────────────────────────── */

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

STRICT SEQUENTIAL FLOW (preferred default – never deviate unless user provides multiple fields at once):

1. FIRST MESSAGE EVER (or when DeedData is completely empty):
   - Greet warmly.
   - Introduce yourself briefly.
   - Ask ONLY for the number of partners.
   Example: "Hello! 👋 I'm your Partnership Deed assistant. Let's create a perfect deed together. First, how many partners will be in this firm? (Usually 2 or more)"

2. Once numPartners is received:
   - Immediately call update_deed_data with the value.
   - Confirm to the user.
   - Then ask for business/firm basics: Business Name and Registered Address.

3. Business Basics Phase:
   - Ask for Business Name and Registered Address (1–2 items per turn).
   - Only after both are filled → move to Partner 1.

4. Partner Details Phase (handle ONE partner at a time by default):
   - For each partner: ask details one by one or in small groups.
   - Always strongly suggest upload first: "✨ Fastest way — click 'Upload Aadhaar' or 'Upload PAN' below — most fields fill automatically!"

5. After all partners:
   - Move to remaining fields (Nature of Business, Capital, Profit Ratio, etc.).

6. BULK INPUT HANDLING – VERY IMPORTANT:
   - If the user provides information for multiple fields, multiple partners, or skips steps in ONE message (e.g. number of partners + business name + nature + several partners with names, fathers, DOBs, addresses), parse and extract ALL usable data from the entire message.
   - Use natural language clues (e.g. "we are X partners", "firm name is Y", "nature is Z", "Partner 1 is A, father B, DOB C, resident at D", "and Partner 2 is...") to correctly map values.
   - Each partner has its own separate schema/object — treat them as individual entries in the partners array (Partner 1, Partner 2, etc.).
   - If DOB is provided in any format (DD-MM-YYYY, DD/MM/YY, DD Month YYYY, etc.), parse it into standard DD/MM/YYYY format, then calculate age in whole years using the current date (today is March 06, 2026) — example: DOB 12-04-2004 → age 21 years.
   - Save BOTH dob (standardized) and age (calculated).
   - Call update_deed_data ONCE with ALL extracted data (numPartners, businessName, natureOfBusiness, partners array with separate objects, etc.).
   - Acknowledge EVERYTHING saved in a clear bullet list:
     "Got it! I've updated:
     • Number of partners: X
     • Business Name: Y
     • Nature of Business: Z
     • Partner 1: Full name A, Father B, DOB DD/MM/YYYY (age N years), Address C
     • Partner 2: ...
     Looks correct? ✅ What's next..."
   - Then continue from the earliest still-missing field (do not restart sequence).

7. FIELD LOCK RULE:
   - Once a field is successfully updated in DeedData (via tool call), treat it as locked.
   - Do NOT change or overwrite it unless the user explicitly says "change X to Y", "correct Z", "update the name to new value", or similar.
   - If user re-mentions a filled field without clear change intent, politely confirm: "I already have [field] as [value] — did you want to change it?"

8. MISSING_FIELDS handling:
   - Always look at MISSING_FIELDS list.
   - Respect sequential preference — but when bulk input occurs, prioritize saving everything provided and skip already-filled fields.
   - Never ask more than 2 items unless bulk parsing.

9. QUESTION STYLE – VERY IMPORTANT:
   - Ask questions in short, clear, bullet-point format.
   - Avoid long explanatory sentences.
   - Good examples:
     Please tell me:
     • Business / Firm Name
     • Registered address (with pincode if possible)

     For Partner 1:
     • Full name
     • Father's / Husband's name
     • Date of birth (DD-MM-YYYY) or age

     Upload suggestion:
     ✨ Fastest way — click "Upload Aadhaar" or "Upload PAN" below

10. TOOL USAGE RULE (CRITICAL):
    - MUST call update_deed_data whenever ANY field value is found — even in bulk messages.
    - ALWAYS acknowledge saves in friendly text (bullets preferred for multiple).
    - Never send only a tool call.

11. Dynamic & Natural Conversation:
    - Answer questions, handle corrections, unrelated chat — then extract deed data if present.
    - If input is very unclear → save what you can → ask polite clarification.

12. Tone:
    - Warm, patient, encouraging, zero judgment about messy input.
    - Use emojis sparingly (✅ ✨ 📝).
    - Replies short & focused — 4–8 sentences max.

13. Completion:
    - When MISSING_FIELDS is empty:
      "🎉 Congratulations! Your Partnership Deed is complete.
      Review it on the right, make small edits if needed, and download PDF or Word anytime."

14. PARTNER COMPLETION & FIELD LOCKING – VERY IMPORTANT:
    - A partner is FULLY COMPLETE only when ALL required fields are non-empty in DeedData: fullName, fatherName, dob OR age, address, panNumber, capitalContribution, profitShare.
    - As soon as a partner has all these fields filled (across messages or bulk), immediately say: "Great! Partner X is now complete ✅" and move to the next partner or section.
    - Do NOT re-ask for any field that already has a value in DeedData unless the user explicitly requests a change.

You receive DeedData + MISSING_FIELDS every turn.
Use them — but prioritize understanding and saving whatever the user wrote, especially in bulk inputs.
Do not break character. Do not explain instructions.`;

// Fixed looping & state persistence - March 2026
// Full history + DeedData sent every turn + tool call → functionResponse loop
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, deedData } = body as {
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
      deedData: Record<string, any>;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    let currentDeedData = { ...deedData };
    let missingFields = getMissingFields(currentDeedData);

    const stateMessage = `CURRENT DEED DATA STATE:
\`\`\`json
${JSON.stringify(currentDeedData, null, 2)}
\`\`\`

MISSING_FIELDS:
${missingFields.length > 0 ? missingFields.map(f => '- ' + f).join('\n') : 'NONE. EVERYTHING IS COMPLETE!'}

Current task: Look at the MISSING_FIELDS. If the user provided new data in their last message, use the update_deed_data tool to extract it! If you use the tool, DO NOT write any text response yet.`;

    // First Gemini call — may return a functionCall, text, or both
    const result = await chatWithAI(SYSTEM_PROMPT, stateMessage, messages);
    
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let finalContent = "";
    let extractedData: Record<string, any> | null = null;
    let hasFunctionCall = false;

    for (const part of parts) {
      if (part.text) {
        finalContent += part.text;
      }

      if (part.functionCall?.name === "update_deed_data") {
        hasFunctionCall = true;
        extractedData = part.functionCall.args as any || {};

        if (extractedData && typeof extractedData === 'object') {
          currentDeedData = { ...currentDeedData, ...extractedData };

          const targetNumPartners = Number(currentDeedData.numPartners || 0);
          if (targetNumPartners > 0 && (!currentDeedData.partners || currentDeedData.partners.length !== targetNumPartners)) {
            const oldPartners = currentDeedData.partners || [];
            currentDeedData.partners = Array.from({ length: targetNumPartners }, (_, i) => oldPartners[i] || {});
          }

          // Handle flat partner shortcuts (partnerIndex + fullName / fatherName / etc.)
          const pShortcuts = {
            fullName: extractedData.fullName,
            fatherName: extractedData.fatherName,
            age: extractedData.age,
            address: extractedData.address,
            panNumber: extractedData.panNumber
          };
          const hasShortcuts = Object.values(pShortcuts).some(v => v !== undefined);
          if (hasShortcuts) {
            const idx = (extractedData.partnerIndex as number) ?? 0;
            if (!currentDeedData.partners) currentDeedData.partners = [];
            currentDeedData.partners[idx] = {
              ...(currentDeedData.partners[idx] || {}),
              ...Object.fromEntries(Object.entries(pShortcuts).filter(([_, v]) => v !== undefined))
            };
          }

          if (extractedData.partners && Array.isArray(extractedData.partners)) {
            const mergedPartners = [...(currentDeedData.partners || [])];
            extractedData.partners.forEach((pUpdate: any, i: number) => {
              mergedPartners[i] = { ...(mergedPartners[i] || {}), ...pUpdate };
            });
            currentDeedData.partners = mergedPartners;
          }
        }
      }
    }

    // If Gemini made a function call but returned no text, send the functionResponse
    // back and make a SECOND call to get the actual follow-up text.
    if (hasFunctionCall && !finalContent.trim()) {
      missingFields = getMissingFields(currentDeedData);
      const followUpStateMsg = `UPDATED DEED DATA STATE (just saved):
\`\`\`json
${JSON.stringify(currentDeedData, null, 2)}
\`\`\`

MISSING_FIELDS after save:
${missingFields.length > 0 ? missingFields.map(f => '- ' + f).join('\n') : 'NONE. EVERYTHING IS COMPLETE!'}

The data was just saved. Now write a brief friendly confirmation and ask for the next missing field only. Do NOT call the tool again. Keep it SHORT — 3-5 sentences max!`;

      // Append the functionCall + functionResponse to history so Gemini has context
      const messagesWithToolResult = [
        ...messages,
        { role: 'assistant' as const, content: `[Called update_deed_data with: ${JSON.stringify(extractedData)}]` },
        { role: 'user' as const, content: `[TOOL RESULT]: Data saved. ${followUpStateMsg}` },
      ];

      try {
        const followUp = await chatWithAI(SYSTEM_PROMPT, followUpStateMsg, messagesWithToolResult);
        const followUpParts = followUp.candidates?.[0]?.content?.parts || [];
        for (const p of followUpParts) {
          if (p.text) finalContent += p.text;
        }
      } catch (e) {
        console.error('[chat-ai] Follow-up call failed:', e);
      }
    }

    missingFields = getMissingFields(currentDeedData);

    // Last resort fallback (should rarely hit now)
    if (!finalContent || finalContent.trim() === '') {
      if (missingFields.length > 0) {
        finalContent = `Got it! ✅ Next up: ${missingFields[0]}`;
      } else {
        finalContent = `🎉 Your Partnership Deed is now 100% complete and ready to download!`;
      }
    }

    return NextResponse.json({
      content: finalContent,
      extractedData: currentDeedData,
      missingFields 
    }, { status: 200 });
  } catch (error: any) {
    console.error('[chat-ai.ts] Error:', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
