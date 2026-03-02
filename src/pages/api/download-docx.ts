import type { APIRoute } from 'astro';
import { renderDeed } from '../../lib/deed-template';
import type { DeedData } from '../../lib/deed-template';
// @ts-ignore — html-to-docx has no official types
import HTMLtoDOCX from 'html-to-docx';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { deedData } = await request.json() as { deedData: DeedData };
    if (!deedData) {
      return new Response(JSON.stringify({ error: 'Missing deedData' }), { status: 400 });
    }

    const html = renderDeed(deedData);

    // html-to-docx options for faithful legal document formatting
    const docxBuffer = await HTMLtoDOCX(html, null, {
      table:  { row: { cantSplit: true } },
      footer: false,
      header: false,
      pageNumber: false,
      font: 'Verdana',
      fontSize: 22,            // half-points → 11pt
      margins: {
        top:    1440,          // 1 inch in twips
        right:  1440,
        bottom: 1440,
        left:   1440,
      },
    });

    const firmName = (deedData.businessName || 'Partnership_Deed').replace(/[^a-z0-9]/gi, '_');

    return new Response(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Deed_${firmName}.docx"`,
      },
    });
  } catch (err: any) {
    console.error('[download-docx]', err?.message);
    return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
  }
};
