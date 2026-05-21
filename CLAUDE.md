# Cadence — Vue POC (cadence-poc-vue)

## What This App Is
Cadence is a musician's rehearsal and theory
companion for gigging and cover musicians.
Helps musicians understand music theory,
prepare for gigs, practice chord charts,
and play along with progressions.

Target user: working/gigging musician who
plays by ear or chord chart. Not a
conservatory student.

Tagline: "The tool that bridges music theory
and the gig"

Status: Feature complete Vue POC — v1.2
Flutter rewrite in progress (separate repo)

## Tech Stack
Frontend:
- Vue 3 + Composition API
- Vuetify 3 (dark gold theme)
- Vite + Vue Router 4
- Bottom nav, 4 tabs

Backend/Services:
- Supabase (Postgres + Auth + RLS)
- Express server.js (API proxy for secrets)
- Tone.js + soundfont-player (audio engine)
- Anthropic Claude API (3 AI features)
- Spotify API (song metadata)
- GCP App Engine (deployment)

## Project Structure
```
src/
  core/
    musicTheory.js
      Pure music theory functions, no Vue deps.
      Portable to Flutter (Dart port planned).
      Exports:
        musicalKeys — 12 keys, diatonic triads
        noteToSharp(note)
        checkKeys(chordList)
        existsInKey(keyList, chordList)
        chordToNNS(chord, keyRoot)
        progressionToNNS(chords, keyRoot)
        transposeChord(chord, fromKey, toKey)
        transposeProgression(chords, from, to)
        transposeSections(sections, from, to)
        getCapoSuggestion(fromKey, toKey)
        getRelativeMajor(minorRoot)
        COMMON_PROGRESSIONS (with examples)

    chordVoicings.js
      Guitar + piano voicing data.
      Standard tuning EADGBE only.
      Covers all 12 major, minor, dim triads.
      NOTE: triads only — 7ths in Phase 2.
      Exports:
        getGuitarVoicings(chordName)
        getPianoVoicing(chordName)

  composables/
    useAudio.js
      Singleton audio engine (Tone.js).
      Shared across ALL tabs.
      Instruments: piano, guitar, both
        piano: acoustic_grand_piano (soundfont)
        guitar: acoustic_guitar_steel (soundfont)
        bass: acoustic_bass (soundfont)
      Rhythm section (Play tab):
        Off, Click (MetalSynth),
        Acoustic (MembraneSynth + NoiseSynth),
        Hip-Hop (808 MembraneSynth + swing)
      Exports:
        loadInstruments()
        playChord(chordName)
        playScale(root, type)
        playNote(note)
        stopAll()
        activeInstrument ref
        bassEnabled ref
        volume ref
        isLoaded ref

    useAuth.js
      Supabase auth singleton.
      Shared globally — no Vuex/Pinia needed.
      Exports:
        currentUser ref
        signInWithEmail(email, password)
        signUp(email, password)
        signInWithGoogle()
        signOut()

  lib/
    supabase.js — single shared client instance

  services/
    chordImport.js — Spotify + Claude AI import
                     (partial — Session 10 pending)

  utils/
    sanitize.js
      DOMPurify text sanitization.
      Exports:
        sanitizeText(str)
        sanitizeChord(chord)
        validateBpm(bpm)
        simplifyToTriad(chord)
        simplifyProgression(chords)
          Used in Sound Like feature —
          strips extended chords to triads
          ONLY on Load to Explore/Play actions
          NOT on display cards

  components/
    AuthModal.vue
      Email/Google auth dialog.
      Mounted globally in App.vue.

    ChordVisualizer.vue
      Wrapper — shows piano or guitar or both
      based on activeInstrument from useAudio.
      Props: chordName, compact (bool)

    GuitarFretboard.vue
      SVG fretboard, standard tuning.
      Features: voicing carousel (3 voicings),
      lefty toggle (persisted to localStorage),
      auto-adjusts viewBox for barre chords.
      localStorage key: cadence_lefty_mode

    PianoKeyboard.vue
      SVG piano keyboard.
      Desktop: 2 octaves (C3-B4)
      Mobile: dynamic viewport — centers on
      root note of chord being displayed.
      Middle C reference marker always visible.
      Safari/WebKit clipping fixes applied.

    SongImportDialog.vue
      Spotify search + Claude AI chord suggestion.
      (Partial — needs Chordify API for full impl)

  views/
    Explore.vue (ExploreView)
      Key finder with chord grid:
        Circle of fifths order
        Color coded: gold=major, blue=minor,
        ember=diminished
        Tooltips with chord tones + theory context
      Features:
        Live key detection as chords selected
        Chord substitution suggester
        "Explain this to me" (Claude API)
        "Explain differently" button
        Common progressions library
          (4 categories, examples per progression)
        Sound Like generator (Claude API)
          Shows full extended chords on cards
          Simplifies to triads on Load actions
        Chord visualizer on click
      Settings gear: notation, instrument,
        bass toggle, volume, show fingering

    Gig.vue (GigView)
      Two panel layout (desktop), stacked (mobile).
      Left: Setlist Manager
        CRUD setlists with gig date + venue
        Countdown chip (red≤7d, amber≤30d, green)
        Practice button per setlist
      Right: Song Manager
        Songs with drag-to-reorder
        Full song form:
          Simple mode: flat chord chart
          Full Form mode:
            Section definitions (chord picker popup)
            Form order builder (tap to add sections,
            sections reusable multiple times)
            Repeat not needed — reuse sections freely
        NNS auto-conversion per song
        Confidence dots (green/yellow/red/grey)
        Transpose tool + capo calculator
        "Open in Play" cross-tab navigation
        Setlist Song Suggester (Claude AI):
          Context form: venue, vibe, genre, length
          Returns 8-10 suggestions with reasons
          "+ ADD" pre-populates song form
      Drill Mode (fullscreen):
        6 drill types:
          1. NNS Flash
          2. Transpose Drill
          3. Reverse Drill
          4. Form Drill (requires sections)
          5. Section Flash (requires sections)
          6. Transition Drill (requires form_order)
        Scoring: Got it=100, Almost=60, Missed=0
        Spaced repetition: Missed songs queue first
        Gig urgency banner if ≤7 days to gig
        Chord visualizer on reveal (compact)

    Play.vue (PlayView)
      Two modes — toggle at top:

      SIMPLE LOOP MODE:
        Key selector (12 notes, major/minor)
        Chord pad (7 diatonic chords, NNS labeled)
        Progression chips (draggable)
        BPM slider (40-200) + tap tempo
        Rhythm section toggle:
          Off | Click | Acoustic | Hip-Hop
        Transport: Play/Stop
        Load from song (Supabase)
        Save progression (Supabase)
        Chord visualizer (updates during playback)

      CHORD CHART MODE:
        Measure grid editor (4/4 or 3/4)
        Beat cells — tap to assign chord
        Chord picker popup per beat
        Chord span visual (ghost chord in empty beats)
        Drag to reorder measures
        Add/delete bars
        Playback highlights active beat (gold)
        BPM + rhythm section same as Simple Loop
        Load from song (with section selector)
        Save as song (Supabase)

    Library.vue (LibraryView)
      Saved songs grid:
        Search by title/artist
        Filter: All/High Confidence/Needs Work/
                No Practice
        Card expand: notes, transpose, drill,
                     Open in Play
      Practice stats:
        Total songs, total drills,
        avg confidence %, day streak
        SVG line chart (30 days)
      Recent activity feed (last 10 sessions)
      Achievements (6 badges, progress bars)
      Single-song drill (all 6 types)

  styles/
    global.css
      CSS variables, chip quality classes,
      section-title, section-label,
      scrollbar styles, micro-interactions
```

## Theme / Design System
Dark gold musician aesthetic.

Colors (src/plugins/vuetify.js):
```
background:   #0D0D0F
surface:      #1A1A1F
primary:      #C8A96E  (warm gold)
secondary:    #6E8EAD  (steel blue)
accent:       #E8572A  (ember orange)
onBackground: #E8E8E0  (warm off-white)
onSurface:    #C4C4BC  (muted text)
```

Fonts:
- Headings: Space Grotesk 700
- Body: Inter 400/500

CSS classes:
```
.section-title  — white, bold, gold left border,
                  subtle gold pill bg
.section-label  — 10px uppercase, muted,
                  bottom rule
.chip-major     — gold tint
.chip-minor     — blue tint
.chip-dim       — ember tint
.chip-nns-style — monospace, muted
```

## Supabase Schema
All tables have RLS enabled (verified).

```
profiles
  id uuid references auth.users PK
  username text
  created_at timestamptz

songs
  id uuid PK
  user_id uuid references auth.users
  title text NOT NULL
  artist text
  key text
  bpm integer
  chord_chart text[]
  nns_chart text[]
  sections jsonb (array of section objects)
  form_order text[]
  notes text
  created_at timestamptz

Section object shape:
{
  id: string,
  name: string (Verse/Chorus/Bridge etc),
  order: number,
  chord_chart: string[],
  nns_chart: string[],
  notes: string
}

setlists
  id uuid PK
  user_id uuid references auth.users
  name text NOT NULL
  gig_date date
  venue text
  created_at timestamptz

setlist_songs
  id uuid PK
  setlist_id uuid references setlists
  song_id uuid references songs
  position integer
  transpose_to text
  RLS: subquery checks setlist ownership

practice_sessions
  id uuid PK
  user_id uuid references auth.users
  song_id uuid references songs
  drill_type text
  score integer (100/60/0)
  section_id text
  created_at timestamptz
```

## Environment Variables
```
# Local .env (never commit):
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # server-side only
VITE_SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=    # server-side only
```

App Engine: injected by deploy.sh via awk
into temporary app.yaml at deploy time.
Never stored in committed app.yaml.

## Server.js API Endpoints
Express server proxies all secret API calls.
Runs on same App Engine instance as Vue app.

```
POST /api/explain
  Explains a chord progression (Claude AI)
  Rate limit: 10/hr per IP
  Model: claude-sonnet-4-6

POST /api/suggest-songs
  Suggests cover songs for a setlist (Claude AI)
  Rate limit: 5/hr per IP
  Model: claude-sonnet-4-6
  Body: { venueType, crowdVibe, genres,
          setLength, existingSongs,
          additionalContext }

POST /api/sound-like
  Generates progressions from vibe description
  Rate limit: 10/hr per IP
  Model: claude-sonnet-4-6
  Body: { prompt, currentKey }
  Server simplifies to triads before returning.
  Client also simplifies on Load actions.

GET /api/spotify/search
  Searches Spotify for song metadata
  Returns: title, artist, key, BPM

GET /api/getsongbpm
  Gets BPM data for a song
```

Rate limits: in-memory (resets on restart).
NOTE: move to Redis in Phase 2.

## Deployment
```
Platform: GCP App Engine (us-central)
URL:      https://cadence-491202.uc.r.appspot.com
Deploy:   npm run deploy (deploy.sh)
  1. npm run build
  2. Copies dist + server.js to temp dir
  3. Injects secrets via awk into app.yaml
  4. gcloud app deploy
  5. Cleans up temp dir

app.yaml: nodejs20, standard env
  max_instances: 2
  Static file handlers for dist/
  Security headers (CSP, X-Frame-Options etc)
```

IMPORTANT: `node server.js` (no --env-file in prod).
App Engine injects env vars directly.
Local dev: `node --env-file .env server.js`

## Key Architectural Decisions

1. **musicTheory.js pure functions**
   No Vue dependencies — portable to Flutter.
   Dart port planned for Flutter rewrite.

2. **useAudio.js singleton**
   Shared across all tabs — instrument/volume
   settings persist during session.

3. **useAuth.js singleton**
   currentUser reactive ref shared globally.
   No Vuex/Pinia needed.

4. **keep-alive on all views**
   All views use `defineOptions({ name: 'XxxView' })`.
   onActivated alongside onMounted for data refresh.
   onBeforeRouteLeave closes all open dialogs.

5. **Cross-tab navigation**
   Uses window.history.state with _cadenceLoad marker.
   Play tab reads state on onMounted + onActivated.
   history.replaceState clears marker after reading.

6. **ChordVisualizer reads activeInstrument**
   Shows piano, guitar, or both based on setting.
   Lefty mode persisted to localStorage.

7. **Sound Like feature**
   Cards show full extended chords (educational).
   simplifyProgression() only runs on
   Load to Explore / Load to Play actions.
   Server also simplifies before returning.

8. **Song form — two modes**
   Simple: flat chord_chart array.
   Full Form: sections + form_order.
   Section cards define chord content once.
   Form order builder reuses sections freely.
   form_order = ['Verse','Chorus','Verse','Chorus']

## Confidence System
```
Green:  last 3 sessions all Got it (score=100)
Yellow: mixed recent results
Red:    last session Missed (score=0)
Grey:   no practice data
```

## Common Patterns — Always Follow These

- Vue 3 Composition API only (no Options API)
- Import supabase from `src/lib/supabase.js`
- Import useAudio from `composables/useAudio.js`
- Import useAuth from `composables/useAuth.js`
- `defineOptions({ name: 'XxxView' })` in all views
- onActivated + onMounted for data fetching
- try/catch + dismissable v-alert for all Supabase operations
- `sanitizeText()` before all Supabase writes
- Never use localStorage for app data (Supabase is the store)
- localStorage only for UI preferences:
  - `cadence_show_fingering`
  - `cadence_lefty_mode`
  - `cadence_notation` (sharps/flats)
  - `cadence_play_mode` (loop/chart)

## Security
Score: 8.2/10 (production ready for POC)
- No secrets in browser bundle
- All API keys server-side via server.js
- RLS enabled + verified on all tables
- Input sanitization (DOMPurify) on all writes
- CSP headers in app.yaml + vite.config.js
- Husky pre-commit hook blocks key commits
- Rate limiting on all AI endpoints
- Session refresh on visibility change
- Auth guards on all Supabase writes

Remaining gaps (Phase 2):
- Move to Redis for rate limiting
- Supabase Edge Functions for API proxy
- Vite 8 migration (dev-only CVE)

## What This Is NOT
- Not a tab/chord lookup (legal reasons)
- Not a social network (yet)
- Not targeted at conservatory students
- Triads only — no 7ths/extensions (Phase 2)

## Phase 2 — Flutter Rewrite
```
Repo: github.com/mikedesimone12/cadence
Same Supabase backend, same schema.
Vue POC at: cadence-poc-vue (this repo)
```

Phase 2 feature list:

Music Theory:
- [ ] Extended chords toggle (triads → 7ths)
      maj7, m7, dom7, dim7 across all tabs
      Dart music theory core from day one
- [ ] Chord extensions (9ths, 11ths, 13ths)
- [ ] Mode explorer (Dorian, Mixolydian etc)
- [ ] Ear training / chord recognition via mic

Gig:
- [ ] Song import (Spotify + Claude AI)
- [ ] Chordify API (if approved)
- [ ] Community shared chord charts
- [ ] Google OAuth
- [ ] Export setlist as PDF
- [ ] Practice plan generator (AI)
- [ ] Key/tempo transition suggester (AI)

Play:
- [ ] Extended chord voicings in visualizer
- [ ] Real-time chord detection via mic

Explore:
- [ ] Circle of Fifths interactive
- [ ] Full mode explorer
- [ ] Per-chord substitution explainer (AI)

Library:
- [ ] Gig debrief assistant (AI coaching)
- [ ] Long term progress trends

Infrastructure:
- [ ] Firebase Hosting for Flutter Web
- [ ] App Store + Play Store submission
- [ ] Anthropic API → Supabase Edge Functions
- [ ] Redis rate limiting
- [ ] Google OAuth
- [ ] Vite 8 migration

## Session History
Built across ~25 Claude Code sessions:
scaffold, music theory core, explore tab,
supabase + auth, gig tab, drill mode,
audio engine, play tab, library tab,
cross-tab wiring, QA + debug passes,
song form with sections, visual polish,
chord visualizer (piano + guitar SVG),
common progressions with examples,
rhythm section (Tone.js patterns),
mobile fixes (dynamic piano viewport),
chord grid redesign (circle of fifths),
measure editor (chord chart mode),
song form UX overhaul (chord picker),
security hardening, App Engine deploy,
AI features (explain, suggest songs,
sound like with triad simplification).
