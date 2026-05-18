# Cadence — Vue POC

## What This App Is
Cadence is a musician's rehearsal and theory companion for gigging and cover musicians.
It helps musicians understand music theory, prepare for gigs, practice chord charts,
and play along with progressions.

Target user: working/gigging musician who plays by ear or chord chart. Not a
conservatory student.

Tagline: "The tool that bridges music theory and the gig"

---

## Tech Stack
- Vue 3 + Composition API
- Vuetify 3 (dark gold theme)
- Vite
- Vue Router 4 (bottom nav, 4 tabs)
- Supabase (Postgres + Auth + RLS)
- Tone.js + soundfont-player (audio engine)
- Anthropic Claude API (explain progression feature)
- GCP App Engine (deployment)

---

## Project Structure
```
src/
  core/
    musicTheory.js     — pure music theory functions
                         (no Vue dependencies)
                         exports: musicalKeys,
                         noteToSharp, checkKeys,
                         existsInKey, chordToNNS,
                         progressionToNNS,
                         transposeChord,
                         transposeProgression,
                         transposeSections,
                         getCapoSuggestion,
                         getRelativeMajor,
                         COMMON_PROGRESSIONS
    chordVoicings.js   — guitar + piano voicing data
                         exports: getGuitarVoicings,
                         getPianoVoicing
  composables/
    useAudio.js        — singleton audio engine
                         (Tone.js + soundfont-player)
                         exports: loadInstruments,
                         playChord, playScale,
                         playNote, stopAll,
                         activeInstrument,
                         bassEnabled, volume,
                         isLoaded
    useRhythm.js       — singleton drum machine
                         exports: rhythmMode,
                         rhythmVolume, swingAmount,
                         startDrums, stopDrums,
                         setRhythmVolume, setSwingAmount
    useAuth.js         — Supabase auth singleton
                         exports: currentUser,
                         signInWithEmail, signUp,
                         signInWithGoogle, signOut
  lib/
    supabase.js        — Supabase client singleton
  services/
    spotifySearch.js   — Spotify search client service
  utils/
    sanitize.js        — DOMPurify wrappers
                         exports: sanitizeText,
                         sanitizeChord
    validate.js        — input validation
                         exports: validateBPM,
                         validateText, validateChord,
                         validateChordChart
  components/
    AuthModal.vue      — email/Google auth dialog
    ChordVisualizer.vue — wrapper (guitar or piano
                          based on activeInstrument)
    GuitarFretboard.vue — SVG fretboard, lefty toggle,
                          voicing carousel
    PianoKeyboard.vue  — SVG piano, dynamic mobile
                          viewport centering
    SongImportDialog.vue — Spotify search +
                           autocomplete, form fill
  views/
    Explore.vue        — key finder, chord grid
                         (circle of fifths order,
                         color coded by quality),
                         substitution suggester,
                         "explain this to me"
                         (Claude API),
                         common progressions library
    Gig.vue            — setlist builder, song manager
                         (full song form with sections),
                         NNS conversion, drill mode
                         (6 drill types), transpose tool,
                         capo calculator
    Play.vue           — Simple Loop mode +
                         Chord Chart mode (measure editor),
                         rhythm section (10 modes),
                         chord visualizer, BPM + tap tempo
    Library.vue        — saved songs, practice stats,
                         SVG progress chart,
                         achievements, activity feed,
                         single-song drill mode
  styles/
    global.css         — app-wide styles, CSS variables,
                         chord chip quality classes,
                         section-title, section-label
  plugins/
    vuetify.js         — dark gold theme config
  router/
    index.js           — 4 routes: / → /explore (redirect),
                         /explore, /gig, /play, /library

server.js              — Express API server (port 3001)
  POST /api/explain    — Claude AI proxy (rate: 10/hr)
  GET  /api/spotify/search      — Spotify search
  GET  /api/spotify/features/:id — audio features
```

---

## Theme / Design System
Dark gold musician aesthetic.

Key colors (defined in `src/plugins/vuetify.js`):
```
background:   #0D0D0F
surface:      #1A1A1F
primary:      #C8A96E  (warm gold — stage lighting)
secondary:    #6E8EAD  (steel blue)
accent:       #E8572A  (ember orange — CTAs)
onBackground: #E8E8E0  (warm off-white)
onSurface:    #C4C4BC  (muted text)
```

Fonts:
- Headings: Space Grotesk 700
- Body: Inter 400/500

CSS class conventions:
```
.section-title    — white, bold, 3px gold left border
.section-label    — 10px uppercase, muted, bottom rule
.chip-major       — gold tint chip
.chip-minor       — blue tint chip
.chip-dim         — ember tint chip
.chip-nns-style   — monospace, muted NNS chip
```

Chord button unselected state colors:
```
Major:      background rgba(200,169,110,0.12), border rgba(200,169,110,0.15)
Minor:      background rgba(110,142,173,0.12), border rgba(110,142,173,0.15)
Diminished: background rgba(232,87,42,0.14),   border rgba(232,87,42,0.20)
```

---

## Supabase Schema
Tables (all with RLS enabled):
```
profiles          — id, username, created_at
songs             — id, user_id, title, artist,
                    key, bpm, chord_chart[],
                    nns_chart[], sections (jsonb),
                    form_order[], notes,
                    spotify_id, album_art, created_at
setlists          — id, user_id, name,
                    gig_date, venue, created_at
setlist_songs     — id, setlist_id, song_id,
                    position, transpose_to
practice_sessions — id, user_id, song_id,
                    drill_type, score,
                    section_id, created_at
song_cache        — id, spotify_id, title,
                    artist, key, bpm, sections (jsonb),
                    confidence, source,
                    verified_count, cached_at
call_log          — id, user_id, function_name,
                    called_at
```

Auth: Supabase email/password + Google OAuth
(Google OAuth configured in Supabase dashboard)

---

## Dev Setup
```
npm run dev     — starts Vite (port 8080) + Express (port 3001)
npm run build   — production build to dist/
npm run deploy  — build + gcloud app deploy
```

Vite proxies `/api/*` to Express (configured in `vite.config.js`).

---

## Environment Variables
Required in `.env` (never commit):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SPOTIFY_CLIENT_ID=

# Server-side only (server.js):
ANTHROPIC_API_KEY=
SPOTIFY_CLIENT_SECRET=
```

Security model:
- `ANTHROPIC_API_KEY` and `SPOTIFY_CLIENT_SECRET` are server-side only
- `VITE_SUPABASE_*` and `VITE_SPOTIFY_CLIENT_ID` are client-safe by design
- Husky pre-commit hook blocks accidental API key commits

---

## Key Architectural Decisions

1. **`musicTheory.js` is pure functions** — no Vue deps. Portable to Flutter (Dart port planned).

2. **`useAudio.js` is a singleton** — shared across all tabs so instrument/volume settings persist when switching tabs.

3. **`useRhythm.js` is a singleton** — one set of Tone.js synths shared across renders. All synths lazy-initialized after AudioContext starts.

4. **`useAuth.js` is a singleton** — `currentUser` reactive ref shared globally without Vuex/Pinia.

5. **`keep-alive` on all views** — use `onActivated` alongside `onMounted` for data refresh on tab switch. `onMounted` fires only once; `onActivated` fires every time the tab becomes active.

6. **Cross-tab navigation** uses `window.history.state` with `_cadenceLoad` marker pattern to pass context between tabs.

7. **`ChordVisualizer`** reads `activeInstrument` from `useAudio` — shows piano or guitar fingering accordingly.

8. **No localStorage for app data** — Supabase is the store. localStorage only for UI preferences.

---

## Song Form Data Structure

Simple songs: flat `chord_chart[]` array

Full form songs: `sections` jsonb array
```json
[{
  "id": "string",
  "name": "Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Solo|Tag",
  "order": 0,
  "chord_chart": ["G", "Em", "C", "D"],
  "nns_chart": ["1", "6m", "4", "5"],
  "notes": "string"
}]
```
Plus `form_order[]` for performance sequence (e.g. Intro → Verse → Chorus → Verse → Chorus → Outro).

---

## Drill Types (Gig Tab + Library Tab)
1. **NNS Flash** — shows NNS, recall chords
2. **Transpose Drill** — transpose to new key
3. **Reverse Drill** — identify key from chords
4. **Form Drill** — recall chords per section
5. **Section Flash** — identify section from chords
6. **Transition Drill** — recall what comes next in form

Scoring: Got it = 100, Almost = 60, Missed = 0
Spaced repetition: Missed songs re-queue first

---

## Confidence System
```
Green  — last 3 sessions all Got it (score = 100)
Yellow — mixed recent results
Red    — last session was Missed (score = 0)
Grey   — no practice data yet
```

---

## Audio Engine (useAudio.js)
Instruments loaded via soundfont-player from MusyngKite CDN:
- `piano`: acoustic_grand_piano
- `guitar`: acoustic_guitar_steel
- `bass`: acoustic_bass (plays root notes when `bassEnabled`)

`ensureContext()` must be called from a user gesture before any playback (browser autoplay policy).

---

## Drum Engine (useRhythm.js)
10 rhythm modes available in Play tab:

**Row 1:** Off | Simple | Click | Acoustic | Rock
**Row 2:** Hip-Hop | 4 on Floor | Funk | Swing | Bossa

Synths (all lazy-initialized):
```
_clickSynth:    MetalSynth 400Hz — woodblock click
_kickSynth:     MembraneSynth — standard kick
_808Synth:      MembraneSynth 8 oct pitchDecay 0.18 — Hip-Hop boom
_snareSynth:    NoiseSynth pink — standard snare
_hihatSynth:    MetalSynth closed decay 0.06
_openHatSynth:  MetalSynth open decay 0.4
_rideSynth:     MetalSynth 600Hz decay 0.28 — Swing jazz ride
_rimSynth:      NoiseSynth white decay 0.035 — Bossa rim click
_rockKickSynth: MembraneSynth 6 oct pitchDecay 0.08 — Rock kick
_rockSnareSynth:NoiseSynth white decay 0.10 — Rock snare crack
_crashSynth:    MetalSynth 300Hz decay 0.8 — Rock one-shot crash
```

All routed through `_gainNode → _reverb → destination`.

`Transport.swing = 0.5` for Swing mode (true triplet 2:1 ratio), reset to 0 on `stopDrums()`.

`PATTERNS` object: sub-patterns per rhythmPreset (whole/eighths/triplets/sixteenths) for click/simple/acoustic/hiphop.
`FIXED_PATTERNS` object: single 16n/8n pattern per mode for fourOnFloor/funk/swing/bossa/rock.

---

## Play Tab — Chart Mode
Chart mode is the measure editor in the Play tab.

Data structure: `chartBars[]` — array of bar objects
```js
{
  beats: 4,          // time signature (3 or 4)
  slots: [           // one slot per beat
    { chord: 'G', duration: 1 },   // duration in beats
    { chord: null, duration: 1 },
    ...
  ]
}
```

Users can:
- Add bars, set chords per beat via picker dialog
- Set time signature (4/4 or 3/4) per bar
- Remove individual bars
- Load chart from a saved song
- Play through chart at set BPM with beat grid display

---

## Deployment
- Platform: GCP App Engine (us-central)
- URL: https://cadence-491202.uc.r.appspot.com
- Project ID: cadence-491202
- Runtime: nodejs20, standard environment
- Config: `app.yaml`
- Deploy: `npm run deploy` (build + `gcloud app deploy`)

---

## Security
- DOMPurify applied to all user text before DB writes (`sanitizeText`, `sanitizeChord`)
- Input validation on all form fields (`validateBPM`, `validateChordChart`)
- Rate limiting per IP per endpoint (named buckets in server.js)
- CSP headers in `app.yaml`
- Husky pre-commit hook blocks API key commits
- Supabase RLS on all tables

---

## What This Is NOT
- Not a tab/chord lookup app (legal reasons — no copyrighted charts)
- Not a social network (yet)
- Not a metronome-only app
- Not targeted at advanced theory students

---

## Code Conventions
- Always use Vue 3 Composition API (no Options API)
- Always `defineOptions({ name: 'XxxView' })` in view files (required for keep-alive)
- Always use `onActivated` alongside `onMounted` for data fetching in views
- Always import `supabase` from `src/lib/supabase.js`
- Always import `useAudio` from `composables/useAudio.js`
- Always import `useRhythm` from `composables/useRhythm.js`
- Always import `useAuth` from `composables/useAuth.js`
- Always handle Supabase errors with try/catch + dismissable `v-alert`
- Always call `sanitizeText()` / `sanitizeChord()` before Supabase insert/update
- Never use localStorage for app data — Supabase is the store
- localStorage only for UI preferences:
  `cadence_show_fingering`, `cadence_lefty_mode`, `cadence_notation`
- CSS changes go in `global.css` or scoped `<style>` blocks
- Inline styles only when values are dynamic (bound to reactive data)
- All music theory logic in `src/core/musicTheory.js` — pure functions only, no UI

---

## Phase 2 (Flutter Rewrite)
Same Supabase backend and schema. Vue POC is the reference implementation.

Features planned for Flutter only (not in Vue POC):
- Extended chords (7ths, maj7, dom7, m7b5)
- Song import via Spotify + Claude AI chord suggestion
- Mic-based chord detection
- App store submission (iOS + Android)
- API keys moved to Supabase Edge Functions
- Community shared chord charts
- Export setlist as PDF
- Google OAuth (mobile)
- Circle of fifths interactive diagram

---

## Session History Summary
Built across ~20 Claude Code sessions:
scaffold → music theory core → explore tab → supabase setup → auth →
gig tab → drill mode → audio engine → play tab → library tab →
cross-tab wiring → QA/debug → song form → visual polish →
chord visualizer → common progressions → rhythm section →
mobile fixes → chord grid redesign → measure editor (Chart mode)
