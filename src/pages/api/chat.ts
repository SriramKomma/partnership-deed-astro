import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

// This endpoint is now used only for:
// 1. Generating business name suggestions
// 2. Generating the business objectives paragraph
// The conversation flow is managed client-side.

export const POST: APIRoute = async ({ request }) => {
  let body: any = {};
  try {
    body = await request.json();
    const { task, context } = body as { task: 'suggest_names' | 'generate_objectives'; context: Record<string, any> };

    let systemPrompt = '';
    let userMessage = '';

    if (task === 'suggest_names') {
      systemPrompt = 'You are a legal business naming assistant. Suggest 3 formal Indian partnership firm names. Respond ONLY with a JSON array of 3 strings, no other text.';
      userMessage = `Nature of business: ${context.natureOfBusiness}. Suggest 3 formal firm names suitable for an Indian partnership deed.`;
    } else if (task === 'generate_objectives') {
      systemPrompt = 'You are a legal document drafter. Write a formal 100-120 word business objectives paragraph for an Indian Partnership Deed. Respond ONLY with the paragraph text, no extra text.';
      userMessage = `Business name: ${context.businessName}. Nature of business: ${context.natureOfBusiness}. Write the business objectives clause.`;
    } else {
      return new Response(JSON.stringify({ error: 'Unknown task' }), { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[chat.ts] Error:', error?.message);
    return new Response(JSON.stringify({ content: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
