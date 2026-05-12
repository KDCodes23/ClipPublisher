# ClipPilot

A Next.js tool for gaming streamers that generates platform-ready captions, hashtags, and metadata for TikTok, Instagram Reels, and YouTube Shorts — powered by GPT-4.1 mini.

## What it does

Enter a few details about a clip (game, clip type, tone, and a short description of what happened), and ClipPilot generates ready-to-paste captions and hashtags for each platform. Output can be copied per platform or exported as a single `.txt` file.

**Platforms supported:**
- TikTok — casual caption + 8–12 hashtags
- Instagram Reels — clean caption + 10–15 hashtags
- YouTube Shorts — title, description, 4–6 hashtags, and 8–18 searchable tags

## Getting started

### Prerequisites

- Node.js 20+
- An OpenAI API key

### Setup

```bash
cd clip_publisher
npm install
```

Create a `.env.local` file inside `clip_publisher/`:

```
OPENAI_API_KEY=your_key_here
```

### Run

```bash
npm run dev
```

Opens at `http://localhost:3001`.

## Project structure

```
clip_publisher/
  src/app/
    page.js              # Main UI
    api/generate/
      route.js           # OpenAI API route
    globals.css          # Styles
  next.config.mjs
  package.json
.github/workflows/
  nextjs.yml             # GitHub Actions deploy to GitHub Pages
```

## Deploying to GitHub Pages

The included workflow in [.github/workflows/nextjs.yml](.github/workflows/nextjs.yml) builds and deploys the app automatically on push to `main`.

> **Note:** GitHub Pages serves static files only. The `/api/generate` route requires a server runtime and will not work on Pages. To use AI caption generation in production, deploy to a platform that supports Next.js server routes (Vercel, Railway, etc.) or move the API call to a separate backend.

## Tech stack

- [Next.js 15](https://nextjs.org)
- [React 19](https://react.dev)
- [OpenAI Node SDK](https://github.com/openai/openai-node) — `gpt-4.1-mini` with structured JSON output
