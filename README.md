# Seedance Queue Manager

Auto queue manager for Seedance 2.0 Omni on 79ai.net.

## Features

- 🚀 Auto-submits and polls jobs to keep queue full
- 📋 Bulk prompt input (manual or TXT/CSV upload)
- ✅ Download links when videos complete
- 🔄 Retry failed jobs
- 🔒 CORS-free via Next.js API proxy
- 🎨 Clean dark UI

## Deploy to Vercel (recommended)

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Deploy (no env vars needed — token is entered in UI)

## Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Usage

1. Paste your **access_token** from https://79ai.net/pages/account/apikeys
2. Set **Max concurrent** (recommend 4 for Pro plan)
3. Add prompts (one per line) or upload TXT/CSV file
4. Configure **Ratio** and **Duration**
5. Click **Start** — the app keeps your queue full automatically

## Config

- **Domain**: `79ai.net` (hardcoded)  
- **Model**: `seedance_20_pro_edit` (Seedance 2.0 Omni)  
- **Mode**: `business_fast` (Face Support, the only active mode)  
- **Resolution**: `720p` (only option on Pro plan)  
- **Poll interval**: every 8 seconds  

## Prompt tips (from Gommo docs)

- Prompts in **Chinese** give more accurate outputs
- Max 3 reference images, 1 video, 1 audio
- Use `@image1 @video1 @audio1` to reference assets
- No real person photos
- Don't mention copyrighted character names
