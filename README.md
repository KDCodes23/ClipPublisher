# ClipPilot

A Next.js tool for gaming streamers that imports Twitch clips, generates AI captions and metadata for TikTok, Instagram Reels, and YouTube Shorts, and publishes directly to connected platforms.

## What's done

### Authentication

- Supabase email/password auth with protected routes via middleware
- Login page with cinematic background
- User profile stored in `profiles` table

### Account management

- `/account` page to connect and disconnect social platforms
- Per-user OpenAI API key stored in the `profiles` table (falls back to server key)
- Platform connection status shown live via `/api/connect/status`

### Platform OAuth connections

All five platforms use server-side OAuth flows with tokens stored in `connected_accounts`:

| Platform        | Purpose                                   |
| --------------- | ----------------------------------------- |
| **Twitch**      | Source — import your clips                |
| **YouTube**     | Publish to YouTube Shorts                 |
| **TikTok**      | Publish via PULL_FROM_URL                 |
| **Instagram**   | Publish Reels (Business/Creator accounts) |
| **X (Twitter)** | Post short video clips to timeline        |

Token refresh is handled automatically for Twitch and YouTube (tokens refreshed when within 5 minutes of expiry).

### Clip editor (`/editor`)

- Lists your Twitch clips with thumbnail previews (paginated, 20 at a time)
- Click a clip to preview it inline in a `<video>` player
- Trim start/end controls and title/notes fields
- Upload clip to Supabase Storage (signed upload URL via `/api/storage/upload-url`)
- Publish to YouTube, TikTok, or Instagram from the editor

### AI caption generation (`/api/generate`)

- Generates platform-ready captions, hashtags, and metadata using OpenAI
- Three quality tiers: Fast (gpt-4.1-nano), Standard (gpt-4.1-mini), Best (gpt-4.1)
- Structured JSON output with strict schema enforcement
- **TikTok** — casual caption + 8–12 hashtags
- **Instagram Reels** — clean caption + 10–15 hashtags
- **YouTube Shorts** — title, description, 4–6 hashtags, 8–18 searchable tags
- Usage logged to `usage_logs` table (model, tokens, game, clip type)

### Upload routes

- `/api/upload/youtube` — uploads video file to YouTube via resumable upload, with auto token refresh
- `/api/upload/tiktok` — posts via TikTok PULL_FROM_URL (TikTok fetches from Supabase Storage signed URL)
- `/api/upload/instagram` — creates container then publishes Reel via Instagram Graph API

### Admin panel (`/admin/[token]`)

- Hidden URL-token–gated admin page
- Passphrase login with SHA-256 cookie auth
- Views usage logs from Supabase

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project
- An OpenAI API key (or users bring their own)
- OAuth apps registered for each platform you want to connect

### Setup

```bash
cd clip_publisher
npm install
```

Create a `.env.local` file inside `clip_publisher/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (server fallback key)
OPENAI_API_KEY=

# YouTube / Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# TikTok OAuth
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Instagram / Meta OAuth
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=

# X (Twitter) OAuth
X_CLIENT_ID=
X_CLIENT_SECRET=

# Twitch OAuth
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# Admin panel
ADMIN_URL_TOKEN=
ADMIN_PASSPHRASE=
```

### Run

```bash
npm run dev
```

Opens at `http://localhost:3001`.

## Project structure

```text
clip_publisher/
  src/
    app/
      page.js                          # Home / caption generator UI
      login/page.js                    # Auth page
      account/page.js                  # Platform connections + API key
      editor/page.js                   # Twitch clip browser + publisher
      admin/[token]/page.js            # Admin usage dashboard
      api/
        generate/route.js              # AI caption generation
        clips/twitch/route.js          # Fetch Twitch clips
        connect/
          status/route.js              # Check connected platforms
          disconnect/route.js          # Revoke a platform connection
          youtube/                     # YouTube OAuth
          tiktok/                      # TikTok OAuth
          instagram/                   # Instagram OAuth
          x/                           # X OAuth
          twitch/                      # Twitch OAuth
        upload/
          youtube/route.js             # Upload to YouTube
          tiktok/route.js              # Publish to TikTok
          instagram/route.js           # Publish to Instagram Reels
        storage/upload-url/route.js    # Supabase signed upload URL
        auth/callback/route.js         # Supabase auth callback
        admin/verify/route.js          # Admin passphrase check
    lib/supabase/
      client.js                        # Browser Supabase client
      server.js                        # Server Supabase client + admin client
    middleware.js                      # Route protection
  next.config.mjs
  package.json
.github/workflows/
  nextjs.yml                           # GitHub Actions deploy
```

## Tech stack

- [Next.js 15](https://nextjs.org) + [React 19](https://react.dev)
- [Supabase](https://supabase.com) — auth, database, storage
- [OpenAI Node SDK](https://github.com/openai/openai-node) — `gpt-4.1` family with structured JSON output
- [Tailwind CSS](https://tailwindcss.com)
- Platform APIs: Twitch Helix, YouTube Data v3, TikTok Content Posting, Instagram Graph, X v2
