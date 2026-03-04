import { NextResponse } from 'next/server';
import HTMLToDOCX from 'html-to-docx';
import { renderDeed } from '../../../lib/deed-template';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const deedData = body?.deedData;

    if (!deedData) {
      return NextResponse.json({ error: 'Missing deedData' }, { status: 400 });
    }

    // Remove legacy <font> tags that html-to-docx cannot parse, leaving the raw text nodes intact.
    let cleanHtml = renderDeed(deedData).replace(/<\/?font[^>]*>/gi, '');
    
    // Fix independent lists: <ol start="X"><li><p>...</p></li></ol> -> <p><b>X.</b> ...</p>
    cleanHtml = cleanHtml.replace(/<ol(?: start="([^"]+)")?>\s*<li>\s*<p([^>]*)>([\s\S]*?)<\/p>\s*<\/li>\s*<\/ol>/gi, (match, startVal, pAttrs, content) => {
        const num = startVal || '1';
        return `<p${pAttrs}><b>${num}.</b>&nbsp;&nbsp;&nbsp;&nbsp;${content.trim()}</p>`;
    });

    // Fix nested alphabetical lists: <ol type="a"><ol type="a"> ... </ol></ol> -> a), b), c)
    cleanHtml = cleanHtml.replace(/<ol type="a">\s*<ol type="a">([\s\S]*?)<\/ol>\s*<\/ol>/gi, (match, innerLis) => {
        let charCode = 97; // 'a'
        const processedLis = innerLis.replace(/<li>\s*<p([^>]*)>([\s\S]*?)<\/p>\s*<\/li>/gi, (liMatch, pAttrs, content) => {
            const letter = String.fromCharCode(charCode++);
            return `<p${pAttrs} style="margin-left: 0.5in;"><b>${letter})</b>&nbsp;&nbsp;&nbsp;&nbsp;${content.trim()}</p>`;
        });
        return `<div>${processedLis}</div>`;
    });

    // Fix single outer <ol> alphabetical list: <ol><ol type="a"> ... </ol></ol> 
    cleanHtml = cleanHtml.replace(/<ol>\s*<ol type="a">([\s\S]*?)<\/ol>\s*<\/ol>/gi, (match, innerLis) => {
        let charCode = 97; // 'a'
        const processedLis = innerLis.replace(/<li>\s*<p([^>]*)>([\s\S]*?)<\/p>\s*<\/li>/gi, (liMatch, pAttrs, content) => {
            const letter = String.fromCharCode(charCode++);
            return `<p${pAttrs} style="margin-left: 0.5in;"><b>${letter})</b>&nbsp;&nbsp;&nbsp;&nbsp;${content.trim()}</p>`;
        });
        return `<div>${processedLis}</div>`;
    });
    
    // Wrap the HTML with proper structure
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; } p { line-height: 1.5; margin-bottom: 10pt; text-align: justify; }</style></head><body>${cleanHtml}</body></html>`;

    const fileBuffer = await HTMLToDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    });

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Partnership_Deed.docx"'
      }
    });

  } catch (error: any) {
    console.error('DOCX error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
