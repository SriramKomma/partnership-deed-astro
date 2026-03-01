# Partnership Deed Generator — Astro

A conversational AI-powered agent that guides users through filling in a Partnership Deed. Chat on the left, live document preview on the right.

## Tech Stack
- **Framework**: Astro 4 with SSR (Node adapter)
- **UI**: React 18 components (TypeScript)
- **AI**: Groq API (`llama-3.3-70b-versatile`) for conversational guidance
- **Database**: Supabase (auto-saves completed deeds)
- **Styling**: Inline CSS (no build-time dependencies)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Environment variables are pre-configured in .env
#    Edit .env if you need to update any API keys

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

## Build for Production

```bash
npm run build
npm run preview
# or start the Node server directly:
node dist/server/entry.mjs
```

## Project Structure

```
partnership-deed-astro/
├── src/
│   ├── components/
│   │   └── DeedApp.tsx         # Main React component (chat + preview)
│   ├── layouts/
│   │   └── Layout.astro        # HTML shell
│   └── pages/
│       ├── index.astro         # Main page
│       └── api/
│           ├── chat.ts         # Groq AI endpoint
│           └── save-deed.ts    # Supabase save endpoint
├── .env                        # All API keys (pre-configured)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Sends user answer to Groq, returns next question |
| `/api/save-deed` | POST | Saves completed deed to Supabase |

## Supabase Setup

Create a table in your Supabase project:

```sql
CREATE TABLE partnership_deeds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text,
  partner1_name text,
  partner2_name text,
  deed_data jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Download the Deed

Click **⬇ Download Deed** after answering all questions. The downloaded `.html` file can be opened in any browser and printed as PDF via **File → Print → Save as PDF**.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM |
| `VERCEL_AI_API_KEY` | Vercel AI API key (backup) |
| `AI_MODEL` | AI model identifier |
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MSG91_AUTHKEY` | MSG91 SMS auth key |
| `MSG91_TEMPLATE_ID` | MSG91 SMS template |
| `MSG91_SENDER_ID` | MSG91 sender ID |
| `MSG91_COUNTRY_CODE` | SMS country code |
