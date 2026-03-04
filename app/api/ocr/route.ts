import { NextResponse } from 'next/server';
import { extractOCR } from '../../../lib/ai-service';

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType, docType } = await req.json() as {
      imageBase64: string;
      mimeType: string;
      docType: 'aadhaar' | 'pan';
    };

    console.log(`[ocr-gemini] Received: docType=${docType}, mimeType=${mimeType}, base64len=${imageBase64?.length ?? 0}`);

    if (!imageBase64 || imageBase64.length < 100) {
      return NextResponse.json(
        { data: {}, error: 'Image data is empty or too small' },
        { status: 200 }
      );
    }

    const finalData = await extractOCR(docType, mimeType, imageBase64);
    console.log(`[ocr-gemini] Extraction complete:`, finalData);

    // Safety check and age normalization for Aadhaar
    if (docType === 'aadhaar') {
      if (!finalData.age && finalData.dob) {
        const parts = String(finalData.dob).split(/[\/\-]/);
        if (parts.length === 3) {
          const yr = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
          if (yr > 1900) finalData.age = String(new Date().getFullYear() - yr);
        }
      }
    }

    // Default missing string fields to empty strings for component compatibility 
    const requiredStrFields = docType === 'aadhaar'
      ? ['name', 'fatherName', 'dob', 'age', 'gender', 'address']
      : ['name', 'fatherName', 'dob', 'pan'];

    requiredStrFields.forEach(k => {
      if (finalData[k] === null || finalData[k] === undefined) finalData[k] = '';
    });

    if (docType === 'aadhaar' && finalData.aadhaarStored === undefined) {
      finalData.aadhaarStored = false;
    }

    return NextResponse.json({ data: finalData }, { status: 200 });
  } catch (err: any) {
    console.error('[ocr-gemini] Error:', err);
    return NextResponse.json(
      { data: {}, error: err?.message || 'Failed to analyze document' },
      { status: 200 }
    );
  }
}
