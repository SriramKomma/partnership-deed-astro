import { NextResponse } from 'next/server';
import { renderDeed } from '../../../lib/deed-template';
import type { DeedData } from '../../../lib/deed-template';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ────────────────────────────────────────────────
   Supabase (Optional + Safe)
──────────────────────────────────────────────── */

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null; // silently skip if not configured
  }

  try {
    return createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: fetch },
    });
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────
   Route
──────────────────────────────────────────────── */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const deedData: DeedData | undefined = body?.deedData;

    if (!deedData) {
      return NextResponse.json({ error: 'Missing deedData' }, { status: 400 });
    }

    // Render exact HTML template
    const html = renderDeed(deedData);

    // Optional DB save (non-blocking)
    const supabase = getSupabase();

    if (supabase) {
      // Fire-and-forget (do not await, never block response)
      void (async () => {
        try { await supabase.from('deeds').insert({ deed_data: deedData, rendered_html: html, created_at: new Date().toISOString() }); } catch { /* ignore */ }
      })();
    }

    return NextResponse.json({ html }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
