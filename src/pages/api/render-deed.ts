import type { APIRoute } from 'astro';
import { renderDeed } from '../../lib/deed-template';
import type { DeedData } from '../../lib/deed-template';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase (optional persistence) ─────────────────────────────────────────
function getSupabase() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { deedData } = await request.json() as { deedData: DeedData };
    if (!deedData) {
      return new Response(JSON.stringify({ error: 'Missing deedData' }), { status: 400 });
    }

    const html = renderDeed(deedData);

    // Persist to Supabase (fire-and-forget, non-blocking)
    const supabase = getSupabase();
    if (supabase) {
      supabase
        .from('deeds')
        .insert({ deed_data: deedData, rendered_html: html })
        .then(({ error }) => { if (error) console.debug('[render-deed] Supabase (optional):', error.message); });
    }

    return new Response(JSON.stringify({ html }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[render-deed]', err?.message);
    return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
  }
};
