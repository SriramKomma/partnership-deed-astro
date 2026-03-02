// OCR via Groq Vision API (server-side /api/ocr)
// Supports: JPEG, PNG, WebP, HEIC, BMP, GIF, TIFF, and PDF (renders page 1)

export interface PartnerOCR {
  name: string;
  fatherName: string;
  age: string;
  dob: string;
  gender: string;
  address: string;
  pan: string;
}

// ─── PDF → PNG conversion  (client-side, uses pdfjs-dist) ────────────────────

async function pdfToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the bundled worker file via CDN (no extra bundler config needed)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // only first page needed for ID cards

  // Scale 2× for higher resolution → better OCR accuracy
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d')!;
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
}

// ─── Normalize any image → JPEG via canvas (handles HEIC, BMP, AVIF, etc.) ───

async function normalizeImageToJpeg(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Limit to 1200px wide (enough for OCR, keeps JSON small)
      const MAX = 1200;
      const scale = img.naturalWidth > MAX ? MAX / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')); };
    img.src = url;
  });
}

// ─── File → base64 (PDF uses canvas render, images use normalizeImageToJpeg) ──

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return pdfToBase64(file);
  }
  // All other image formats (including HEIC, BMP, AVIF) → normalize to JPEG via canvas
  return normalizeImageToJpeg(file);
}


// ─── Public OCR functions ─────────────────────────────────────────────────────

export async function ocrAadhaar(file: File): Promise<Partial<PartnerOCR>> {
  const { base64, mimeType } = await fileToBase64(file);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType, docType: 'aadhaar' }),
  });
  const { data } = await res.json();
  return data as Partial<PartnerOCR>;
}

export async function ocrPAN(file: File): Promise<Partial<PartnerOCR>> {
  const { base64, mimeType } = await fileToBase64(file);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType, docType: 'pan' }),
  });
  const { data } = await res.json();
  return data as Partial<PartnerOCR>;
}

// ─── Deed date helper ─────────────────────────────────────────────────────────

export function todayAsDeedDate(): string {
  const d = new Date();
  const day = d.getDate();
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
  return `${day}${suffix} day of ${months[d.getMonth()]} ${d.getFullYear()}`;
}
