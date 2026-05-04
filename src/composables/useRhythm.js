import * as Tone from 'tone'
import { ref, watch } from 'vue'

// ── Singleton state (persisted) ────────────────────────────────────────────────
const rhythmMode   = ref(localStorage.getItem('cadence_rhythm_mode')  || 'off')
const rhythmVolume = ref(Number(localStorage.getItem('cadence_rhythm_vol') ?? 70))
const swingAmount  = ref(Number(localStorage.getItem('cadence_swing_amt')  ?? 15))

watch(rhythmMode,   v => localStorage.setItem('cadence_rhythm_mode', v))
watch(rhythmVolume, v => localStorage.setItem('cadence_rhythm_vol', String(v)))
watch(swingAmount,  v => localStorage.setItem('cadence_swing_amt',  String(v)))

// ── Drum patterns ──────────────────────────────────────────────────────────────
// Arrays indexed 0..steps-1. Beat positions per preset:
//   whole (4n,4):  beat1=0, beat2=1, beat3=2, beat4=3
//   eighths (8n,8): beat1=0, beat2=2, beat3=4, beat4=6
//   triplets (8t,12): beat1=0, beat2=3, beat3=6, beat4=9
//   sixteenths (16n,16): beat1=0, beat2=4, beat3=8, beat4=12

const PATTERNS = {
  click: {
    whole:      { interval: '4n',  steps: 4  },
    eighths:    { interval: '8n',  steps: 8  },
    triplets:   { interval: '8t',  steps: 12 },
    sixteenths: { interval: '16n', steps: 16 },
  },

  acoustic: {
    whole: {
      interval: '4n', steps: 4,
      kick:    [1,0,1,0],
      snare:   [0,1,0,1],
      hat:     [1,0,0,0],
      hatOpen: [1,0,0,0],
    },
    eighths: {
      interval: '8n', steps: 8,
      kick:    [1,0,0,0, 1,0,0,0],
      snare:   [0,0,1,0, 0,0,1,0],
      hat:     [1,1,1,1, 1,1,1,1],
      hatOpen: [0,0,0,0, 0,0,0,0],
    },
    triplets: {
      interval: '8t', steps: 12,
      kick:    [1,0,0,0,0,0, 1,0,0,0,0,0],
      snare:   [0,0,0,1,0,0, 0,0,0,1,0,0],
      hat:     [1,1,1,1,1,1, 1,1,1,1,1,1],
      hatOpen: [0,0,0,0,0,0, 0,0,0,0,0,0],
    },
    sixteenths: {
      interval: '16n', steps: 16,
      kick:    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:     [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      hatOpen: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
  },

  hiphop: {
    whole: {
      interval: '4n', steps: 4,
      kick:    [1,0,1,0],
      snare:   [0,1,0,1],
      hat:     [1,0,1,0],
      hatOpen: [0,0,0,0],
    },
    eighths: {
      interval: '8n', steps: 8,
      kick:    [1,0,0,0, 0,1,0,0],
      snare:   [0,0,1,0, 0,0,0,1],
      hat:     [1,1,1,1, 1,1,1,1],
      hatOpen: [0,0,0,0, 1,0,0,0],
    },
    triplets: {
      interval: '8t', steps: 12,
      kick:    [1,0,0,0,0,0, 1,0,0,0,0,0],
      snare:   [0,0,0,1,0,0, 0,0,0,1,0,0],
      hat:     [1,1,1,1,1,1, 1,1,1,1,1,1],
      hatOpen: [0,0,0,0,0,0, 0,0,0,0,0,0],
    },
    sixteenths: {
      interval: '16n', steps: 16,
      kick:    [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,1,0,0],
      snare:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:     [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      hatOpen: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0],
    },
  },
}

// ── Tone.js nodes (lazy — created after AudioContext starts) ──────────────────
let _gainNode     = null  // master gain for all drum synths
let _clickSynth   = null  // MetalSynth — woodblock click
let _kickSynth    = null  // MembraneSynth — acoustic kick
let _808Synth     = null  // MembraneSynth — 808-style boom kick
let _snareSynth   = null  // NoiseSynth — snare
let _hihatSynth   = null  // MetalSynth — closed hi-hat
let _openHatSynth = null  // MetalSynth — open hi-hat
let _initialized  = false

function _init() {
  if (_initialized) return
  _initialized = true

  _gainNode = new Tone.Gain(rhythmVolume.value / 100 * 0.9).toDestination()

  _clickSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    harmonicity:     5.1,
    modulationIndex: 16,
    resonance:       3200,
    octaves:         0.5,
  }).connect(_gainNode)

  _kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves:    6,
    envelope:   { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
  }).connect(_gainNode)

  _808Synth = new Tone.MembraneSynth({
    pitchDecay: 0.18,
    octaves:    8,
    envelope:   { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 },
  }).connect(_gainNode)

  _snareSynth = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
  }).connect(_gainNode)

  _hihatSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    harmonicity:     5.1,
    modulationIndex: 32,
    resonance:       4000,
    octaves:         1.5,
  }).connect(_gainNode)

  _openHatSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.35, sustain: 0, release: 0.08 },
    harmonicity:     5.1,
    modulationIndex: 32,
    resonance:       4000,
    octaves:         1.5,
  }).connect(_gainNode)
}

watch(rhythmVolume, v => {
  if (_gainNode) _gainNode.gain.value = v / 100 * 0.9
})

// ── Sequencer state ────────────────────────────────────────────────────────────
let _drumStep       = 0
let _drumScheduleId = null

// ── Public API ────────────────────────────────────────────────────────────────

function startDrums(rhythmPreset) {
  if (rhythmMode.value === 'off') return
  _init()

  const mode = rhythmMode.value
  const pat  = PATTERNS[mode]?.[rhythmPreset]
  if (!pat) return

  _drumStep = 0

  _drumScheduleId = Tone.getTransport().scheduleRepeat((time) => {
    const step = _drumStep
    _drumStep  = (step + 1) % pat.steps

    const g = Math.min(1, rhythmVolume.value / 100)

    if (mode === 'click') {
      // Accent beat 1 (step 0), quieter on all other subdivisions
      const vel = step === 0 ? g : g * 0.55
      _clickSynth.triggerAttackRelease('32n', time, vel)
      return
    }

    // Hip-hop: swing even 16th-grid positions (odd step indices)
    let t = time
    if (mode === 'hiphop' && step % 2 === 1) {
      const stepSec = Tone.Time(pat.interval).toSeconds()
      t = time + (swingAmount.value / 100) * stepSec * 0.5
    }

    if (pat.kick[step]) {
      if (mode === 'hiphop') {
        _808Synth.triggerAttackRelease('C1', '8n', t, g)
      } else {
        _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.95)
      }
    }
    if (pat.snare[step]) {
      _snareSynth.triggerAttackRelease('16n', t, g * 0.85)
    }
    if (pat.hat?.[step]) {
      if (pat.hatOpen[step]) {
        _openHatSynth.triggerAttackRelease('8n', t, g * 0.6)
      } else {
        _hihatSynth.triggerAttackRelease('64n', t, mode === 'hiphop' ? g * 0.4 : g * 0.5)
      }
    }
  }, pat.interval)
}

function stopDrums() {
  if (_drumScheduleId !== null) {
    Tone.getTransport().clear(_drumScheduleId)
    _drumScheduleId = null
  }
  _drumStep = 0
}

function setRhythmVolume(v) { rhythmVolume.value = v }
function setSwingAmount(v)  { swingAmount.value  = v }

export function useRhythm() {
  return {
    rhythmMode, rhythmVolume, swingAmount,
    startDrums, stopDrums,
    setRhythmVolume, setSwingAmount,
  }
}
