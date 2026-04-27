<template>
  <v-container fluid class="pb-8 px-3">

    <!-- ── Page header ────────────────────────────────────────────────────── -->
    <v-row align="center" class="mb-1" no-gutters>
      <v-col>
        <div class="page-title">Play</div>
        <div class="text-caption text-medium-emphasis">Pick a key · Tap chords</div>
      </v-col>
      <v-col cols="auto">
        <div class="d-flex align-center">
          <v-progress-circular
            v-if="isAudible && !isLoaded"
            indeterminate color="primary" size="14" width="2"
            class="mr-2" title="Loading sounds…"
          />
          <v-btn icon="mdi-cog-outline" variant="text" size="small" @click="settingsOpen = true" />
        </div>
      </v-col>
    </v-row>

    <!-- ── Settings dialog ───────────────────────────────────────────────── -->
    <v-dialog v-model="settingsOpen" max-width="320">
      <v-card title="Settings">
        <v-card-text>
          <div class="text-overline text-medium-emphasis mb-2">Notation</div>
          <v-btn-toggle
            v-model="sharpsOrFlats"
            mandatory density="compact" variant="outlined" color="primary"
            class="mb-5" style="width: 100%"
          >
            <v-btn value="sharps" style="flex:1">Sharps  ♯</v-btn>
            <v-btn value="flats"  style="flex:1">Flats  ♭</v-btn>
          </v-btn-toggle>
          <v-switch v-model="isAudible" label="Play chord sounds" hide-details color="primary" class="mb-1" />
          <template v-if="isAudible">
            <div class="text-overline text-medium-emphasis mt-4 mb-2">Instrument</div>
            <v-btn-toggle
              :model-value="activeInstrument"
              mandatory density="compact" variant="outlined" color="primary"
              class="mb-4" style="width: 100%"
              @update:model-value="setInstrument"
            >
              <v-btn value="piano"  style="flex:1">Piano</v-btn>
              <v-btn value="guitar" style="flex:1">Guitar</v-btn>
              <v-btn value="both"   style="flex:1">Both</v-btn>
            </v-btn-toggle>
            <v-switch
              :model-value="bassEnabled"
              label="Bass note" hide-details color="primary" class="mb-3"
              @update:model-value="setBassEnabled"
            />
            <div class="d-flex align-center mb-2" style="gap: 8px">
              <v-icon size="16" color="medium-emphasis">mdi-volume-low</v-icon>
              <v-slider
                :model-value="volume" min="0" max="100" step="1"
                color="primary" hide-details style="flex:1"
                @update:model-value="setVolume"
              />
              <v-icon size="16" color="medium-emphasis">mdi-volume-high</v-icon>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="settingsOpen = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Key selector ──────────────────────────────────────────────────── -->
    <div class="section-label mb-2">Key</div>
    <div class="key-scroll-row mb-3">
      <v-btn
        v-for="k in KEY_ROOTS" :key="k"
        :color="selectedKey === k ? 'primary' : undefined"
        :variant="selectedKey === k ? 'flat' : 'outlined'"
        size="small" class="key-btn"
        @click="selectedKey = k"
      >{{ toDisplayNote(k) }}</v-btn>
    </div>

    <!-- ── Major / Minor toggle ──────────────────────────────────────────── -->
    <v-btn-toggle
      v-model="keyType"
      mandatory density="compact" variant="outlined" color="primary"
      class="mb-5"
    >
      <v-btn value="major" style="min-width:90px">Major</v-btn>
      <v-btn value="minor" style="min-width:90px">Minor</v-btn>
    </v-btn-toggle>

    <!-- ── Key title + scale play ────────────────────────────────────────── -->
    <div class="d-flex align-center mb-4">
      <div>
        <div class="key-display-title">
          {{ toDisplayNote(selectedKey) }} {{ keyType === 'major' ? 'Major' : 'Minor' }}
        </div>
        <div class="text-caption text-medium-emphasis">
          <template v-if="keyType === 'major'">
            Relative minor: {{ toDisplayNote(relativeMinorRoot) }} minor
          </template>
          <template v-else>
            Relative major: {{ toDisplayNote(relativeMajorRoot) }} major
          </template>
        </div>
      </div>
      <v-spacer />
      <v-btn
        v-if="isAudible"
        icon variant="text" size="small"
        title="Play scale"
        @click="handlePlayScale"
      >
        <v-icon size="22">mdi-play-circle-outline</v-icon>
      </v-btn>
    </div>

    <!-- ── Progression builder ───────────────────────────────────────────── -->
    <div class="section-label mb-2">Progression</div>
    <v-card
      class="mb-4 prog-card"
      :class="{ 'prog-card--empty': !progression.length }"
    >
      <v-card-text class="py-3">

        <!-- Empty state -->
        <div v-if="!progression.length" class="prog-empty-state">
          <v-icon size="18" color="medium-emphasis" class="mr-2">mdi-music-note-plus</v-icon>
          <span class="text-body-2 text-medium-emphasis">Tap chords below to build</span>
        </div>

        <!-- Chip row -->
        <div v-else>
          <div class="prog-chips">
            <div
              v-for="(chord, i) in progression" :key="i + '-' + chord"
              class="drag-wrap"
              :class="{ 'drag-wrap--over': progDragOverIdx === i, 'drag-wrap--src': progDragSrcIdx === i }"
              draggable="true"
              @dragstart="onProgDragStart(i, $event)"
              @dragover.prevent="progDragOverIdx = i"
              @drop.prevent="onProgDrop(i)"
              @dragend="progDragSrcIdx = null; progDragOverIdx = null"
            >
              <v-chip
                :color="isPlaying && currentPlayingIdx === i ? 'primary' : chordChipColor(chord)"
                :variant="isPlaying && currentPlayingIdx === i ? 'elevated' : 'flat'"
                size="default" class="prog-chip"
                :class="{ 'prog-chip--playing': isPlaying && currentPlayingIdx === i }"
              >
                <span class="chip-nns mr-1">{{ progressionNNS(i) }}</span>
                {{ toDisplay(chord) }}
                <template #append>
                  <v-btn
                    icon size="x-small" variant="text" class="ml-n2"
                    @click.stop="removeFromProgression(i)"
                  ><v-icon size="12">mdi-close</v-icon></v-btn>
                </template>
              </v-chip>
            </div>
          </div>
          <div class="d-flex align-center justify-space-between mt-2">
            <span class="text-caption text-medium-emphasis">
              <v-icon size="11" class="mr-1">mdi-drag-horizontal-variant</v-icon>Drag to reorder
            </span>
            <v-btn variant="text" size="x-small" color="error" @click="clearProgression">
              Clear all
            </v-btn>
          </div>
        </div>

        <!-- Load from song (logged-in only) -->
        <div
          v-if="currentUser"
          class="mt-2"
          :style="progression.length ? 'border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px' : ''"
        >
          <v-menu v-model="songMenuOpen" :close-on-content-click="false" max-height="320">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text" size="x-small" color="secondary"
                prepend-icon="mdi-playlist-music-outline"
                :loading="loadingSongs"
                @click="fetchUserSongs"
              >Load from song</v-btn>
            </template>
            <v-list density="compact" min-width="240">
              <v-list-item v-if="!userSongs.length && !loadingSongs" disabled>
                <v-list-item-title class="text-caption text-medium-emphasis">
                  No songs with chord charts
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                v-for="song in userSongs" :key="song.id"
                @click="loadFromSong(song); songMenuOpen = false"
              >
                <v-list-item-title class="text-body-2">{{ song.title }}</v-list-item-title>
                <v-list-item-subtitle v-if="song.artist" class="text-caption">
                  {{ song.artist }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

      </v-card-text>
    </v-card>

    <!-- ── Chord pad ─────────────────────────────────────────────────────── -->
    <div class="section-label mb-3">Diatonic Chords</div>
    <div class="chord-pad">
      <div
        v-for="item in displayChords" :key="item.chord"
        class="chord-tile"
        :class="{
          'chord-tile--tonic':  item.isTonic,
          'chord-tile--active': activeChord === item.chord,
          'chord-tile--minor':  !item.isTonic && !item.chord.endsWith('dim') && item.chord.endsWith('m'),
          'chord-tile--dim':    item.chord.endsWith('dim'),
        }"
        @click="handleChordTap(item.chord)"
      >
        <div class="tile-nns">{{ item.nns }}</div>
        <div class="tile-name">{{ toDisplay(item.chord) }}</div>
      </div>
    </div>

    <!-- ── Capo suggestion ───────────────────────────────────────────────── -->
    <div v-if="capoSuggestion" class="d-flex align-center mt-2 mb-1 capo-row">
      <v-icon size="13" color="medium-emphasis" class="mr-1">mdi-guitar-electric</v-icon>
      <span class="text-caption text-medium-emphasis">
        Guitar shortcut: play {{ toDisplayNote(capoSuggestion.playKey) }} shapes with capo {{ capoSuggestion.fret }}
      </span>
    </div>

    <!-- ── Playback controls ─────────────────────────────────────────────── -->
    <div class="section-label mt-5 mb-3">Playback</div>

    <!-- BPM row -->
    <div class="d-flex align-center mb-3" style="gap: 10px">
      <span class="bpm-readout">{{ bpm }}</span>
      <span class="text-caption text-medium-emphasis" style="flex-shrink:0; margin-left:-4px">BPM</span>
      <v-slider
        v-model="bpm" min="40" max="200" step="1"
        color="primary" hide-details style="flex:1"
      />
      <v-btn
        variant="outlined" size="small" color="secondary"
        style="min-width:52px; text-transform:none; flex-shrink:0"
        @click="handleTapTempo"
      >Tap</v-btn>
    </div>

    <!-- Rhythm presets -->
    <div class="d-flex flex-wrap mb-5" style="gap: 8px">
      <v-chip
        v-for="r in RHYTHM_OPTIONS" :key="r.value"
        :color="rhythmPreset === r.value ? 'primary' : undefined"
        :variant="rhythmPreset === r.value ? 'flat' : 'outlined'"
        size="small" style="cursor: pointer"
        @click="setRhythm(r.value)"
      >{{ r.label }}</v-chip>
    </div>

    <!-- Current / next chord display (while playing) -->
    <v-expand-transition>
      <div v-if="isPlaying && currentChord" class="playback-display mb-4">
        <div class="playing-chord-name">{{ toDisplay(currentChord) }}</div>
        <div v-if="nextChord !== currentChord" class="next-chord-hint">
          next: {{ toDisplay(nextChord) }}
        </div>
        <div v-if="rhythmPreset !== 'whole'" class="bar-progress-track mt-2">
          <div class="bar-progress-fill" :style="{ width: barProgress + '%' }" />
        </div>
      </div>
    </v-expand-transition>

    <!-- Transport -->
    <div class="d-flex justify-center" style="gap: 12px">
      <v-btn
        v-if="!isPlaying"
        color="primary" variant="flat" size="large"
        :disabled="!progression.length || !isAudible"
        prepend-icon="mdi-play"
        style="min-width: 130px"
        @click="startPlayback"
      >Play</v-btn>
      <v-btn
        v-else
        color="error" variant="tonal" size="large"
        prepend-icon="mdi-stop"
        style="min-width: 130px"
        @click="stopPlayback"
      >Stop</v-btn>
    </div>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as Tone from 'tone'
import { musicalKeys, noteToSharp, getCapoSuggestion, chordToNNS } from '@/core/musicTheory.js'
import { useAudio } from '../composables/useAudio'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

const KEY_ROOTS     = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SHARP_TO_FLAT = { 'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab' }
const NNS_MAJOR     = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const NNS_MINOR     = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']

const RHYTHM_OPTIONS = [
  { label: 'Whole',   value: 'whole'      },
  { label: '8ths',    value: 'eighths'    },
  { label: 'Triplets',value: 'triplets'   },
  { label: '16ths',   value: 'sixteenths' },
]

// interval = Tone.js time string; stepsPerBar = how many ticks before chord advances;
// soundDuration = soundfont note duration in seconds
const RHYTHM = {
  whole:      { interval: '1m',  stepsPerBar: 1,  soundDuration: 1.4 },
  eighths:    { interval: '8n',  stepsPerBar: 8,  soundDuration: 0.38 },
  triplets:   { interval: '8t',  stepsPerBar: 12, soundDuration: 0.28 },
  sixteenths: { interval: '16n', stepsPerBar: 16, soundDuration: 0.20 },
}

// ─── State ───────────────────────────────────────────────────────────────────

const selectedKey   = ref('C')
const keyType       = ref('major')
const sharpsOrFlats = ref('sharps')
const isAudible     = ref(true)
const settingsOpen  = ref(false)
const activeChord   = ref(null)

let flashTimer = null

// Progression builder
const progression     = ref([])
const progDragSrcIdx  = ref(null)
const progDragOverIdx = ref(null)

// Load-from-song
const { currentUser } = useAuth()
const userSongs       = ref([])
const loadingSongs    = ref(false)
const songMenuOpen    = ref(false)

// Playback reactive state
const bpm             = ref(80)
const rhythmPreset    = ref('whole')
const isPlaying       = ref(false)
const currentPlayingIdx = ref(0)
const barProgress     = ref(0)

// Tap-tempo (plain array — not reactive, no need)
const tapTimes = []

// Audio-thread mutable state (kept outside Vue reactivity for safety)
let _progIdx    = 0
let _step       = 0
let _scheduleId = null

// ─── Audio ───────────────────────────────────────────────────────────────────

const {
  isLoaded, loadInstruments, ensureContext,
  playChord: audioPlayChord, playScale: audioPlayScale,
  activeInstrument, setInstrument,
  bassEnabled, setBassEnabled,
  volume, setVolume,
} = useAudio()

onMounted(() => { if (isAudible.value) loadInstruments() })
watch(isAudible, v => { if (v && !isLoaded.value) loadInstruments() })

// Keep Transport BPM in sync with slider
watch(bpm, v => { Tone.getTransport().bpm.value = v })

// ─── Display helpers ─────────────────────────────────────────────────────────

function toDisplayNote(n) {
  return sharpsOrFlats.value === 'flats' ? (SHARP_TO_FLAT[n] ?? n) : n
}
function toDisplay(chord) {
  return chord.replace(/^([A-G]#?)/, (_, r) => toDisplayNote(r))
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

const relativeMinorRoot = computed(() => {
  const chords = musicalKeys[selectedKey.value]
  return chords ? chords[5].slice(0, -1) : selectedKey.value
})

const relativeMajorRoot = computed(() => {
  const sharp = noteToSharp(selectedKey.value)
  for (const [root, chords] of Object.entries(musicalKeys)) {
    if (chords[5].slice(0, -1) === sharp) return root
  }
  return selectedKey.value
})

// ─── Chord pad ───────────────────────────────────────────────────────────────

const displayChords = computed(() => {
  if (keyType.value === 'major') {
    const chords = musicalKeys[selectedKey.value]
    if (!chords) return []
    return chords.map((chord, i) => ({ chord, nns: NNS_MAJOR[i], isTonic: i === 0 }))
  } else {
    const chords = musicalKeys[relativeMajorRoot.value]
    if (!chords) return []
    return [5, 6, 0, 1, 2, 3, 4].map((srcIdx, dispIdx) => ({
      chord:   chords[srcIdx],
      nns:     NNS_MINOR[dispIdx],
      isTonic: dispIdx === 0,
    }))
  }
})

const capoSuggestion = computed(() => {
  const key = keyType.value === 'minor' ? relativeMajorRoot.value : selectedKey.value
  return getCapoSuggestion(key)
})

// ─── Interaction ─────────────────────────────────────────────────────────────

async function handleChordTap(chord) {
  // Always add to progression
  progression.value.push(chord)

  // Audio preview
  if (isAudible.value && isLoaded.value) {
    await ensureContext()
    audioPlayChord(chord)
  }

  // Tile flash only when not looping (during playback, activeChord is engine-driven)
  if (!isPlaying.value) {
    if (flashTimer) clearTimeout(flashTimer)
    activeChord.value = chord
    flashTimer = setTimeout(() => { activeChord.value = null }, 500)
  }
}

async function handlePlayScale() {
  if (!isAudible.value || !isLoaded.value) return
  await ensureContext()
  audioPlayScale(selectedKey.value, keyType.value)
}

// ─── Progression builder ─────────────────────────────────────────────────────

function chordChipColor(chord) {
  if (chord.endsWith('dim')) return 'error'
  if (chord.endsWith('m'))   return 'secondary'
  return 'primary'
}

function progressionNNS(index) {
  const chord = progression.value[index]
  const item  = displayChords.value.find(d => d.chord === chord)
  return item?.nns ?? '?'
}

function removeFromProgression(index) {
  progression.value.splice(index, 1)
  // Keep currentPlayingIdx in bounds if playing
  if (isPlaying.value && _progIdx >= progression.value.length) {
    _progIdx = 0
  }
}

function clearProgression() {
  if (isPlaying.value) stopPlayback()
  progression.value = []
}

function onProgDragStart(index, event) {
  progDragSrcIdx.value = index
  event.dataTransfer.effectAllowed = 'move'
}

function onProgDrop(targetIndex) {
  const src = progDragSrcIdx.value
  if (src === null || src === targetIndex) return
  const arr = [...progression.value]
  const [item] = arr.splice(src, 1)
  arr.splice(targetIndex, 0, item)
  progression.value = arr
}

// ─── Load from song ───────────────────────────────────────────────────────────

async function fetchUserSongs() {
  if (!currentUser.value || userSongs.value.length || loadingSongs.value) return
  loadingSongs.value = true
  try {
    const { data } = await supabase
      .from('songs')
      .select('id, title, artist, bpm, chord_chart')
      .eq('user_id', currentUser.value.id)
      .not('chord_chart', 'is', null)
      .order('title')
    userSongs.value = (data ?? []).filter(s => Array.isArray(s.chord_chart) && s.chord_chart.length)
  } finally {
    loadingSongs.value = false
  }
}

function loadFromSong(song) {
  if (isPlaying.value) stopPlayback()
  progression.value = [...song.chord_chart]
  if (song.bpm) bpm.value = Math.min(200, Math.max(40, song.bpm))
}

// ─── Playback engine ─────────────────────────────────────────────────────────

const currentChord = computed(() =>
  isPlaying.value ? (progression.value[currentPlayingIdx.value] ?? null) : null
)

const nextChord = computed(() => {
  if (!isPlaying.value || !progression.value.length) return null
  const nextIdx = (currentPlayingIdx.value + 1) % progression.value.length
  return progression.value[nextIdx] ?? null
})

async function startPlayback() {
  if (!progression.value.length || !isAudible.value) return
  await ensureContext()

  const transport = Tone.getTransport()
  const draw      = Tone.getDraw()
  const cfg       = RHYTHM[rhythmPreset.value]

  transport.bpm.value = bpm.value
  transport.cancel()   // clear any previously scheduled events

  _progIdx = 0
  _step    = 0

  isPlaying.value       = true
  currentPlayingIdx.value = 0
  barProgress.value     = 0
  activeChord.value     = progression.value[0] ?? null

  _scheduleId = transport.scheduleRepeat((time) => {
    const prog = progression.value
    if (!prog.length) { stopPlayback(); return }

    const idx   = _progIdx % prog.length
    const step  = _step
    const chord = prog[idx]

    // Strike chord on first step of each slot (all rhythms) or every step for dense rhythms
    audioPlayChord(chord, time, cfg.soundDuration)

    // Advance step counter for next callback
    const nextStep = step + 1
    if (nextStep >= cfg.stepsPerBar) {
      _step    = 0
      _progIdx = (idx + 1) % prog.length
    } else {
      _step = nextStep
    }

    // Sync UI to audio timeline
    draw.schedule(() => {
      currentPlayingIdx.value = idx
      barProgress.value = cfg.stepsPerBar > 1
        ? Math.round(step / cfg.stepsPerBar * 100)
        : 0
      // Update chord tile highlight on each chord change
      if (step === 0) activeChord.value = chord
    }, time)
  }, cfg.interval)

  transport.start()
}

function stopPlayback() {
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel()
  _scheduleId     = null
  _progIdx        = 0
  _step           = 0
  isPlaying.value = false
  barProgress.value = 0
  activeChord.value = null
  currentPlayingIdx.value = 0
}

function setRhythm(value) {
  // Stop before switching so the new interval takes effect cleanly on next Play
  if (isPlaying.value) stopPlayback()
  rhythmPreset.value = value
}

// ─── Tap tempo ────────────────────────────────────────────────────────────────

function handleTapTempo() {
  const now = Date.now()
  tapTimes.push(now)
  if (tapTimes.length > 4) tapTimes.shift()
  if (tapTimes.length >= 2) {
    let total = 0
    for (let i = 1; i < tapTimes.length; i++) total += tapTimes[i] - tapTimes[i - 1]
    const avgMs = total / (tapTimes.length - 1)
    bpm.value = Math.min(200, Math.max(40, Math.round(60000 / avgMs)))
    // watch(bpm) keeps Transport in sync
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

onBeforeUnmount(() => {
  if (isPlaying.value) stopPlayback()
})
</script>

<style scoped>
/* ── Typography ─────────────────────────────────────────────────────────── */
.page-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.section-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(196, 196, 188, 0.5);
}
.key-display-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #C8A96E;
}

/* ── Key selector ───────────────────────────────────────────────────────── */
.key-scroll-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.key-scroll-row::-webkit-scrollbar { display: none; }

.key-btn {
  flex-shrink: 0 !important;
  min-width: 44px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
}

/* ── Progression card ───────────────────────────────────────────────────── */
.prog-card {
  border-color: rgba(200, 169, 110, 0.2) !important;
  transition: border-color 0.3s;
}
.prog-card--empty {
  border-color: rgba(255, 255, 255, 0.05) !important;
}
.prog-empty-state {
  display: flex;
  align-items: center;
  padding: 4px 0;
}
.prog-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ── Draggable chip wrapper ─────────────────────────────────────────────── */
.drag-wrap {
  cursor: grab;
  user-select: none;
  border-radius: 24px;
  transition: opacity 0.15s;
}
.drag-wrap:active { cursor: grabbing; }
.drag-wrap--src   { opacity: 0.35; }
.drag-wrap--over  {
  outline: 2px solid #C8A96E;
  outline-offset: 2px;
  border-radius: 24px;
}

/* ── Progression chip ───────────────────────────────────────────────────── */
.prog-chip { font-weight: 500; }
.prog-chip--playing {
  box-shadow: 0 0 0 2px #C8A96E !important;
}
.chip-nns {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  opacity: 0.65;
  letter-spacing: 0.03em;
}

/* ── Chord pad ──────────────────────────────────────────────────────────── */
.chord-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 8px;
}

.chord-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 92px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s, border-color 0.1s, transform 0.08s;
}
.chord-tile:active { transform: scale(0.93); }

.chord-tile--tonic {
  border-color: rgba(200, 169, 110, 0.3);
  background: rgba(200, 169, 110, 0.07);
}
.chord-tile--minor { border-color: rgba(110, 142, 173, 0.2); }
.chord-tile--dim   { border-color: rgba(207, 75, 75, 0.18); }
.chord-tile--active {
  background: rgba(200, 169, 110, 0.2) !important;
  border-color: #C8A96E !important;
}

/* ── Tile labels ────────────────────────────────────────────────────────── */
.tile-nns {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #6E8EAD;
  margin-bottom: 5px;
}
.chord-tile--tonic .tile-nns { color: #C8A96E; }

.tile-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #C4C4BC;
}
.chord-tile--tonic .tile-name,
.chord-tile--active .tile-name { color: #C8A96E; }

/* ── Capo row ───────────────────────────────────────────────────────────── */
.capo-row { opacity: 0.65; }

/* ── BPM readout ────────────────────────────────────────────────────────── */
.bpm-readout {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #C8A96E;
  min-width: 38px;
  text-align: right;
}

/* ── Playback display ───────────────────────────────────────────────────── */
.playback-display {
  text-align: center;
  padding: 16px 0 8px;
}
.playing-chord-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #C8A96E;
  line-height: 1;
}
.next-chord-hint {
  font-size: 0.85rem;
  color: rgba(196, 196, 188, 0.45);
  margin-top: 6px;
  letter-spacing: 0.02em;
}

/* ── Bar progress ───────────────────────────────────────────────────────── */
.bar-progress-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 280px;
  margin: 0 auto;
}
.bar-progress-fill {
  height: 100%;
  background: #C8A96E;
  border-radius: 2px;
  transition: width 0.08s linear;
}
</style>
