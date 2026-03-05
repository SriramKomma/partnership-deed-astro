// Gemini OCR integrated - March 2026 - using @google/generative-ai SDK
// Model: gemini-2.5-flash - extracts name, fatherName, dob, address, pan, aadhaarStored

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a strict OCR extractor for Indian Aadhaar or PAN cards.
Extract ONLY visible fields. Return "" for unclear/missing.
Dates: DD/MM/YYYY.
Aadhaar: NEVER return real 12-digit number — only "aadhaarStored": true if pattern visible.
PAN: exact 10-char code if visible.
Respond ONLY with JSON:
{
  "name": "",
  "fatherName": "",
  "dob": "",
  "age": "",
  "address": "",
  "pan": "",
  "aadhaarStored": false
}`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();
    let finalData;
    try {
      finalData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", text);
      return NextResponse.json({ error: "OCR failed" }, { status: 500 });
    }

    // Default missing string fields for component compatibility 
    const requiredStrFields = ['name', 'fatherName', 'dob', 'age', 'gender', 'address', 'pan'];
    requiredStrFields.forEach(k => {
      if (finalData[k] === null || finalData[k] === undefined) finalData[k] = '';
    });

    if (finalData.aadhaarStored === undefined) {
      finalData.aadhaarStored = false;
    }

    return NextResponse.json({ data: finalData }, { status: 200 });
  } catch (err: any) {
    console.error('[ocr-gemini] Error:', err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}

