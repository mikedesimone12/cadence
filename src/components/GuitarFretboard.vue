<template>
  <div class="fretboard-wrap">
    <div v-if="voicings.length > 1" class="carousel-row">
      <button class="carousel-btn" :disabled="localIdx === 0" @click="prev">‹</button>
      <span class="carousel-label">{{ currentVoicing?.label ?? '' }}</span>
      <span class="carousel-count">{{ localIdx + 1 }}/{{ voicings.length }}</span>
      <button class="carousel-btn" :disabled="localIdx >= voicings.length - 1" @click="next">›</button>
    </div>

    <svg
      :viewBox="`0 0 ${FB_W} ${FB_H}`"
      preserveAspectRatio="xMidYMid meet"
      class="fretboard-svg"
    >
      <defs>
        <filter id="fb-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Background -->
      <rect x="0" y="0" :width="FB_W" :height="FB_H" fill="#1A1A1F" rx="6"/>

      <!-- Fret position marker dots -->
      <g v-for="f in MARKER_FRETS" :key="'mk'+f">
        <template v-if="f >= viewFretStart && f <= viewFretEnd">
          <circle
            v-if="f !== 12"
            :cx="slotCenterX(f)"
            :cy="PT + STR_AREA + 14"
            r="4"
            fill="rgba(255,255,255,0.15)"
          />
          <template v-else>
            <circle :cx="slotCenterX(f) - 7" :cy="PT + STR_AREA + 14" r="4" fill="rgba(255,255,255,0.15)"/>
            <circle :cx="slotCenterX(f) + 7" :cy="PT + STR_AREA + 14" r="4" fill="rgba(255,255,255,0.15)"/>
          </template>
        </template>
      </g>

      <!-- Strings: si=0 is low E (bottom), si=5 is high e (top) -->
      <line
        v-for="si in 6" :key="'str'+si"
        :x1="PL" :y1="strY(si-1)"
        :x2="FB_W - PR" :y2="strY(si-1)"
        :stroke="`rgba(255,255,255,${0.25 + (si-1)*0.05})`"
        :stroke-width="0.8 + (si-1)*0.18"
      />

      <!-- Nut -->
      <rect
        v-if="viewFretStart === 0"
        :x="PL - 4" :y="PT"
        width="5" :height="STR_AREA"
        fill="rgba(255,255,255,0.85)"
        rx="1"
      />

      <!-- Fret position label when not starting at 0 -->
      <text
        v-if="viewFretStart > 0"
        :x="PL - 2" :y="PT - 5"
        text-anchor="middle"
        font-family="Space Grotesk,monospace"
        font-size="9"
        fill="rgba(255,255,255,0.4)"
      >{{ viewFretStart }}fr</text>

      <!-- Fret lines -->
      <line
        v-for="f in visibleFretLines" :key="'fl'+f"
        :x1="fretX(f)" :y1="PT"
        :x2="fretX(f)" :y2="PT + STR_AREA"
        stroke="rgba(255,255,255,0.2)"
        stroke-width="1"
      />

      <!-- Barre bar -->
      <rect
        v-if="barreInfo"
        :x="slotCenterX(barreInfo.fret) - 9"
        :y="strY(barreInfo.topSi) - 9"
        width="18"
        :height="strY(barreInfo.botSi) - strY(barreInfo.topSi) + 18"
        fill="#C8A96E"
        rx="9"
        opacity="0.85"
        filter="url(#fb-glow)"
      />

      <!-- Open/muted indicators (left side of nut) -->
      <g v-for="si in 6" :key="'ind'+(si-1)">
        <!-- Muted -->
        <text
          v-if="frets[si-1] === -1"
          :x="PL - 12"
          :y="strY(si-1) + 4"
          text-anchor="middle"
          font-family="sans-serif"
          font-size="12"
          font-weight="700"
          fill="#E8572A"
        >×</text>
        <!-- Open -->
        <circle
          v-else-if="frets[si-1] === 0"
          :cx="PL - 12"
          :cy="strY(si-1)"
          r="5"
          fill="none"
          stroke="#C8A96E"
          stroke-width="1.5"
        />
      </g>

      <!-- Finger dots -->
      <g v-for="si in 6" :key="'dt'+(si-1)">
        <g v-if="shouldDrawDot(si-1)">
          <circle
            :cx="slotCenterX(frets[si-1])"
            :cy="strY(si-1)"
            r="9"
            fill="#C8A96E"
            filter="url(#fb-glow)"
          />
          <text
            :x="slotCenterX(frets[si-1])"
            :y="strY(si-1) + 4"
            text-anchor="middle"
            font-family="Space Grotesk,sans-serif"
            font-size="8"
            font-weight="700"
            fill="#1A1A1F"
          >{{ noteAtFret(si-1, frets[si-1]) }}</text>
        </g>
      </g>

      <!-- String name labels (right side) -->
      <text
        v-for="(name, si) in STRING_LABELS" :key="'sn'+si"
        :x="FB_W - PR + 8"
        :y="strY(si) + 4"
        text-anchor="start"
        font-family="Space Grotesk,monospace"
        font-size="8"
        fill="rgba(255,255,255,0.3)"
      >{{ name }}</text>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getGuitarVoicings } from '../core/chordVoicings.js'
import { useAudio } from '../composables/useAudio.js'

const props = defineProps({
  chordName:    { type: String, default: '' },
  voicingIndex: { type: Number, default: 0  },
})
const emit = defineEmits(['update:voicingIndex'])

const { isLoaded, playNote } = useAudio()

// ── String definitions ─────────────────────────────────────────────────────────
// frets array order: [E2, A2, D3, G3, B3, e4]  si=0=E2, si=5=e4
// Display: si=0 (E2) at BOTTOM of SVG, si=5 (e4) at TOP
const STRING_LABELS = ['E','A','D','G','B','e']
// Semitone values (from C=0) for each string's open note
const STRING_SEMITONES = [4, 9, 2, 7, 11, 4]  // E, A, D, G, B, E
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const MARKER_FRETS = [3, 5, 7, 9, 12]

// ── Layout ────────────────────────────────────────────────────────────────────
const NUM_FRETS   = 5
const SS          = 26   // string spacing
const STR_AREA    = SS * 5
const PT          = 28   // padding top
const PL          = 28   // padding left
const PR          = 22   // padding right
const SLOT_W      = 36   // fret slot width
const FB_W        = PL + NUM_FRETS * SLOT_W + PR + 6
const FB_H        = PT + STR_AREA + 34

// si=0 is E2 (bottom), si=5 is e4 (top)
function strY(si) { return PT + (5 - si) * SS }

function fretX(f) {
  // x of fret line at absolute fret f, within the current view window
  return PL + (f - viewFretStart.value) * SLOT_W
}

function slotCenterX(f) {
  return fretX(f) - SLOT_W / 2
}

function noteAtFret(si, fret) {
  return CHROMATIC[(STRING_SEMITONES[si] + fret) % 12]
}

// ── Voicings ──────────────────────────────────────────────────────────────────
const voicings   = computed(() => getGuitarVoicings(props.chordName))
const localIdx   = ref(0)

watch(() => props.chordName, () => { localIdx.value = 0 })
watch(() => props.voicingIndex, v => { localIdx.value = v ?? 0 })

const currentVoicing = computed(() => voicings.value[localIdx.value] ?? null)
const frets = computed(() => currentVoicing.value?.frets ?? [-1,-1,-1,-1,-1,-1])

function prev() {
  if (localIdx.value > 0) { localIdx.value--; emit('update:voicingIndex', localIdx.value) }
}
function next() {
  if (localIdx.value < voicings.value.length - 1) { localIdx.value++; emit('update:voicingIndex', localIdx.value) }
}

// ── View window ───────────────────────────────────────────────────────────────
const playedFrets = computed(() => frets.value.filter(f => f > 0))

const viewFretStart = computed(() => {
  if (!playedFrets.value.length) return 0
  const minF = Math.min(...playedFrets.value)
  if (minF <= 3) return 0
  return minF - 1
})

const viewFretEnd = computed(() => viewFretStart.value + NUM_FRETS)

const visibleFretLines = computed(() => {
  const lines = []
  for (let f = viewFretStart.value + 1; f <= viewFretEnd.value; f++) lines.push(f)
  return lines
})

// ── Barre detection ───────────────────────────────────────────────────────────
const barreInfo = computed(() => {
  if (!playedFrets.value.length) return null
  const minF = Math.min(...playedFrets.value)
  if (minF <= 0) return null
  const barreStrings = frets.value
    .map((f, si) => ({ f, si }))
    .filter(({ f }) => f === minF)
  if (barreStrings.length < 4) return null
  return {
    fret:  minF,
    topSi: barreStrings[barreStrings.length - 1].si,  // highest si = top of diagram
    botSi: barreStrings[0].si,
  }
})

function isBarreStringAt(si) {
  if (!barreInfo.value) return false
  return frets.value[si] === barreInfo.value.fret
}

function shouldDrawDot(si) {
  const f = frets.value[si]
  if (f <= 0) return false
  if (isBarreStringAt(si)) return false  // barre bar covers these
  return f >= viewFretStart.value && f <= viewFretEnd.value
}
</script>

<style scoped>
.fretboard-wrap {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}
.fretboard-svg {
  width: 100%;
  height: auto;
  max-height: 220px;
  display: block;
}
@media (max-width: 599px) {
  .fretboard-wrap { max-width: 100%; }
}

.carousel-row {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; margin-bottom: 6px;
}
.carousel-btn {
  background: rgba(200,169,110,0.15);
  border: 1px solid rgba(200,169,110,0.3);
  color: #C8A96E; border-radius: 6px;
  width: 28px; height: 28px; font-size: 1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.carousel-btn:disabled { opacity: 0.3; cursor: default; }
.carousel-btn:not(:disabled):hover { background: rgba(200,169,110,0.3); }
.carousel-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem; font-weight: 600;
  color: rgba(255,255,255,0.75);
  min-width: 48px; text-align: center;
}
.carousel-count { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
</style>
