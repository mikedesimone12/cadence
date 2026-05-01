<template>
  <div class="piano-wrap">
    <svg
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      preserveAspectRatio="xMidYMid meet"
      class="piano-svg"
    >
      <defs>
        <filter id="key-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bass-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- White keys -->
      <g v-for="key in whiteKeys" :key="key.id">
        <rect
          :x="key.x" :y="0"
          :width="WW" :height="WH"
          :fill="whiteKeyFill(key)"
          :stroke="'rgba(0,0,0,0.25)'"
          stroke-width="1"
          rx="0" ry="0"
          style="cursor:pointer"
          @click="handleKeyClick(key)"
        />
        <!-- Rounded bottom corners via a second rect -->
        <rect
          :x="key.x + 1" :y="WH - 6"
          :width="WW - 2" :height="7"
          :fill="whiteKeyFill(key)"
          rx="3" ry="3"
        />
        <!-- Highlight indicator on white key -->
        <rect
          v-if="isHighlighted(key)"
          :x="key.x + WW/2 - INDICATOR_R" :y="WH - INDICATOR_R*2 - 8"
          :width="INDICATOR_R*2" :height="INDICATOR_R*2"
          :fill="highlightColor(key)"
          rx="50%"
          :filter="highlightFilter(key)"
          style="pointer-events:none"
        />
        <!-- Note label -->
        <text
          v-if="showLabels && isHighlighted(key)"
          :x="key.x + WW/2"
          :y="WH - 10"
          text-anchor="middle"
          font-family="Space Grotesk, sans-serif"
          font-size="8"
          font-weight="700"
          :fill="labelColor(key)"
          style="pointer-events:none"
        >{{ key.name }}</text>
      </g>

      <!-- Black keys (drawn on top) -->
      <g v-for="key in blackKeys" :key="key.id">
        <rect
          :x="key.x" :y="0"
          :width="BW" :height="BH"
          :fill="blackKeyFill(key)"
          :stroke="'rgba(255,255,255,0.08)'"
          stroke-width="0.5"
          rx="2" ry="2"
          style="cursor:pointer"
          @click="handleKeyClick(key)"
        />
        <!-- Highlight indicator on black key -->
        <rect
          v-if="isHighlighted(key)"
          :x="key.x + BW/2 - INDICATOR_R" :y="BH - INDICATOR_R*2 - 6"
          :width="INDICATOR_R*2" :height="INDICATOR_R*2"
          :fill="highlightColor(key)"
          rx="50%"
          :filter="highlightFilter(key)"
          style="pointer-events:none"
        />
        <!-- Note label on black key -->
        <text
          v-if="showLabels && isHighlighted(key)"
          :x="key.x + BW/2"
          :y="BH - 8"
          text-anchor="middle"
          font-family="Space Grotesk, sans-serif"
          font-size="7"
          font-weight="700"
          :fill="labelColor(key)"
          style="pointer-events:none"
        >{{ key.name.replace('#','♯').replace('b','♭') }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { getPianoVoicing } from '../core/chordVoicings.js'
import { useAudio } from '../composables/useAudio.js'

const props = defineProps({
  chordName:        { type: String,  default: '' },
  highlightedNotes: { type: Array,   default: null },
  showLabels:       { type: Boolean, default: true },
  compact:          { type: Boolean, default: false },
})

const { playNote, isLoaded } = useAudio()

// ── Layout constants ──────────────────────────────────────────────────────────
const WW = 26        // white key width
const WH = 100       // white key height
const BW = 16        // black key width
const BH = 62        // black key height
const GAP = 2        // gap between white keys
const PITCH = WW + GAP  // white key pitch (28)
const INDICATOR_R = 7   // radius of highlight dot

// Responsive: single octave on mobile
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 600)
function onResize() { isMobile.value = window.innerWidth < 600 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const octaves = computed(() => isMobile.value ? [4] : [3, 4])

const WHITE_NAMES = ['C','D','E','F','G','A','B']
// Black key defs: [name or null, fractional x-offset within pair of white keys]
// null = no black key at that white key position
const BLACK_DEFS = [
  { after: 'C', name: 'C#' },
  { after: 'D', name: 'D#' },
  // no black between E and F
  { after: 'F', name: 'F#' },
  { after: 'G', name: 'G#' },
  { after: 'A', name: 'A#' },
  // no black between B and C
]

// Enharmonic aliases for lookup
const ENHARMONIC = {
  'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B',
  'E#':'F','B#':'C',
}

function normalizeNote(n) {
  // strip octave, normalize to sharp name
  const name = n.replace(/\d/,'')
  return ENHARMONIC[name] ?? name
}

// Build white key list
const SVG_W = computed(() => octaves.value.length * 7 * PITCH - GAP + 1)
const SVG_H = WH + 2

const whiteKeys = computed(() => {
  const keys = []
  let xi = 0
  for (const oct of octaves.value) {
    for (const wn of WHITE_NAMES) {
      keys.push({ id: `${wn}${oct}`, name: wn, octave: oct, x: xi * PITCH, isWhite: true })
      xi++
    }
  }
  return keys
})

// Build black key list
const blackKeys = computed(() => {
  const keys = []
  let wIdx = 0
  for (const oct of octaves.value) {
    for (let wi = 0; wi < WHITE_NAMES.length; wi++) {
      const wn = WHITE_NAMES[wi]
      const bdef = BLACK_DEFS.find(b => b.after === wn)
      if (bdef) {
        const x = (wIdx + wi) * PITCH + WW - BW / 2
        keys.push({
          id: `${bdef.name}${oct}`,
          name: bdef.name,
          octave: oct,
          x,
          isWhite: false,
        })
      }
    }
    wIdx += 7
  }
  return keys
})

// ── Highlighted notes ─────────────────────────────────────────────────────────

const activeNotes = computed(() => {
  if (props.highlightedNotes) return props.highlightedNotes
  if (!props.chordName) return []
  const v = getPianoVoicing(props.chordName)
  if (!v) return []
  return [...v.notes, v.bass]
})

const bassNote = computed(() => {
  if (!props.chordName) return null
  const v = getPianoVoicing(props.chordName)
  return v ? v.bass : null
})

function isHighlighted(key) {
  const keyId = `${key.name}${key.octave}`
  return activeNotes.value.some(n => n === keyId || normalizeNote(n)+n.match(/\d/)?.[0] === keyId)
}

function isBass(key) {
  if (!bassNote.value) return false
  const b = bassNote.value
  return `${normalizeNote(b.replace(/\d/,''))}${b.match(/\d/)?.[0]}` === `${key.name}${key.octave}`
}

// ── Colors ────────────────────────────────────────────────────────────────────

const GOLD   = '#C8A96E'
const BLUE   = '#6E8EAD'
const W_KEY  = '#E8E8E0'
const B_KEY  = '#1A1A1F'

function whiteKeyFill(key) {
  if (isHighlighted(key)) return isBass(key) ? BLUE : GOLD
  return W_KEY
}
function blackKeyFill(key) {
  if (isHighlighted(key)) return isBass(key) ? BLUE : GOLD
  return B_KEY
}
function highlightColor(key) { return isBass(key) ? BLUE : GOLD }
function highlightFilter(key) { return isBass(key) ? 'url(#bass-glow)' : 'url(#key-glow)' }
function labelColor(key) {
  if (key.isWhite) return '#1A1A1F'
  return '#E8E8E0'
}

// ── Interaction ───────────────────────────────────────────────────────────────

async function handleKeyClick(key) {
  if (!isLoaded.value) return
  const noteName = `${key.name}${key.octave}`
  playNote(noteName)
}
</script>

<style scoped>
.piano-wrap {
  width: 100%;
  max-width: 480px;
  max-height: 160px;
  margin: 0 auto;
  overflow-x: auto;
}
.piano-svg {
  width: 100%;
  height: auto;
  max-height: 160px;
  display: block;
}
@media (max-width: 599px) {
  .piano-wrap { max-width: 100%; }
}
</style>
