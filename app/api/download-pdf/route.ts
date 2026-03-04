import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { renderDeed } from '../../../lib/deed-template';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const deedData = body?.deedData;

    if (!deedData) {
      return NextResponse.json({ error: 'Missing deedData' }, { status: 400 });
    }

    const html = renderDeed(deedData);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Add CSS styles for printing
    await page.addStyleTag({
        content: `
            @page { margin: 20mm; }
            body { font-family: "Georgia", serif; font-size: 14px; line-height: 1.6; }
        `
    });

    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });
    
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Partnership_Deed.pdf"'
      }
    });
  } catch (error: any) {
    console.error('PDF error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
