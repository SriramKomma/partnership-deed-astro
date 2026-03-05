import { NextResponse } from 'next/server';
import { renderDeed } from '../../../lib/deed-template';
import type { DeedData } from '../../../lib/deed-template';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ────────────────────────────────────────────────
   Supabase (Optional + Safe)
──────────────────────────────────────────────── */

function getSupabase(authHeader?: string | null): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null; // silently skip if not configured
  }

  try {
    const options: any = {
      auth: { persistSession: false },
      global: { fetch: fetch },
    };
    if (authHeader) {
      options.global.headers = { Authorization: authHeader };
    }
    return createClient(url, key, options);
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
    const saveToDb = body?.saveToDb;

    if (!deedData) {
      return NextResponse.json({ error: 'Missing deedData' }, { status: 400 });
    }

    // Render exact HTML template
    const html = renderDeed(deedData);

    // Optional DB save (non-blocking)
    const authHeader = req.headers.get('authorization');
    const supabase = getSupabase(authHeader);

    if (supabase && saveToDb) {
      // Fire-and-forget (do not await, never block response)
      void (async () => {
        try { 
          // Extract user from token
          let userId = null;
          if (authHeader) {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) userId = user.id;
          }

          const payload: any = { deed_data: deedData, rendered_html: html, created_at: new Date().toISOString() };
          if (userId) payload.user_id = userId; // Optional linking to user_id column if it exists

          const { data: deedInserted } = await supabase.from('deeds').insert(payload).select().single(); 

          // Store each partner details
          if (deedData.partners && Array.isArray(deedData.partners) && deedData.partners.length > 0) {
            const partnersPayload = deedData.partners.map((p: any) => ({
              user_id: userId,
              deed_id: deedInserted?.id || null, // Link to the created deed if returning ID
              full_name: p.fullName || null,
              father_name: p.fatherName || null,
              age: p.age || null,
              address: p.address || null,
              pan_number: p.panNumber || null,
              capital_contribution: p.capitalContribution || null,
              profit_share: p.profitShare || null,
              is_managing_partner: p.isManagingPartner || false,
              is_bank_authorized: p.isBankAuthorized || false,
              created_at: new Date().toISOString()
            }));
            await supabase.from('partners').insert(partnersPayload);
          }
        } catch (e) { console.error("Supabase insert error:", e); }
      })();
    }

    return NextResponse.json({ html }, { status: 200 });

  } catch (err: any) {
    console.error("Render deed error:", err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
