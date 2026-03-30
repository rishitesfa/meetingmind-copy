# MeetingMind — Setup & Deploy Guide

## What this builds
A live meeting intelligence app that:
- Listens to your meeting via microphone (Chrome Web Speech API)
- Transcribes in real-time
- Extracts action items, decisions, topics, and participants live
- Shows pre-meeting briefings from past conversations
- Deep-links action items directly to Notion, Slack, Google
- Detects tone/stress and shows subtle wellness nudges
- Saves all meetings locally for context in future briefings

---

## Step 1 — Anthropic API Key (5 min)
1. Go to https://console.anthropic.com → sign up
2. Click **API Keys** → **Create Key**
3. Copy it — starts with `sk-ant-`

---

## Step 2 — Google OAuth (10 min)
1. Go to https://console.cloud.google.com
2. New project → name it "MeetingMind"
3. **APIs & Services → Library** → enable:
   - Gmail API
   - Google Calendar API  
   - Google Drive API
4. **APIs & Services → OAuth consent screen**
   - External → fill app name + your email
   - Add scopes: Gmail readonly, Calendar readonly, Drive readonly
   - Add your email as Test user
5. **Credentials → Create → OAuth 2.0 Client ID**
   - Web application
   - Add redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

---

## Step 3 — Deploy to Vercel (5 min)
1. Go to https://vercel.com → sign up with GitHub
2. **Add New Project** → drag the `meetingmind` folder
3. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` |
| `NEXTAUTH_SECRET` | Generate at https://generate-secret.vercel.app/32 |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

4. Click **Deploy**

---

## Step 4 — Add your Vercel URL to Google (2 min)
After deploy, copy your Vercel URL and add it to your Google OAuth client's redirect URIs.

---

## Local development
```bash
npm install
cp .env.example .env.local
# Fill in .env.local
npm run dev
# Open http://localhost:3000
```

---

## How to use it
1. Sign in with Google
2. Click an upcoming calendar event → auto-fills meeting details
3. Hit **Get pre-meeting briefing** → see context from past meetings
4. Click **Start meeting** → hits the live room
5. Click **Start recording** → Chrome will ask for mic permission
6. Talk — transcript appears left, dashboard updates right every 45 seconds
7. Hit **Analyse now** any time to force an update
8. Use the `/ask` bar mid-meeting to query anything
9. Action items show deep links → click to open Notion/Slack/Google directly
10. Hit **End meeting** → saved to your dashboard for future briefings

---

## Note on audio capture
This uses the browser's Web Speech API — it captures your microphone only, not system audio.
This means it works perfectly for:
- In-person meetings
- Your own voice on a call
- Hybrid meetings where you're speaking

For capturing remote participants too, a Zoom/Meet bot integration is the v2 roadmap item.

---

## Tech stack
- Next.js 14 (App Router)
- NextAuth with Google OAuth
- Anthropic Claude (claude-sonnet) for AI analysis
- Web Speech API for transcription
- Google APIs for Calendar/Gmail/Drive context
- localStorage for meeting history (swap for Supabase/Postgres for multi-user)
