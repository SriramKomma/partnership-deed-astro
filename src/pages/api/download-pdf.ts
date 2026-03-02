import type { APIRoute } from 'astro';
import { renderDeed } from '../../lib/deed-template';
import type { DeedData } from '../../lib/deed-template';
import puppeteer from 'puppeteer';

export const POST: APIRoute = async ({ request }) => {
  let browser;
  try {
    const { deedData } = await request.json() as { deedData: DeedData };
    if (!deedData) {
      return new Response(JSON.stringify({ error: 'Missing deedData' }), { status: 400 });
    }

    const html = renderDeed(deedData);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = Buffer.from(await page.pdf({
      format: 'A4',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: true,
      scale: 1,
      displayHeaderFooter: false,
    }));

    const firmName = (deedData.businessName || 'Partnership_Deed').replace(/[^a-z0-9]/gi, '_');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Deed_${firmName}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('[download-pdf]', err?.message);
    return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
  } finally {
    await browser?.close();
  }
};
