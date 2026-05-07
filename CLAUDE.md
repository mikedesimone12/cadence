# Cadence — Musician's Rehearsal & Theory Companion
## Vue POC (cadence-poc-vue)

---

## What This App Is
A web app for gigging musicians that combines music theory
education, gig preparation, and real-time practice tools.
Target user: working cover musician who needs to internalize
chord charts, practice before gigs, and understand theory.

---

## Tech Stack
- Frontend: Vue 3 + Vuetify 3 + Vite (SPA)
- Backend: Node.js Express server (server.js)
- Database: Supabase (Postgres + Auth + RLS)
- Audio: Tone.js + soundfont-player
- AI: Anthropic Claude API (server-side proxy only)
- Music data: Spotify API (server-side proxy only)
- Deployment: GCP App Engine
- URL: https://cadence-491202.uc.r.appspot.com

## Dev Setup
- Vite runs on port 8080
- Express server runs on port 3001
- Vite proxies /api/* to Express (vite.config.js)
- Start both: npm run dev
- Deploy: npm run deploy (builds + deploys to App Engine)

---

## Project Structure
```
src/
├── core/
│   ├── musicTheory.js      ← pure music theory functions
│   │   exports: musicalKeys, noteToSharp, checkKeys,
│   │   existsInKey, chordToNNS, progressionToNNS,
│   │   transposeChord, transposeProgression,
│   │   getCapoSuggestion, transposeSections,
│   │   getRelativeMajor, COMMON_PROGRESSIONS
│   └── chordVoicings.js    ← guitar + piano voicing data
│       exports: getGuitarVoicings, getPianoVoicing
├── composables/
│   ├── useAudio.js         ← singleton Tone.js audio engine
│   │   exports: activeInstrument, bassEnabled, isLoaded,
│   │   volume, loadInstruments, playChord, playScale,
│   │   playNote, stopAll, setInstrument, setBassEnabled,
│   │   ensureContext
│   ├── useRhythm.js        ← singleton drum machine
│   │   exports: rhythmMode, rhythmVolume, swingAmount,
│   │   startDrums, stopDrums, setRhythmVolume, setSwingAmount
│   └── useAuth.js          ← Supabase auth singleton
│       exports: currentUser, signInWithEmail, signUp,
│       signOut, signInWithGoogle
├── services/
│   └── spotifySearch.js    ← client Spotify service
│       exports: searchTracks, getTrackFeatures
├── utils/
│   ├── sanitize.js         ← DOMPurify wrappers
│   │   exports: sanitizeText, sanitizeChord
│   └── validate.js         ← input validation
│       exports: validateBPM, validateText,
│       validateChord, validateChordChart
├── lib/
│   └── supabase.js         ← Supabase client singleton
├── plugins/
│   └── vuetify.js          ← dark gold theme config
├── router/
│   └── index.js            ← 4 routes: / → /explore
├── styles/
│   └── global.css          ← app-wide CSS
│       .section-title (white, gold left border)
│       .section-label (muted uppercase)
│       .chip-major/minor/dim (color coded chips)
├── components/
│   ├── AuthModal.vue        ← email + Google OAuth
│   ├── ChordVisualizer.vue  ← wrapper (piano or guitar)
│   ├── GuitarFretboard.vue  ← SVG fretboard, lefty toggle
│   ├── PianoKeyboard.vue    ← SVG piano, mobile viewport
│   └── SongImportDialog.vue ← Spotify search autocomplete
└── views/
    ├── Explore.vue    ← theory, key detection, visualizer
    ├── Gig.vue        ← setlists, songs, drill mode
    ├── Play.vue       ← chord looper, rhythm section
    └── Library.vue    ← stats, achievements, history

server.js — Express API server
├── POST /api/explain        ← Claude AI proxy (rate: 10/hr)
├── GET  /api/spotify/search ← Spotify search (rate: 30/hr)
└── GET  /api/spotify/features/:trackId ← audio features
```

---

## Database Schema (Supabase)
Tables (all have RLS enabled):
- profiles (id, username, created_at)
- songs (id, user_id, title, artist, key, bpm,
         chord_chart[], nns_chart[], sections jsonb,
         form_order[], notes, spotify_id, album_art,
         created_at)
- setlists (id, user_id, name, gig_date, venue, created_at)
- setlist_songs (id, setlist_id, song_id, position,
                 transpose_to)
- practice_sessions (id, user_id, song_id, drill_type,
                     score, section_id, created_at)
- song_cache (id, spotify_id, title, artist, key, bpm,
              sections jsonb, confidence, source,
              cached_at)
- call_log (id, user_id, function_name, called_at)

---

## Theme / Design System
Dark moody musician aesthetic:
- background:  #0D0D0F
- surface:     #1A1A1F
- primary:     #C8A96E (warm gold — stage lighting)
- secondary:   #6E8EAD (muted steel blue)
- accent:      #E8572A (ember orange — CTAs)
- onSurface:   #C4C4BC
- Fonts: Space Grotesk (headings), Inter (body)

Hierarchy:
- Page titles: gold, 1.6rem, weight 700
- Section headers (.section-title): white, 1rem,
  weight 700, 3px gold left border
- Sub-labels (.section-label): muted, 10px uppercase
- Chord chips: color coded by quality
  .chip-major = gold tint
  .chip-minor = blue tint
  .chip-dim   = ember tint

---

## Key Features Built

### Explore Tab
- Chord grid (circle of fifths order, color coded)
- Key detection from selected chords
- Chord substitution suggester (inline tooltips)
- "Explain this to me" — Claude API explanation
- Common progressions library with song examples
- ChordVisualizer (piano + guitar, click to show)
- Sharps/flats toggle, sound toggle, settings gear

### Gig Tab
- Setlist builder with gig date + countdown
- Song form: simple mode OR full song form with sections
  (Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro etc.)
- NNS auto-conversion per song
- Confidence dots (green/yellow/red from practice history)
- Transpose tool with capo calculator
- Spotify import — search → autocomplete → form fills
- Drill mode (6 types):
  1. NNS Flash — show NNS, recall chords
  2. Transpose Drill — transpose to new key
  3. Reverse Drill — identify key + NNS
  4. Form Drill — recall chords per section
  5. Section Flash — identify section from chords
  6. Transition Drill — what comes next in form
- Spaced repetition (missed songs re-queued)
- Gig urgency banner (≤7 days)

### Play Tab
- Key selector (12 notes, major/minor)
- Diatonic chord pad with NNS labels
- Progression builder (drag to reorder)
- Load from song (pulls from user's Gig setlists)
- Save progression to song library
- BPM slider + tap tempo
- Chord rhythm presets (chips): Whole | 8ths | Triplets | 16ths
- Drum machine (rhythm toggle, 2-row grid):
  Row 1: Off | Simple | Click | Acoustic | Rock
  Row 2: Hip-Hop | 4 on Floor | Funk | Swing | Bossa
  Layout: 5 per row on desktop, 2 per row on mobile (≤599px)
  - Off: drums disabled, chords only
  - Simple: kick on 1&3, snare on 2&4, no hi-hat;
    MembraneSynth kick at 0.8 vel, NoiseSynth snare at 0.7;
    uses PATTERNS (adapts to chord rhythm preset)
  - Click: MetalSynth woodblock, beat 1 accented
  - Acoustic: MembraneSynth kick, NoiseSynth snare (pink),
    MetalSynth hat; Freeverb room reverb
  - Rock: heavy MembraneSynth kick (6 oct, pitchDecay 0.08),
    white NoiseSynth snare (decay 0.10, hard crack),
    MetalSynth 8th-note hats at consistent vel;
    MetalSynth crash one-shot on pattern downbeat
  - Hip-Hop: MembraneSynth 808 boom kick, NoiseSynth snap
    snare, MetalSynth hat; user-adjustable swing slider
  - 4 on Floor: kick every beat, snare 2&4, eighth hats
    (disco/house/EDM feel)
  - Funk: syncopated kick (1, and-of-2, 3), ghost snares
    at 0.3× velocity on surrounding 16ths, accented 16th
    hats; fixed 17% swing on off-beat 16ths
  - Swing: jazz ride (MetalSynth 600Hz), foot hi-hat on 2&4,
    sparse kick on beat 1, brushed snare on 2&4;
    Tone.Transport.swing = 0.5 (true triplet 2:1 ratio)
  - Bossa: clave-inspired rim click (NoiseSynth white,
    decay 0.035s) on beats 1, and-of-1, 3, and-of-3, 4;
    subtle quarter-note hi-hat; no kick
- Rhythm volume slider (Settings dialog)
- Chord visualizer (shows fingering during playback)
- Current/next chord display during playback
- Bar progress indicator

### Library Tab
- Song grid with search + confidence filters
- Expand card: transpose, practice, open in play
- Practice stats (total drills, avg confidence, streak)
- SVG confidence trend chart (30 days)
- Recent activity feed
- Achievement badges (6 total, progress tracking)
- Spotify import count indicator

---

## Audio Engine (useAudio.js)
Singleton — one instance shared across all tabs.
Instruments: piano (acoustic_grand_piano),
             guitar (acoustic_guitar_steel),
             bass (acoustic_bass)
All loaded via soundfont-player from MusyngKite CDN.
Tone.js handles all scheduling and transport.
ensureContext() must be called from user gesture
before any playback (browser autoplay policy).

## Drum Engine (useRhythm.js)
Singleton — one set of Tone.js synths shared across renders.
Synths (all lazy-initialized after AudioContext starts):
- _clickSynth:   MetalSynth (freq 400, woodblock click)
- _kickSynth:    MembraneSynth (pitchDecay 0.09, 5 oct)
- _808Synth:     MembraneSynth (pitchDecay 0.18, 8 oct, boom)
- _snareSynth:   NoiseSynth pink (decay 0.16)
- _hihatSynth:   MetalSynth closed (decay 0.06)
- _openHatSynth: MetalSynth open (decay 0.4)
- _rideSynth:       MetalSynth (freq 600, decay 0.28) — Swing
- _rimSynth:        NoiseSynth white (decay 0.035) — Bossa
- _rockKickSynth:   MembraneSynth (6 oct, pitchDecay 0.08) — Rock
- _rockSnareSynth:  NoiseSynth white (decay 0.10) — Rock
- _crashSynth:      MetalSynth (freq 300, decay 0.8) — Rock one-shot
All routed through: _gainNode → _reverb → destination
Transport.swing is set to 0.5 for Swing mode, reset to 0
on stopDrums() and when any other mode starts.
PATTERNS object: fixed interval sub-patterns per rhythmPreset
(whole/eighths/triplets/sixteenths) for click/simple/acoustic/hiphop.
FIXED_PATTERNS object: single 16n or 8n pattern per mode
for fourOnFloor/funk/swing/bossa/rock (independent of rhythmPreset).

---

## Security
- ANTHROPIC_API_KEY: server-side only (server.js)
- SPOTIFY_CLIENT_SECRET: server-side only (server.js)
- VITE_SPOTIFY_CLIENT_ID: client-safe (public)
- VITE_SUPABASE_URL: client-safe (designed for client)
- VITE_SUPABASE_ANON_KEY: client-safe (designed for client)
- DOMPurify applied to all user inputs before DB writes
- Input validation on all form fields
- Rate limiting per IP per endpoint (named buckets)
- CSP headers in app.yaml
- Husky pre-commit hook blocks API key commits
- Supabase RLS on all tables

---

## Code Conventions
- Vue 3 Composition API throughout (no Options API)
- defineOptions({ name: 'XxxView' }) on all views
  (required for keep-alive)
- onActivated used alongside onMounted for
  data refresh on tab switch (keep-alive pattern)
- onBeforeRouteLeave closes all dialogs before nav
- All Supabase calls have loading + error state
- sanitizeText() + sanitizeChord() before all DB writes
- validateBPM() + validateChordChart() before saves
- All music theory logic in src/core/musicTheory.js
- No UI logic in musicTheory.js (pure functions only)

---

## GCP Project
Project ID: cadence-491202
App Engine region: us-central
Stable URL: https://cadence-491202.uc.r.appspot.com
Deploy: npm run deploy

---

## What's Next (Phase 2 — Flutter)
Flutter rewrite will use same Supabase backend.
Pending Vue POC sessions:
- Session 13: Play tab measure editor
  (Chart mode: beat grid, 4/4 + 3/4, drag duration)

Phase 2 features (Flutter only):
- Extended chords (7ths, maj7, dom7, m7)
- Song import Part B (Claude AI chord suggestion)
- Chordify API integration
- Mic-based chord detection
- Circle of Fifths interactive
- App store submission
- Google OAuth
- Firebase Hosting
