// OCR is now handled server-side via /api/ocr (Groq llama-4-scout vision model)
// This file only exposes the client-side helper that sends the image to the server.

export interface PartnerOCR {
  name: string;
  fatherName: string;
  age: string;
  dob: string;
  gender: string;
  address: string;
  pan: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function ocrAadhaar(file: File): Promise<Partial<PartnerOCR>> {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType: file.type, docType: 'aadhaar' }),
  });
  const { data } = await res.json();
  return data as Partial<PartnerOCR>;
}

export async function ocrPAN(file: File): Promise<Partial<PartnerOCR>> {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType: file.type, docType: 'pan' }),
  });
  const { data } = await res.json();
  return data as Partial<PartnerOCR>;
}

export function todayAsDeedDate(): string {
  const d = new Date();
  const day = d.getDate();
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
  return `${day}${suffix} day of ${months[d.getMonth()]} ${d.getFullYear()}`;
}
