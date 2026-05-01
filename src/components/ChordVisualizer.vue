<template>
  <div v-if="chordName" class="chord-viz" :class="compact ? 'chord-viz--compact' : 'chord-viz--full'">
    <!-- Header row -->
    <div class="cv-header">
      <div class="cv-header-left">
        <span class="cv-chord-name">{{ displayName }}</span>
        <span class="cv-tones">{{ toneString }}</span>
      </div>
      <v-icon size="16" color="medium-emphasis" class="cv-instrument-icon">
        {{ instrumentIcon }}
      </v-icon>
    </div>

    <!-- Guitar fretboard -->
    <GuitarFretboard
      v-if="showGuitar"
      :chord-name="chordName"
      :voicing-index="guitarVoicingIdx"
      :class="compact ? 'cv-compact-guitar' : 'cv-full-guitar'"
      @update:voicing-index="guitarVoicingIdx = $event"
    />

    <!-- Piano keyboard -->
    <PianoKeyboard
      v-if="showPiano"
      :chord-name="chordName"
      :show-labels="!compact"
      :class="compact ? 'cv-compact-piano' : 'cv-full-piano'"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import GuitarFretboard from './GuitarFretboard.vue'
import PianoKeyboard   from './PianoKeyboard.vue'
import { useAudio }    from '../composables/useAudio.js'
import { noteToSharp } from '../core/musicTheory.js'

const props = defineProps({
  chordName: { type: String,  default: '' },
  compact:   { type: Boolean, default: false },
})

const { activeInstrument } = useAudio()

const guitarVoicingIdx = ref(0)
watch(() => props.chordName, () => { guitarVoicingIdx.value = 0 })

const showGuitar = computed(() =>
  activeInstrument.value === 'guitar' || activeInstrument.value === 'both'
)
const showPiano = computed(() =>
  activeInstrument.value === 'piano' || activeInstrument.value === 'both'
)

const instrumentIcon = computed(() => {
  if (activeInstrument.value === 'guitar') return 'mdi-guitar-electric'
  if (activeInstrument.value === 'both')   return 'mdi-music'
  return 'mdi-piano'
})

// Display name (keep flat notation as-is)
const displayName = computed(() => props.chordName || '')

// Chord tones string
const CHROMATIC   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const toneString  = computed(() => {
  const c = props.chordName
  if (!c) return ''
  const sharp = noteToSharp(c)
  const m = sharp.match(/^([A-G]#?)(.*)$/)
  if (!m) return ''
  const ri  = CHROMATIC.indexOf(m[1])
  const suf = m[2]
  const ivs = suf === 'dim' ? [0,3,6] : suf === 'm' ? [0,3,7] : [0,4,7]
  return ivs.map(i => CHROMATIC[(ri + i) % 12]).join(' · ')
})
</script>

<style scoped>
.chord-viz {
  background: #1A1A1F;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 12px;
  margin: 0 auto;
}
.chord-viz--compact { max-width: 320px; }
.chord-viz--full    { max-width: 480px; }

.cv-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cv-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cv-chord-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #C8A96E;
  letter-spacing: -0.02em;
  line-height: 1;
}
.cv-tones {
  font-family: 'Space Grotesk', monospace;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.06em;
}
.cv-instrument-icon { margin-top: 2px; }

/* Size modifiers */
.cv-full-guitar  { margin-bottom: 12px; }
.cv-compact-guitar { transform: scale(0.9); transform-origin: top left; margin-bottom: 8px; }
.cv-full-piano  { }
.cv-compact-piano { opacity: 0.95; }
</style>
