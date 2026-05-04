<template>
  <div class="piano-wrap">
    <svg
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      class="piano-svg"
    >
      <defs>
        <filter id="key-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bass-glow" x="-20%" y="-20%" width="140%" height="140%">
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

      <!-- Middle C reference (mobile only) -->
      <g v-if="isMobile" style="pointer-events:none">
        <!-- Dot below C4 when it's in the current viewport -->
        <template v-if="middleCInView">
          <circle
            :cx="C4_CENTER_X" :cy="WH - 10"
            r="3"
            fill="#C8A96E"
            opacity="0.38"
          />
        </template>
        <!-- Arrow at left edge when C4 is off-screen to the left -->
        <text
          v-else-if="middleCToLeft"
          :x="animatedViewBoxX + 5"
          :y="WH - 8"
          font-family="Space Grotesk, sans-serif"
          font-size="9"
          fill="#C8A96E"
          opacity="0.45"
          dominant-baseline="middle"
        >← C</text>
        <!-- Arrow at right edge when C4 is off-screen to the right -->
        <text
          v-else
          :x="animatedViewBoxX + MOBILE_VB_FULL_W - 32"
          :y="WH - 8"
          font-family="Space Grotesk, sans-serif"
          font-size="9"
          fill="#C8A96E"
          opacity="0.45"
          dominant-baseline="middle"
        >C →</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

// Always build both octaves so every voicing note (C3–B4) is rendered.
// Mobile uses a clipped viewBox to pan/zoom rather than omitting octave 3.
const octaves = [3, 4]
const SVG_W = 14 * PITCH - GAP + 1   // 391 — full two-octave width
const SVG_H = WH + 2                  // 102

// Mobile viewport: one octave of keys visible at a time
const MOBILE_VB_W      = 7 * PITCH - GAP + 1  // 195
const MOBILE_VB_FULL_W = MOBILE_VB_W + 12      // 207 (includes ±6 side padding)
const VB_MIN_X = -6
const VB_MAX_X = SVG_W + 6 - MOBILE_VB_FULL_W  // 190

// x-offset from octave start (C=0) for each note name in SVG units
const NOTE_OCT_X = {
  'C':  0,
  'C#': WW - BW / 2,
  'D':  PITCH,
  'D#': PITCH + WW - BW / 2,
  'E':  2 * PITCH,
  'F':  3 * PITCH,
  'F#': 3 * PITCH + WW - BW / 2,
  'G':  4 * PITCH,
  'G#': 4 * PITCH + WW - BW / 2,
  'A':  5 * PITCH,
  'A#': 5 * PITCH + WW - BW / 2,
  'B':  6 * PITCH,
}

// C4 reference — octave 4 starts at white-key-index 7
const C4_X        = 7 * PITCH       // 196
const C4_CENTER_X = C4_X + WW / 2   // 209

function noteToX(noteStr) {
  const m = noteStr.match(/^([A-G]#?)(\d)$/)
  if (!m) return 0
  const octOffset = (parseInt(m[2]) - 3) * 7 * PITCH  // oct3=0, oct4=196
  return octOffset + (NOTE_OCT_X[m[1]] ?? 0)
}

// ── Responsive ────────────────────────────────────────────────────────────────
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 600)
function onResize() { isMobile.value = window.innerWidth < 600 }
onMounted(async () => {
  window.addEventListener('resize', onResize)
  await nextTick()
  isMobile.value = window.innerWidth < 600
})

// ── Mobile viewport centering ─────────────────────────────────────────────────

// Target viewBox x: positions root note at ~1/3 from left of mobile viewport.
const mobileViewBoxX = computed(() => {
  if (!isMobile.value) return VB_MIN_X
  const v = getPianoVoicing(props.chordName)
  if (!v || !v.notes?.length) {
    // No chord: default to showing octave 4 (C4 at 1/3 from left)
    const fallback = C4_X - MOBILE_VB_W / 3 - 6
    return Math.max(VB_MIN_X, Math.min(fallback, VB_MAX_X))
  }
  const rootX = noteToX(v.notes[0])
  const target = rootX - MOBILE_VB_W / 3 - 6
  return Math.max(VB_MIN_X, Math.min(target, VB_MAX_X))
})

// Smoothly animated version of mobileViewBoxX (200 ms ease-out).
const animatedViewBoxX = ref(mobileViewBoxX.value)
let rafId = null

watch(mobileViewBoxX, (newTarget) => {
  if (rafId) cancelAnimationFrame(rafId)
  const startX = animatedViewBoxX.value
  if (Math.abs(startX - newTarget) < 0.5) {
    animatedViewBoxX.value = newTarget
    return
  }
  const t0 = performance.now()
  const DURATION = 200
  function step(now) {
    const t = Math.min((now - t0) / DURATION, 1)
    const ease = 1 - Math.pow(1 - t, 2)   // quadratic ease-out
    animatedViewBoxX.value = startX + (newTarget - startX) * ease
    if (t < 1) rafId = requestAnimationFrame(step)
    else rafId = null
  }
  rafId = requestAnimationFrame(step)
}, { immediate: true })

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (rafId) cancelAnimationFrame(rafId)
})

const viewBox = computed(() => {
  if (isMobile.value) {
    return `${animatedViewBoxX.value} -6 ${MOBILE_VB_FULL_W} ${SVG_H + 12}`
  }
  return `-6 -6 ${SVG_W + 12} ${SVG_H + 12}`
})

// ── Middle C reference indicators ─────────────────────────────────────────────
const middleCInView = computed(() => {
  if (!isMobile.value) return false
  const vx = animatedViewBoxX.value
  return C4_CENTER_X >= vx && C4_CENTER_X <= vx + MOBILE_VB_FULL_W
})
const middleCToLeft = computed(() => {
  if (!isMobile.value) return false
  return C4_CENTER_X < animatedViewBoxX.value
})

// ── Key geometry ──────────────────────────────────────────────────────────────
const WHITE_NAMES = ['C','D','E','F','G','A','B']
const BLACK_DEFS = [
  { after: 'C', name: 'C#' },
  { after: 'D', name: 'D#' },
  { after: 'F', name: 'F#' },
  { after: 'G', name: 'G#' },
  { after: 'A', name: 'A#' },
]

// Enharmonic aliases for lookup
const ENHARMONIC = {
  'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B',
  'E#':'F','B#':'C',
}

function normalizeNote(n) {
  const name = n.replace(/\d/,'')
  return ENHARMONIC[name] ?? name
}

const whiteKeys = computed(() => {
  const keys = []
  let xi = 0
  for (const oct of octaves) {
    for (const wn of WHITE_NAMES) {
      keys.push({ id: `${wn}${oct}`, name: wn, octave: oct, x: xi * PITCH, isWhite: true })
      xi++
    }
  }
  return keys
})

const blackKeys = computed(() => {
  const keys = []
  let wIdx = 0
  for (const oct of octaves) {
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
