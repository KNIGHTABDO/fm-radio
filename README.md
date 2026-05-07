# FM — AI Radio Station

A personal AI radio station with cinematic narration from your very own DJ named **Claudio**. Built with Next.js 14, Spotify, GitHub Copilot models, and Deepgram TTS.

![FM Radio](https://img.shields.io/badge/FM-Claudio-4ade80?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Features

### Core
- **AI DJ "Claudio"** — A poetic, melancholic AI DJ who speaks between tracks with literary-quality narration
- **Spotify Integration** — Search and play any track from Spotify's catalog
- **Real-time Narration** — AI-generated voice commentary powered by GitHub Copilot models and Deepgram
- **Audio Ducking** — Spotify volume automatically ducks when Claudio speaks

### Design
- **Cinematic Dark Header** — Atmospheric waveform with animated bars and gradient glows
- **Warm White Card** — Clean track display with elegant typography
- **Live Transcript** — Scrolling DJ narration with word-by-word highlighting
- **Customizable Ambiance** — Adjust header hue and blur in real-time

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 14 (App Router) | Server-side rendering, routing |
| Language | TypeScript | Type safety |
| Styling | Tailwind + CSS Variables | Layout & dynamic styles |
| State | Zustand | Client-side state management |
| Music | Spotify Web Playback SDK | In-browser music playback |
| AI Brain | GitHub Copilot (multi-model) | DJ narration generation |
| AI Voice | Deepgram Aura TTS | Text-to-speech synthesis |
| Audio | Web Audio API | Ducking, mixing, volume fades |
| Auth | NextAuth.js | Spotify OAuth |

---

## Prerequisites

Before running the app, you'll need:

1. **Spotify Developer Account**
   - Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - Add `http://localhost:3000` to Redirect URIs

2. **GitHub Copilot Token**
   - Provide a GitHub token that can be exchanged for a Copilot session token

3. **Deepgram API Key**
   - Sign up at [console.deepgram.com](https://console.deepgram.com)
   - Free tier includes aura-luna-en voice

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd fm-radio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Spotify Developer App
# Get from: https://developer.spotify.com/dashboard/
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# GitHub Copilot / GitHub Models - AI narration
GITHUB_COPILOT_TOKEN=your_github_token
GITHUB_COPILOT_MODEL=gpt-4o-mini

# Deepgram TTS - AI voice
# Get from: https://console.deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key

# NextAuth (generate a random string)
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

### First Launch

1. Click **"Connect with Spotify"** to authorize the app
2. Search for any song using the search bar
3. Click on a track to start playing
4. Watch Claudio speak between tracks with poetic narration

### Customization

Click the ⚙️ settings icon in the header to adjust:
- **Violet Hue** — Change the first gradient color
- **Magenta Hue** — Change the second gradient color
- **Blur** — Adjust the header blur intensity

---

## Project Structure

```
/fm-radio
├── /src
│   ├── /app                 # Next.js App Router
│   │   ├── /api
│   │   │   ├── /auth        # NextAuth OAuth routes
│   │   │   ├── /dj          # AI narration API
│   │   │   ├── /spotify     # Spotify search proxy
│   │   │   └── /tts         # Deepgram TTS API
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Main page
│   │   └── globals.css      # Global styles
│   │
│   ├── /components          # React components
│   │   ├── WaveformHeader   # Animated header with waveform
│   │   ├── TrackCard        # Track info and transcript
│   │   ├── Transcript       # Scrolling DJ narration
│   │   ├── MiniPlayer       # Bottom playback bar
│   │   ├── TweaksPanel      # Settings overlay
│   │   ├── SpotifyProvider   # Spotify context
│   │   └── AuthButton       # OAuth login button
│   │
│   ├── /lib                 # Core utilities
│   │   ├── audio.ts         # Web Audio API engine
│   │   ├── spotify.ts       # Spotify SDK wrapper
│   │   ├── githubCopilot.ts # GitHub Copilot client
│   │   ├── orchestrator.ts  # DJ event system
│   │   └── store.ts         # Zustand state
│   │
│   ├── /hooks               # Custom React hooks
│   │   ├── useSpotify.ts    # Spotify player hook
│   │   └── useDJ.ts         # DJ orchestrator hook
│   │
│   └── /types               # TypeScript definitions
│       ├── index.ts         # Core types
│       └── next-auth.d.ts   # NextAuth types
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .env.example             # Environment template
```

---

## API Routes

### `POST /api/dj`

Generates Claudio's narration for a given event.

**Request:**
```json
{
  "event": {
    "type": "TRACK_START" | "TRACK_END" | "USER_PAUSED" | "MANUAL",
    "track": { "name": "...", "artist": "...", "album": "...", "durationMs": 240000 }
  },
  "transcript": [...],
  "track": { ... }
}
```

**Response:**
```json
{
  "narration": "Night air clings to memories of distant cities..."
}
```

### `POST /api/tts`

Converts text to speech using Deepgram Aura.

**Request:**
```json
{
  "text": "Night air clings to memories..."
}
```

**Response:**
Audio stream (WAV, 24kHz, mono, 16-bit)

### `GET /api/spotify/search`

Proxies Spotify search requests.

**Query Parameters:**
- `q` — Search query
- `token` — Spotify access token

**Response:**
```json
{
  "tracks": [
    { "id": "...", "name": "...", "artist": "...", "uri": "..." }
  ]
}
```

---

## Design System

### Colors

```css
--bg:           #080810;   /* Near-black with blue undertone */
--card:         #f8f8f5;   /* Warm white */
--card-sub:     #f0f0ee;   /* Transcript background */
--accent:       #4ade80;   /* Green - speaking indicator only */
--white-wave:   rgba(255, 255, 255, 0.85);
```

### Typography

| Font | Usage | Size |
|------|-------|------|
| **Instrument Serif** | Track titles | 28-32px |
| **DM Mono** | Timestamps, labels, nav | 11-13px |
| **DM Sans** | Body text, buttons | 13-14px |

### Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Card entrance | Slide up + fade | 0.6s ease-out |
| Waveform (playing) | Height variation | 80ms interval |
| Waveform (paused) | Settle to static | 300ms |
| TweaksPanel | Slide from right | 0.25s cubic-bezier |
| Speaking indicator | Pulse opacity | 1s infinite |

---

## Claudio's Personality

Claudio is an AI radio DJ with a distinct voice:

> *"Warm but never saccharine. Slightly melancholic in the way of someone who loves music deeply. Poetic without being pretentious. You speak in short, precise bursts — never more than 3 sentences. You connect music to moments, emotions, and memory."*

**Rules:**
- 1-3 sentences per response
- No emojis, hashtags, or exclamation marks
- Never start with "I"
- No cliché music speak ("this banger", "fire track")
- Write for the ear, not the eye

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy

### Other Platforms

Build with `npm run build` and deploy the `.next` directory.

---

## License

MIT License — feel free to use, modify, and distribute.

---

## Acknowledgments

- Design inspired by [Claudio.fm](https://mmguo.dev/claudio-fm/) by mmguo
- Music is the language of the soul
