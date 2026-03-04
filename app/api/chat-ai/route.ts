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

    const result = await chatWithAI(SYSTEM_PROMPT, stateMessage, messages);
    
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let finalContent = "";
    let extractedData: Record<string, any> | null = null;

    for (const part of parts) {
      if (part.text) {
        finalContent += part.text;
      }

      if (part.functionCall?.name === "update_deed_data") {
        extractedData = part.functionCall.args as any || {};

        if (extractedData && typeof extractedData === 'object') {
          currentDeedData = { ...currentDeedData, ...extractedData };

          const targetNumPartners = Number(currentDeedData.numPartners || 0);
          if (targetNumPartners > 0 && (!currentDeedData.partners || currentDeedData.partners.length !== targetNumPartners)) {
            const oldPartners = currentDeedData.partners || [];
            currentDeedData.partners = Array.from({ length: targetNumPartners }, (_, i) => oldPartners[i] || {});
          }

          // Handle Shortcuts
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

    missingFields = getMissingFields(currentDeedData);

    if (!finalContent || finalContent.trim() === '') {
      if (missingFields.length > 0) {
        finalContent = `Got it! Can you please tell me about: ${missingFields[0]}?`;
      } else {
        finalContent = `Thank you, your deed data has been updated.`;
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
