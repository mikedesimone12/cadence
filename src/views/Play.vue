<template>
  <v-container fluid class="pb-8 px-3">

    <!-- ── Page header ────────────────────────────────────────────────────── -->
    <v-row align="center" class="mb-6" no-gutters>
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
            <div class="text-overline text-medium-emphasis mb-1">Volume</div>
            <div class="d-flex align-center mb-2" style="gap: 8px">
              <span class="text-caption text-medium-emphasis" style="min-width:48px">Chords</span>
              <v-slider
                :model-value="volume" min="0" max="100" step="1"
                color="primary" hide-details style="flex:1"
                @update:model-value="setVolume"
              />
            </div>
            <div class="d-flex align-center mb-2" style="gap: 8px">
              <span class="text-caption text-medium-emphasis" style="min-width:48px">Rhythm</span>
              <v-slider
                :model-value="rhythmVolume" min="0" max="100" step="1"
                color="secondary" hide-details style="flex:1"
                @update:model-value="setRhythmVolume"
              />
            </div>
          </template>
          <v-switch v-model="showFingering" label="Show chord fingering" hide-details color="primary" class="mt-1" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="settingsOpen = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Key selector ──────────────────────────────────────────────────── -->
    <div class="section-title">Key</div>
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
    <div class="section-title">Progression</div>

    <!-- Section selector chips (shown when a multi-section song is loaded) -->
    <div v-if="loadedSongSections.length" class="d-flex flex-wrap mb-2" style="gap: 6px">
      <v-chip
        v-for="sec in loadedSongSections" :key="sec.id"
        size="small" variant="outlined" color="primary"
        style="cursor: pointer"
        @click="loadSection(sec)"
      >{{ sec.name }}</v-chip>
    </div>

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
          <div v-if="loadedSongName" class="d-flex align-center mb-2" style="gap: 4px">
            <v-icon size="12" color="medium-emphasis">mdi-music-note-outline</v-icon>
            <span class="text-caption text-medium-emphasis">{{ loadedSongName }}</span>
            <v-btn
              icon size="x-small" variant="text"
              style="width: 16px; height: 16px; min-width: 0"
              @click="loadedSongName = null"
            ><v-icon size="10">mdi-close</v-icon></v-btn>
          </div>
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

        <!-- Load from song / Save (logged-in only) -->
        <div
          v-if="currentUser"
          class="mt-2"
          :style="progression.length ? 'border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px' : ''"
        >
          <div class="d-flex align-center flex-wrap" style="gap: 6px">
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
            <v-btn
              v-if="progression.length"
              variant="text" size="x-small" color="primary"
              prepend-icon="mdi-content-save-outline"
              @click="openSaveDialog"
            >Save progression</v-btn>
          </div>
        </div>

      </v-card-text>
    </v-card>

    <!-- ── Chord pad ─────────────────────────────────────────────────────── -->
    <div class="section-title">Diatonic Chords</div>
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

    <!-- ── Chord fingering ──────────────────────────────────────────────── -->
    <v-expand-transition>
      <div v-if="showFingering && fingeringChord" class="mt-3 mb-1">
        <ChordVisualizer :chord-name="fingeringChord" :compact="false" />
      </div>
    </v-expand-transition>

    <!-- ── Capo suggestion ───────────────────────────────────────────────── -->
    <div v-if="capoSuggestion" class="d-flex align-center mt-2 mb-1 capo-row">
      <v-icon size="13" color="medium-emphasis" class="mr-1">mdi-guitar-electric</v-icon>
      <span class="text-caption text-medium-emphasis">
        Guitar shortcut: play {{ toDisplayNote(capoSuggestion.playKey) }} shapes with capo {{ capoSuggestion.fret }}
      </span>
    </div>

    <!-- ── Playback controls ─────────────────────────────────────────────── -->
    <div class="section-title mt-5">Playback</div>

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
    <div class="d-flex flex-wrap mb-5" style="gap: 10px">
      <v-chip
        v-for="r in RHYTHM_OPTIONS" :key="r.value"
        :color="rhythmPreset === r.value ? 'primary' : undefined"
        :variant="rhythmPreset === r.value ? 'flat' : 'outlined'"
        size="small" style="cursor: pointer"
        @click="setRhythm(r.value)"
      >{{ r.label }}</v-chip>
    </div>

    <!-- Rhythm section -->
    <div class="text-overline text-medium-emphasis mb-2">Rhythm</div>
    <v-btn-toggle
      :model-value="rhythmMode"
      mandatory variant="outlined" color="primary"
      class="mb-3 rhythm-toggle"
      @update:model-value="handleRhythmModeChange"
    >
      <v-btn value="off" class="rhythm-btn">
        <div class="rhythm-btn-inner">
          <span class="rhythm-btn-label">Off</span>
          <span class="rhythm-btn-desc">Chords only</span>
        </div>
      </v-btn>
      <v-btn value="click" class="rhythm-btn">
        <div class="rhythm-btn-inner">
          <span class="rhythm-btn-label">Click</span>
          <span class="rhythm-btn-desc">Straight metronome</span>
        </div>
      </v-btn>
      <v-btn value="acoustic" class="rhythm-btn">
        <div class="rhythm-btn-inner">
          <span class="rhythm-btn-label">Acoustic</span>
          <span class="rhythm-btn-desc">Kick, snare, hi-hat</span>
        </div>
      </v-btn>
      <v-btn value="hiphop" class="rhythm-btn">
        <div class="rhythm-btn-inner">
          <span class="rhythm-btn-label">Hip-Hop</span>
          <span class="rhythm-btn-desc">808, snap, 16ths</span>
        </div>
      </v-btn>
    </v-btn-toggle>

    <!-- Swing slider (hip-hop only) -->
    <v-expand-transition>
      <div v-if="rhythmMode === 'hiphop'" class="d-flex align-center mb-3" style="gap: 8px">
        <span class="text-caption text-medium-emphasis" style="min-width:44px">Swing</span>
        <v-slider
          :model-value="swingAmount" min="0" max="30" step="1"
          color="secondary" hide-details style="flex:1"
          @update:model-value="setSwingAmount"
        />
        <span class="text-caption" style="min-width:32px; color:#C8A96E; text-align:right">
          {{ swingAmount }}%
        </span>
      </div>
    </v-expand-transition>

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
    <div class="d-flex justify-center align-center" style="gap: 16px">
      <v-btn
        v-if="!isPlaying"
        color="primary" variant="flat"
        :disabled="!progression.length || !isAudible"
        icon
        style="width: 64px; height: 64px; border-radius: 50%;"
        @click="startPlayback"
      >
        <v-icon size="32">mdi-play</v-icon>
      </v-btn>
      <v-btn
        v-else
        color="error" variant="outlined"
        icon
        style="width: 48px; height: 48px; border-radius: 50%;"
        @click="stopPlayback"
      >
        <v-icon size="22">mdi-stop</v-icon>
      </v-btn>
    </div>

  </v-container>

  <!-- Save Progression dialog -->
  <v-dialog v-model="saveDialogOpen" max-width="380" :persistent="savingProg">
    <v-card>
      <v-card-title class="pt-5 pb-0 px-5" style="font-family: 'Space Grotesk', sans-serif">
        Save Progression
      </v-card-title>
      <v-card-text class="px-5 pt-3">
        <v-text-field
          v-model="saveForm.title"
          label="Title *"
          variant="outlined" density="compact" hide-details
          class="mb-3" autofocus
        />
        <v-text-field
          v-model="saveForm.artist"
          label="Artist"
          variant="outlined" density="compact" hide-details
          class="mb-3"
        />
        <v-alert
          v-if="saveError"
          type="error" variant="tonal" density="compact" closable class="mt-1"
          @click:close="saveError = ''"
        >{{ saveError }}</v-alert>
      </v-card-text>
      <v-card-actions class="px-5 pb-4 pt-0">
        <v-spacer />
        <v-btn variant="text" size="small" color="secondary" @click="saveDialogOpen = false">Cancel</v-btn>
        <v-btn
          color="primary" variant="flat" size="small"
          :loading="savingProg"
          :disabled="!saveForm.title.trim()"
          @click="saveProgression"
        >Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import * as Tone from 'tone'
import { musicalKeys, noteToSharp, getCapoSuggestion, chordToNNS, progressionToNNS } from '@/core/musicTheory.js'
import { useAudio }  from '../composables/useAudio'
import { useRhythm } from '../composables/useRhythm'
import { useAuth }   from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import ChordVisualizer from '../components/ChordVisualizer.vue'
import { sanitizeText, sanitizeChord } from '../utils/sanitize'
import { validateText } from '../utils/validate'

defineOptions({ name: 'PlayView' })

// ─── Router ──────────────────────────────────────────────────────────────────

const router = useRouter()
const route  = useRoute()

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

// ─── Chord fingering visualizer ───────────────────────────────────────────────

const showFingering = ref(localStorage.getItem('cadence_show_fingering') !== 'false')
watch(showFingering, v => localStorage.setItem('cadence_show_fingering', String(v)))
const fingeringChord = ref(null)

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
const loadedSongName  = ref(null)
const loadedSong      = ref(null)  // { displayTitle, sections, form_order }

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

const {
  rhythmMode, rhythmVolume, swingAmount,
  startDrums, stopDrums,
  setRhythmVolume, setSwingAmount,
} = useRhythm()

onMounted(() => {
  fingeringChord.value = null
  if (isAudible.value) loadInstruments()
  applyHistoryState()
})
onActivated(() => {
  fingeringChord.value = null
  if (isAudible.value && !isLoaded.value) loadInstruments()
  applyHistoryState()
})

// Belt-and-suspenders: catches state even if onActivated fires before
// the router has committed the new history entry (timing edge case).
watch(() => route.path, (p) => { if (p === '/play') applyHistoryState() })

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
  progression.value.push(chord)
  loadedSongName.value = null
  loadedSong.value     = null

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
  fingeringChord.value = chord
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
  progression.value    = []
  loadedSongName.value = null
  loadedSong.value     = null
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
      .select('id, title, artist, key, bpm, chord_chart, sections, form_order')
      .eq('user_id', currentUser.value.id)
      .not('chord_chart', 'is', null)
      .order('title')
    userSongs.value = (data ?? []).filter(s => Array.isArray(s.chord_chart) && s.chord_chart.length)
  } finally {
    loadingSongs.value = false
  }
}

const loadedSongSections = computed(() => {
  const song = loadedSong.value
  if (!song || !Array.isArray(song.sections) || !song.sections.length) return []
  return song.sections
})

function loadFromSong(song) {
  if (isPlaying.value) stopPlayback()
  progression.value = [...song.chord_chart]
  const displayTitle = song.title + (song.artist ? ' — ' + song.artist : '')
  loadedSongName.value = displayTitle
  loadedSong.value = {
    displayTitle,
    sections:   song.sections   ?? [],
    form_order: song.form_order ?? [],
  }
  if (song.bpm) bpm.value = Math.min(200, Math.max(40, song.bpm))
  if (song.key) {
    const isMinor = song.key.length > 1 && song.key.endsWith('m')
    selectedKey.value = noteToSharp(isMinor ? song.key.slice(0, -1) : song.key)
    keyType.value = isMinor ? 'minor' : 'major'
  }
}

function loadSection(section) {
  if (isPlaying.value) stopPlayback()
  progression.value = [...(section.chord_chart ?? [])]
  const song = loadedSong.value
  loadedSongName.value = song ? song.displayTitle + ' · ' + section.name : section.name
}

// ─── Load from router navigation state ───────────────────────────────────────

function applyHistoryState() {
  const s = window.history.state
  if (!s?._cadenceLoad) return
  if (isPlaying.value) stopPlayback()
  if (Array.isArray(s.chords) && s.chords.length) {
    progression.value = s.chords.map(String)
  }
  if (s.key) {
    selectedKey.value = noteToSharp(String(s.key))
    keyType.value     = s.keyType === 'minor' ? 'minor' : 'major'
  }
  if (s.bpm) bpm.value = Math.min(200, Math.max(40, Number(s.bpm)))
  const displayTitle = s.songTitle ? String(s.songTitle) : null
  loadedSongName.value = displayTitle
  loadedSong.value = displayTitle
    ? {
        displayTitle,
        sections:   Array.isArray(s.sections)   ? s.sections   : [],
        form_order: Array.isArray(s.formOrder)   ? s.formOrder  : [],
      }
    : null
  const { _cadenceLoad, ...rest } = s
  history.replaceState(rest, '')
}

// ─── Save progression dialog ──────────────────────────────────────────────────

const saveDialogOpen = ref(false)
const savingProg     = ref(false)
const saveError      = ref('')
const saveForm       = ref({ title: '', artist: '' })

function openSaveDialog() {
  saveForm.value = { title: '', artist: '' }
  saveError.value = ''
  saveDialogOpen.value = true
}

async function saveProgression() {
  if (!saveForm.value.title.trim()) return
  savingProg.value = true
  saveError.value  = ''

  const titleVal = validateText(saveForm.value.title, 'Title', 200)
  if (!titleVal.valid) { saveError.value = titleVal.error; savingProg.value = false; return }

  const artistRaw = saveForm.value.artist.trim()
  if (artistRaw) {
    const artistVal = validateText(artistRaw, 'Artist', 200)
    if (!artistVal.valid) { saveError.value = artistVal.error; savingProg.value = false; return }
  }

  try {
    const key = selectedKey.value + (keyType.value === 'minor' ? 'm' : '')
    const majorRoot = keyType.value === 'minor' ? relativeMajorRoot.value : selectedKey.value
    const sanitizedChords = progression.value.map(c => sanitizeChord(c)).filter(Boolean)
    const nnsChart = sanitizedChords.length
      ? progressionToNNS(sanitizedChords, majorRoot).map(n => n ?? '?')
      : null
    const { error } = await supabase.from('songs').insert({
      user_id:     currentUser.value.id,
      title:       sanitizeText(saveForm.value.title),
      artist:      artistRaw ? sanitizeText(artistRaw) : null,
      bpm:         bpm.value  || null,
      key,
      chord_chart: sanitizedChords,
      nns_chart:   nnsChart,
    })
    if (error) throw error
    saveDialogOpen.value = false
  } catch (e) {
    saveError.value = e.message
  } finally {
    savingProg.value = false
  }
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

  startDrums(rhythmPreset.value)

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
      if (step === 0) {
        activeChord.value   = chord
        fingeringChord.value = chord
      }
    }, time)
  }, cfg.interval)

  transport.start()
}

function stopPlayback() {
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel()
  stopDrums()
  _scheduleId      = null
  _progIdx         = 0
  _step            = 0
  isPlaying.value  = false
  barProgress.value = 0
  activeChord.value = null
  fingeringChord.value = null
  currentPlayingIdx.value = 0
}

function setRhythm(value) {
  // Stop before switching so the new interval takes effect cleanly on next Play
  if (isPlaying.value) stopPlayback()
  rhythmPreset.value = value
}

function handleRhythmModeChange(mode) {
  rhythmMode.value = mode
  if (isPlaying.value) {
    // Hot-swap drums without stopping chord playback
    stopDrums()
    if (mode !== 'off') startDrums(rhythmPreset.value)
  }
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

onBeforeRouteLeave(() => {
  if (isPlaying.value) stopPlayback()
  settingsOpen.value   = false
  saveDialogOpen.value = false
  songMenuOpen.value   = false
})
</script>

<style scoped>
/* ── Typography ─────────────────────────────────────────────────────────── */
.page-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #C8A96E;
  margin-bottom: 2px;
}
.section-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 6px;
  margin-bottom: 12px;
  display: block;
}
.key-display-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: rgba(255, 255, 255, 0.90);
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
  min-height: 44px !important;
  border-radius: 999px !important;
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
  border-left-width: 2px;
  border-left-color: rgba(200, 169, 110, 0.45);
  background: rgba(200, 169, 110, 0.08);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s, border-color 0.1s, transform 0.08s;
}
.chord-tile:active { transform: scale(0.93); }

.chord-tile--tonic {
  background: rgba(200, 169, 110, 0.18);
  border-color: rgba(200, 169, 110, 0.35);
  border-left-color: #C8A96E;
}
.chord-tile--minor {
  background: rgba(110, 142, 173, 0.12);
  border-color: rgba(110, 142, 173, 0.18);
  border-left-color: rgba(110, 142, 173, 0.65);
}
.chord-tile--dim {
  background: rgba(232, 87, 42, 0.12);
  border-color: rgba(232, 87, 42, 0.18);
  border-left-color: rgba(232, 87, 42, 0.65);
}
.chord-tile--active {
  background: rgba(200, 169, 110, 0.22) !important;
  border-color: #C8A96E !important;
  border-left-color: #C8A96E !important;
  box-shadow: 0 0 10px rgba(200,169,110,0.25);
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
  font-family: 'Space Grotesk', monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: #C8A96E;
  min-width: 46px;
  text-align: right;
  letter-spacing: -0.02em;
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
  font-size: 1.2rem;
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

/* ── Rhythm toggle ───────────────────────────────────────────────────────── */
.rhythm-toggle {
  width: 100%;
}
.rhythm-btn {
  flex: 1 !important;
  min-width: 0 !important;
  height: auto !important;
  padding: 7px 3px !important;
  text-transform: none !important;
}
.rhythm-btn-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.rhythm-btn-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
}
.rhythm-btn-desc {
  font-size: 0.55rem;
  opacity: 0.5;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
/* Boost description visibility when button is active */
.v-btn--active .rhythm-btn-desc {
  opacity: 0.75;
}
</style>
