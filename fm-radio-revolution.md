# FM Radio Revolution — Remaking Claudio’s Core (From “AI Music App” to “Persistent Radio Personality OS”)

This document is a long-form blueprint for rebuilding the *core* of “Claudio” as an always-on radio personality: memory + orchestration + timing + narration + audio pipeline + UI presence.

It’s written as a teach-by-building guide: you can follow it to remake the heart of the project from scratch, or refactor your existing app toward the “Claudio FM” architecture you described.

This is based on:

- The current `fm-radio` codebase in this workspace (Next.js 14, Spotify playback, GitHub Copilot models for narration, Deepgram Aura 2 for TTS).
- The architecture diagram you provided (layers: external context → local core → context window → interaction layer).
- Practical patterns that make “radio personality systems” feel alive: continuity, pacing, structured outputs, and stateful flows.

---

## 0) Mental Model Shift (The One That Changes Everything)

### Old model (most AI music apps)

Input → single prompt → single response → play something

This produces a “smart playlist generator,” not a radio host.

### Claudio model (what you actually want)

Memory + environment + schedule + playback state + narrative arc  
→ orchestrated “radio state”  
→ (say + play + segue + timing + transitions)  
→ continuous experience

The AI is not “recommending.”  
The AI is “directing a station.”

---

## 1) Current FM-Radio Baseline (What You Already Have)

Your current stack already contains many of the primitives you need:

### 1.1 Interaction and state

- Global state via Zustand: `src/lib/store.ts`
- Playback state and triggers on the main page: `src/app/page.tsx`

### 1.2 Event orchestration (timing rules)

- Speaking gate (when Claudio should talk): `src/lib/orchestrator.ts`
- Event handling and fallback text: `src/lib/orchestrator.ts`
- DJ event flow and wordIndex updates during speech: `src/hooks/useDJ.ts`

### 1.3 “Brain” (narration generation)

- GitHub Copilot models client + prompt template: `src/lib/githubCopilot.ts`
- DJ API route: `src/app/api/dj/route.ts`

### 1.4 Voice pipeline (TTS + audio)

- Deepgram Aura 2 (aura-2-arcas-en) TTS route: `src/app/api/tts/route.ts`
- AudioEngine (ducking + playback): `src/lib/audio.ts`
- Transcript rendering with active word highlight: `src/components/Transcript.tsx`

This is already a strong “Claudio core v1.”

The revolution is taking it from:

“Event triggers → generate one sentence → speak it”

to:

“A radio operating system → produces structured plans → executes over time.”

---

## 2) The Architecture You’re Pointing At (Decoded Into Buildable Units)

You described a layered system. Here’s how to rewrite it as concrete modules you can implement.

### 2.1 Layer 1 — External Context (Identity + World)

Goal: Claudio must feel like the same person tomorrow.

Instead of hardcoding personality in one system prompt, you maintain a *library* of durable documents and rules that can be composed at runtime.

Recommended file layout (in-repo):

```
/claudio/
  persona.md
  taste.md
  routines.md
  mood-rules.md
  radio-format.md
  do-not-say.md
  playlists.json
  stations.json
```

What each file does:

- `persona.md`: who Claudio is (voice, mannerisms, boundaries, worldview)
- `radio-format.md`: what “a segment” looks like (intro, segue, outro, silence rules)
- `taste.md`: your long-term taste graph: artists, genres, “no-go” rules, era biases
- `routines.md`: time-of-day behavior (morning/evening, energy curves)
- `mood-rules.md`: mapping from environment → mood → energy → track selection heuristics
- `do-not-say.md`: guardrails that preserve premium tone (no cringe, no hype, no “as an AI”)

Key principle:

These docs are not “nice to have.”
They are the difference between:

- “LLM response”
- “recognizable radio personality”

### 2.2 Layer 2 — Local Core (Router + Context + Orchestrator + State)

This is the engine room.

It should contain:

1) **Intention routing**
2) **Context assembly**
3) **Brain orchestrator (structured output)**
4) **State store (memory + timeline)**
5) **Scheduler**

Your current repo has pieces of this, but not the “structured radio plan” part.

### 2.3 Layer 3 — Context Window Design (Composable prompt)

The “context window” is your product.

Every inference should be assembled out of stable blocks:

1. System identity (persona + style)
2. Radio format contract (what the model must output)
3. User docs (taste/routines/mood rules)
4. Current environment (time-of-day, session mode)
5. Memory recall (last N events, last tracks played, last mood state)
6. Tool results (Spotify analysis, recommendations, lyrics hints)
7. Execution trace (what we already attempted)

### 2.4 Layer 4 — Interaction Layer (UI feels simple, engine is not)

“Premium” here is about pacing:

- dead space
- intentional silence
- occasional narration, not constant chatter
- audio-first

Your UI can be minimal if the engine is alive.

---

## 3) The Missing Core: Radio State Engine (The “Station Brain”)

Right now, the app speaks on events. That’s good, but it doesn’t *direct*.

You want a dedicated “radio state engine” that owns:

- current mood
- current energy target
- narrative arc (tonight is “night drive,” “late-night confessions,” etc.)
- constraints (avoid repetition, avoid mood whiplash)
- planning horizon (next 3–7 tracks, not just next one)

### 3.1 Define the state object

Create a single object that represents “the station right now.”

Example schema (you can store this in Zustand on the client + persist on server later):

```ts
type RadioState = {
  sessionId: string
  startedAt: number
  mode: 'passive' | 'interactive' | 'focus' | 'night-drive'
  mood: {
    label: string
    energy01: number
    warmth01: number
    melancholy01: number
  }
  narrative: {
    arc: string
    beat: string
    nextBeatHint?: string
  }
  history: {
    lastTracks: Array<{ id: string; uri: string; name: string; playedAt: number }>
    lastSegments: Array<{ type: string; say: string; at: number }>
  }
  plan?: {
    queue: Array<{ uri: string; why: string }>
    segues: Array<{ afterUri?: string; say: string }>
  }
}
```

This is the substrate for continuity.

### 3.2 Why you need structured outputs

If you only generate prose:

- you can’t reliably execute actions
- you can’t schedule
- you can’t validate
- you can’t evolve state

So you want the model to output a “radio directive”:

```json
{
  "say": "One sentence, Claudio-style.",
  "segue": "One sentence that connects current → next.",
  "energy01": 0.42,
  "mood": "night-drive",
  "actions": [
    { "type": "QUEUE_TRACKS", "uris": ["spotify:track:..."], "reason": "..." },
    { "type": "DUCK_SPOTIFY", "amount": 0.18 }
  ]
}
```

That turns the LLM from “writer” into “director.”

---

## 4) Intention Routing (Router.js, but Real)

You don’t want one monolithic prompt for everything.

### 4.1 Define intents

At minimum:

- `AUTO_SEGUE`: Claudio speaks because the station needs a transition.
- `TRACK_START`: welcome the new track.
- `MID_TRACK`: minimal commentary (rare).
- `TRACK_END`: closing line + set up next.
- `USER_PAUSED`: interpret silence.
- `USER_REQUEST`: the listener asked something.
- `PLAN_NEXT`: plan a short sequence (queue) and narrative arc.

### 4.2 Routing strategies

Option A (fast + deterministic):

- route by event type + simple heuristics (current approach)

Option B (premium):

- a tiny “router prompt” selects intent + chooses a specialist template

If you do router prompting, keep it strict JSON and low temperature.

---

## 5) Context Assembly (Your True Superpower)

The context assembler is a function that builds the model input from:

- static docs
- state
- recent transcript
- current track features
- environment snapshot

In your repo today, `src/lib/githubCopilot.ts` builds a compact prompt from:

- recent transcript lines
- track audio features
- lyrics hint (when available)
- event context

That’s a great base. The next step is making it modular.

### 5.1 Implement “context blocks”

Instead of one big string, build an array of blocks:

```ts
type ContextBlock = { name: string; content: string }
```

Then assemble:

```ts
const blocks: ContextBlock[] = [
  personaBlock,
  radioFormatBlock,
  moodRulesBlock,
  envBlock,
  memoryRecallBlock,
  nowPlayingBlock,
  toolResultsBlock,
]
```

This gives you:

- debuggability (“which block caused weird behavior?”)
- versioning (“persona v3”)
- selective inclusion (keep prompts short)

---

## 6) Memory: The Thing That Makes Claudio Feel “Alive”

There are three memory layers you should build:

### 6.1 Short-term memory (already in repo)

- Recent transcript entries in Zustand (`transcript`)
- A few last Claudio lines are injected into the prompt

This is good for immediate continuity.

### 6.2 Session memory (missing: “radio timeline”)

Add a session log:

- tracks played
- why they were chosen
- what Claudio said
- what mood state was active
- key events (pause, skip, manual prompt)

This enables:

- “we’ve been drifting for a while; let’s lift the energy slightly”
- “avoid repeating themes”

### 6.3 Long-term memory (taste + routines + constraints)

This is where those docs matter.

Even without embeddings, you can get far with:

- curated markdown docs (hand-authored)
- occasional summarization into “taste summary” paragraphs

If you later add a vector DB, do it only after your doc system works.

---

## 7) Scheduling: Make Claudio Behave Like a Station

A radio station has:

- check-ins
- hourly idents
- specific “moments” (midnight, sunrise)
- pacing rules

You can implement scheduling without cron at first:

- run timers client-side
- persist “last check-in at” timestamps in state

Then upgrade:

- server schedule (cron) that writes state snapshots
- push updates to client via WebSocket / SSE

Your current system already has time-based triggers:

- `MID_TRACK` milestones
- “user paused for > 1.8s”
- “near end-of-track”

The next step is adding “radio-format timing.”

Example:

- only 1–2 Claudio lines per track unless the user is interacting
- avoid speaking in the first 10 seconds unless it’s track start
- avoid speaking twice within 45 seconds (you already enforce this gate)

---

## 8) The “Segues” System (The Premium Magic)

The “segue” is a product feature, not a detail.

Your AI output should distinguish:

- **say**: commentary about *this moment*
- **segue**: commentary that *connects to next*
- **plan**: what comes next and why

### 8.1 Segue should reference continuity

Great segues feel like:

- “we’ve been in neon rain all night; let’s step into something warmer”
- “keep that pulse—don’t break it”
- “let the last chord linger, then…”

Bad segues feel like:

- “next song is X by Y” (too literal)

### 8.2 Segues should be executed, not just spoken

If you plan a queue, the segue should line up with the queue change.

This means:

- speak segue
- then start next track

Today, you do:

- `TRACK_END` narration
- then recommendation fetch
- then play next track

The revolution is:

- pre-plan next track earlier (mid-track or start)
- have the segue ready before the end

---

## 9) Brain Orchestrator: From “One Sentence” to “Radio Directives”

### 9.1 Current state (in repo)

Today, `/api/dj` returns:

```json
{ "narration": "..." }
```

This is intentionally minimal and fast.

### 9.2 Upgrade path: add a structured radio directive

Keep the “one sentence” constraint for speech, but add structure around it:

```json
{
  "say": "One sentence, spoken now.",
  "next": {
    "uris": ["spotify:track:..."],
    "reason": "One short reason"
  },
  "mood": {
    "label": "night-drive",
    "energy01": 0.42
  }
}
```

Important: this does not mean Claudio becomes verbose.  
It means the *engine* becomes reliable.

### 9.3 Tool execution loop

Once you have structured directives, you run a loop:

1) Ask model for directive (strict JSON)
2) Validate JSON (schema)
3) Execute tools (Spotify, queue changes)
4) Update state
5) Speak `say` via TTS

That’s the “orchestrator.”

---

## 10) Voice Pipeline: Aura 2 + Low-Latency Audio

You required Aura 2 with:

- model: `aura-2-arcas-en`
- output: `audio/l16;rate=24000`

Your current implementation:

- Calls Deepgram Speak REST with `encoding=linear16`, `sample_rate=24000`, `container=none`
- Streams the response body back to the client
- Plays PCM16 via Web Audio for consistent playback

Key files:

- TTS route: `src/app/api/tts/route.ts`
- Audio playback: `src/lib/audio.ts`

### 10.1 What Deepgram returns

Deepgram Speak REST:

- streams audio bytes back (chunked)
- includes diagnostic headers like `dg-request-id`, `dg-model-name`, `dg-model-uuid`, `dg-char-count`

### 10.2 Streaming: REST vs WebSocket

Deepgram supports two “fast” shapes:

- **REST**: response body is streamed; you can start playing as bytes arrive *if your client can stream-decode*
- **WebSocket**: the best option for truly incremental generation and “never stop talking” agents

In this repo:

- We keep the REST interface for simplicity and because Claudio speaks short sentences.

If you want “Claudio as an always-on station,” upgrade to WebSocket TTS and stream LLM output into it.

---

## 11) Remove Bracket Emotions (And Replace With Real Control)

You mentioned you used `[]` tags for emotions. Deepgram doesn’t require that, and it often makes speech sound unnatural anyway.

The correct approach is:

- control emotion through *writing style*
- control pace through punctuation and sentence length
- optionally control speed/pitch through supported voice controls (only if you need it)

In this repo we enforced:

- “Do not include bracketed tags of any kind.” inside `SYSTEM_PROMPT` (`src/lib/githubCopilot.ts`)

If you want more expressiveness without bracket tags:

- use commas, em dashes, and short clauses
- write for the ear
- avoid parentheses and long nested phrases

---

## 12) Word-Following Highlight (What You Have vs What “Perfect Sync” Means)

### 12.1 What you have now (in repo)

You already have a “wordIndex” animation:

- `useDJ.ts` updates `wordIndex` based on playback progress.
- `Transcript.tsx` renders a gradient highlight on the active word.

This gives the illusion of karaoke-style sync without needing word timestamps.

### 12.2 What “perfect sync” would require

True word-level sync needs *alignment data*:

- TTS engine returning word timestamps (not provided in the basic REST audio response)
- or a forced-alignment pass
- or running STT on the generated audio (expensive + latency)

So the practical product-grade approach is:

- approximate sync (what we’re doing)
- refine heuristics (pause-aware token weighting)

### 12.3 Upgrade the approximation (next)

Instead of `index = floor(progress * wordCount)`, you can weight:

- punctuation gets extra time
- long words get extra time
- commas/periods add delay

That produces “closer to human rhythm” highlights.

---

## 13) The Real “Claudio OS” Roadmap (How to Remake It Properly)

If you want to rebuild the entire core cleanly, do it in this order:

### Phase A — Make state explicit

1) Add `RadioState` object
2) Persist to local storage (client)
3) Store “last tracks” + “last segments”

### Phase B — Introduce structured directives

1) Add a new endpoint: `/api/brain`
2) Return strict JSON describing `say` + `plan`
3) Validate and execute it

### Phase C — Add context docs + modular assembly

1) Create `/claudio/*.md`
2) Build a context assembler that picks blocks
3) Add “environment block” (time, session mode)

### Phase D — Scheduling + passive mode

1) Add timers for “station check-ins”
2) Make Claudio speak without user prompting (sparingly)
3) Add “hourly ident” and “night mode”

### Phase E — Streaming-first voice agent

1) Use WebSocket TTS
2) Stream directive generation + TTS in parallel
3) Add an execution trace UI (debug overlay)

---

## 14) Suggested “Core Refactor” File Layout

Here’s a layout that mirrors the architecture diagram and stays maintainable:

```
src/
  claudio/
    context/
      loadDocs.ts
      assemble.ts
      blocks/
        persona.ts
        taste.ts
        routines.ts
        moodRules.ts
        environment.ts
        memoryRecall.ts
        nowPlaying.ts
    brain/
      router.ts
      schema.ts
      plan.ts
      execute.ts
    state/
      radioState.ts
      persistence.ts
  app/api/
    brain/route.ts
    dj/route.ts
    tts/route.ts
```

You then treat Claudio like an operating system:

- `router.ts` decides “what kind of moment is this?”
- `assemble.ts` builds context
- `plan.ts` asks model for directive
- `execute.ts` runs Spotify tools + updates state
- `tts` speaks `say`

---

## 15) Practical Guidance: What to Copy From “Claudio FM” and What Not To

### Copy these

- Context assembly as first-class system
- Structured outputs (say/play/segue/reason)
- Stateful session timeline
- Pacing rules (silence is premium)

### Don’t copy these blindly

- Overcomplicated multi-agent spawning before you have directives working
- A giant vector DB before your markdown docs are good
- Over-narration (it becomes annoying fast)

---

## 16) “Claudio Quality” Checklist (If You Want It To Feel Premium)

### Voice + writing

- Always short, intentional sentences
- No meta (“as an AI”)
- No exclamation marks
- No bracket tags
- No “announcer voice”

### Pacing

- speaks only at moments that feel earned
- silence is allowed
- no repeated patterns every track

### Continuity

- references previous mood subtly
- avoids repeating the same adjective set
- evolves the session narrative

### Execution reliability

- structured directives
- schema validation
- tool results fed back into next step

---

## 17) Appendix: High-Level Mermaid Diagram (Remade)

```mermaid
flowchart TB
  subgraph L1[Layer 1 — External Context]
    Persona[persona.md]
    Taste[taste.md]
    Routines[routines.md]
    MoodRules[mood-rules.md]
    Format[radio-format.md]
  end

  subgraph L2[Layer 2 — Local Core]
    Router[Intention Router]
    Assembler[Context Assembler]
    Brain[Brain Orchestrator\n(Structured JSON)]
    State[Radio State\n(session + memory)]
    Scheduler[Scheduler\n(check-ins, timing)]
  end

  subgraph Tools[Tools]
    Spotify[Spotify APIs]
    Lyrics[Lyrics hint]
    TTS[Deepgram Aura 2]
  end

  subgraph UI[Layer 4 — UI]
    Player[Player + Waveform]
    Transcript[Transcript + Word Highlight]
  end

  Persona --> Assembler
  Taste --> Assembler
  Routines --> Assembler
  MoodRules --> Assembler
  Format --> Assembler

  Router --> Assembler --> Brain --> State
  Brain --> Spotify
  Brain --> TTS
  Spotify --> State
  TTS --> UI
  State --> UI
  Scheduler --> Router
```

---

## 18) Where Your Repo Is Today (And Why That’s Good)

Your current implementation already nails the “fast, cinematic, minimal” version:

- event-based narration
- strict one-sentence voice
- Deepgram Aura 2 voice pipeline
- word-following highlight

If you implement only one upgrade next, make it:

**Structured radio directives + stateful session timeline**

Because that’s the foundation that turns “cool feature” into “living station.”

