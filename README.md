# Partnership Deed AI Generator

A conversational AI-powered agent that guides users through drafting a legally compliant Partnership Deed (Indian Law). Features a split-screen interface with a conversational AI chat on the left and a live, dynamically updating document preview on the right.

![Mobile Responsive UI](https://via.placeholder.com/800x400?text=Partnership+Deed+AI)

## ✨ Features
- **Conversational Drafting**: Interactive AI chat asks for necessary details (names, addresses, capital, ratios).
- **Aadhaar & PAN OCR**: Automatically extracts partner details by uploading images/PDFs of KYC documents.
- **Auto-Generated Objectives**: AI natively drafts comprehensive business objectives based on the firm's name and industry.
- **Live Document Preview**: Watch the HTML document populate in real-time as you answer questions.
- **Export to PDF & DOCX**: One-click downloads with perfectly formatted, legally styled structures and paragraph numbering.
- **Mobile Responsive**: Elegantly collapses into a stacked 100vh layout with sticky controls for smartphones and tablets.

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Custom Inline CSS
- **AI & OCR**: Google Gemini API (`gemini-2.5-flash`)
- **Document Generation**: `puppeteer` (PDF), `html-to-docx` (DOCX)
- **Validation**: Zod (Structured JSON generation)

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key to your local environment
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local

# 3. Run the development server
npm run dev

# 4. Open http://localhost:3000
```

## 📂 Project Structure

```
partnership-deed-astro/
├── app/
│   ├── layout.tsx              # Next.js Application wrapper
│   ├── page.tsx                # Main entry point (loads DeedApp)
│   └── api/                    # Next.js Route Handlers
│       ├── chat/route.ts       # Structured logic step generator
│       ├── chat-ai/route.ts    # AI conversational responses
│       ├── ocr/route.ts        # Aadhaar/PAN image extraction
│       ├── render-deed/route.ts# HTML Live Preview compiler
│       ├── download-pdf/route.ts # Puppeteer PDF generator
│       └── download-docx/route.ts # DOCX document generator
├── src/
│   └── components/
│       ├── DeedApp.tsx         # Main React application shell
│       ├── DeedPreview.tsx     # Read-only document display
│       └── OCRStep.tsx         # File upload handling logic
└── lib/
    ├── ai-service.ts           # Gemini schema and prompt logic
    ├── gemini.ts               # Gemini client initialization
    └── deed-template.ts        # Source-of-truth HTML layout
```

## 🔒 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | **Required**. Google Gemini key for Chat, Document Logic, and Vision OCR. |
| `NEXT_PUBLIC_SUPABASE_URL` | *(Optional)* Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Optional)* Client-side Supabase Anon Key |

## 📄 License
MIT License.
