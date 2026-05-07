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
      hat:     [1,1,1,1],
      hatOpen: [0,0,0,0],
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

  simple: {
    whole: {
      interval: '4n', steps: 4,
      kick:    [1,0,1,0],
      snare:   [0,1,0,1],
      hat:     [0,0,0,0],
      hatOpen: [0,0,0,0],
    },
    eighths: {
      interval: '8n', steps: 8,
      kick:    [1,0,0,0, 1,0,0,0],
      snare:   [0,0,1,0, 0,0,1,0],
      hat:     [0,0,0,0, 0,0,0,0],
      hatOpen: [0,0,0,0, 0,0,0,0],
    },
    triplets: {
      interval: '8t', steps: 12,
      kick:    [1,0,0,0,0,0, 1,0,0,0,0,0],
      snare:   [0,0,0,1,0,0, 0,0,0,1,0,0],
      hat:     [0,0,0,0,0,0, 0,0,0,0,0,0],
      hatOpen: [0,0,0,0,0,0, 0,0,0,0,0,0],
    },
    sixteenths: {
      interval: '16n', steps: 16,
      kick:    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
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

// ── Fixed patterns (not split by rhythmPreset; always 16n or 8n) ──────────────
// Array values: 0=off, 1=full velocity, 0.0–1.0=fractional velocity (ghost notes)
const FIXED_PATTERNS = {
  // Disco/house/EDM: kick every quarter, snare on 2&4, eighth-note hats
  fourOnFloor: {
    interval: '16n', steps: 16,
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  // James Brown feel: syncopated kick, ghost snares, 16th-note hats
  funk: {
    interval: '16n', steps: 16,
    kick:  [1,0,0,0,  0,0,1,0,  1,0,0,0,  0,0,0,0],
    snare: [0,0,0,0.3, 1,0.3,0,0, 0,0,0,0.3, 1,0.3,0,0],
    hat:   [1,0.65,0.85,0.65, 1,0.65,0.85,0.65, 1,0.65,0.85,0.65, 1,0.65,0.85,0.65],
  },
  // Jazz/swing: ride on swing 8ths (Transport.swing=0.5), foot hat on 2&4
  swing: {
    interval: '8n', steps: 8,
    ride:  [1,1,1,1, 1,1,1,1],
    hat:   [0,0,1,0, 0,0,1,0],
    kick:  [1,0,0,0, 0,0,0,0],
    snare: [0,0,1,0, 0,0,1,0],
  },
  // Bossa nova: clave-inspired rim click, subtle quarter-note hat, no kick
  bossa: {
    interval: '16n', steps: 16,
    rim: [1,0,1,0, 0,0,0,0, 1,0,1,0, 1,0,0,0],
    hat: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  // Rock: heavy kick on 1&3, hard snare on 2&4, machine-tight 8th-note hats
  rock: {
    interval: '16n', steps: 16,
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
}

const FIXED_MODES = new Set(['fourOnFloor', 'funk', 'swing', 'bossa', 'rock'])

// ── Tone.js nodes (lazy — created after AudioContext starts) ──────────────────
let _gainNode     = null  // master gain for all drum synths
let _reverb       = null  // Freeverb — room ambience (acoustic mode only)
let _clickSynth   = null  // MetalSynth — woodblock click
let _kickSynth    = null  // MembraneSynth — acoustic kick
let _808Synth     = null  // MembraneSynth — 808-style boom kick
let _snareSynth   = null  // NoiseSynth — snare
let _hihatSynth   = null  // MetalSynth — closed hi-hat
let _openHatSynth = null  // MetalSynth — open hi-hat
let _rideSynth      = null  // MetalSynth — jazz ride cymbal
let _rimSynth       = null  // NoiseSynth — bossa rim click
let _rockKickSynth  = null  // MembraneSynth — rock kick (heavier, wider sweep)
let _rockSnareSynth = null  // NoiseSynth — rock snare (white noise, hard crack)
let _crashSynth     = null  // MetalSynth — rock crash cymbal (one-shot on start)
let _initialized    = false

function _init() {
  if (_initialized) return
  _initialized = true

  // Route all synths through the reverb so acoustic mode can enable room tail
  _reverb   = new Tone.Freeverb({ roomSize: 0.5, dampening: 4000 })
  _reverb.wet.value = 0  // off until acoustic mode starts
  _reverb.toDestination()

  _gainNode = new Tone.Gain(rhythmVolume.value / 100 * 0.9).connect(_reverb)

  _clickSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    harmonicity:     5.1,
    modulationIndex: 16,
    resonance:       3200,
    octaves:         0.5,
  }).connect(_gainNode)

  // Roomy kick: longer pitch decay and envelope give more "thud" and body
  _kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.09,
    octaves:    5,
    envelope:   { attack: 0.001, decay: 0.38, sustain: 0, release: 0.12 },
  }).connect(_gainNode)

  _808Synth = new Tone.MembraneSynth({
    pitchDecay: 0.18,
    octaves:    8,
    envelope:   { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 },
  }).connect(_gainNode)

  // Pink noise sounds more natural than white for a room snare
  _snareSynth = new Tone.NoiseSynth({
    noise:    { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.06 },
  }).connect(_gainNode)

  _hihatSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
    harmonicity:     5.1,
    modulationIndex: 32,
    resonance:       4000,
    octaves:         1.5,
  }).connect(_gainNode)

  _openHatSynth = new Tone.MetalSynth({
    frequency:       400,
    envelope:        { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    harmonicity:     5.1,
    modulationIndex: 32,
    resonance:       4000,
    octaves:         1.5,
  }).connect(_gainNode)

  // Jazz ride: higher pitch, longer shimmer, lower volume
  _rideSynth = new Tone.MetalSynth({
    frequency:       600,
    envelope:        { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
    harmonicity:     5.1,
    modulationIndex: 16,
    resonance:       3500,
    octaves:         1.0,
  }).connect(_gainNode)

  // Bossa rim click: white noise, extremely short envelope
  _rimSynth = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
  }).connect(_gainNode)

  // Rock kick: wider pitch sweep (6 oct vs acoustic's 5), slightly shorter decay
  _rockKickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves:    6,
    envelope:   { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
  }).connect(_gainNode)

  // Rock snare: white noise (brighter than pink), short hard crack
  _rockSnareSynth = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.10, sustain: 0, release: 0.03 },
  }).connect(_gainNode)

  // Rock crash: bright MetalSynth, long release, fired once at pattern start
  _crashSynth = new Tone.MetalSynth({
    frequency:       300,
    envelope:        { attack: 0.001, decay: 0.8, sustain: 0, release: 0.5 },
    harmonicity:     5.1,
    modulationIndex: 16,
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

  const mode      = rhythmMode.value
  const transport = Tone.getTransport()

  // Jazz swing uses Transport-level swing so every scheduled 8n event gets it
  if (mode === 'swing') {
    transport.swing = 0.5
    transport.swingSubdivision = '8n'
  } else {
    transport.swing = 0
  }

  const pat = FIXED_MODES.has(mode)
    ? FIXED_PATTERNS[mode]
    : PATTERNS[mode]?.[rhythmPreset]
  if (!pat) return

  if (_reverb) _reverb.wet.value = mode === 'acoustic' ? 0.22 : 0

  // Rock: fire crash cymbal once at transport time 0 (pattern downbeat)
  if (mode === 'rock') {
    const crashVel = Math.min(1, rhythmVolume.value / 100) * 0.3
    transport.schedule((time) => {
      _crashSynth.triggerAttackRelease(300, '2n', time, crashVel)
    }, 0)
  }

  _drumStep = 0

  _drumScheduleId = transport.scheduleRepeat((time) => {
    const step = _drumStep
    _drumStep  = (step + 1) % pat.steps

    const g = Math.min(1, rhythmVolume.value / 100)

    if (mode === 'click') {
      const vel = step === 0 ? g : g * 0.55
      _clickSynth.triggerAttackRelease(400, '32n', time, vel)
      return
    }

    let t = time

    // Hip-hop: manual swing on odd 16th steps
    if (mode === 'hiphop' && step % 2 === 1) {
      const stepSec = Tone.Time(pat.interval).toSeconds()
      t = time + (swingAmount.value / 100) * stepSec * 0.5
    }

    // Funk: fixed ~17% swing on off-beat 16ths for that loose pocket feel
    if (mode === 'funk' && step % 2 === 1) {
      const stepSec = Tone.Time(pat.interval).toSeconds()
      t = time + 0.17 * stepSec * 0.5
    }

    if (mode === 'swing') {
      if (pat.ride[step])  _rideSynth.triggerAttackRelease(800, '16n', time, g * 0.4)
      if (pat.hat[step])   _openHatSynth.triggerAttackRelease(400, '8n', time, g * 0.45)
      if (pat.kick[step])  _kickSynth.triggerAttackRelease('C1', '8n', time, g * 0.55)
      if (pat.snare[step]) _snareSynth.triggerAttackRelease('16n', time, g * 0.5)
      return
    }

    if (mode === 'bossa') {
      if (pat.rim[step]) _rimSynth.triggerAttackRelease('32n', t, g * 0.62)
      if (pat.hat[step]) _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.2)
      return
    }

    if (mode === 'fourOnFloor') {
      if (pat.kick[step])  _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.95)
      if (pat.snare[step]) _snareSynth.triggerAttackRelease('16n', t, g * 0.82)
      if (pat.hat[step])   _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.45)
      return
    }

    if (mode === 'funk') {
      if (pat.kick[step])  _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.9 * pat.kick[step])
      if (pat.snare[step]) _snareSynth.triggerAttackRelease('16n', t, g * 0.85 * pat.snare[step])
      if (pat.hat[step])   _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.55 * pat.hat[step])
      return
    }

    if (mode === 'simple') {
      if (pat.kick[step])  _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.8)
      if (pat.snare[step]) _snareSynth.triggerAttackRelease('16n', t, g * 0.7)
      return
    }

    if (mode === 'rock') {
      if (pat.kick[step])  _rockKickSynth.triggerAttackRelease('C1', '8n', t, g * 1.0)
      if (pat.snare[step]) _rockSnareSynth.triggerAttackRelease('16n', t, g * 0.9)
      if (pat.hat[step])   _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.5)
      return
    }

    // acoustic / hiphop
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
        _openHatSynth.triggerAttackRelease(400, '8n', t, g * 0.6)
      } else {
        _hihatSynth.triggerAttackRelease(400, '64n', t, mode === 'hiphop' ? g * 0.4 : g * 0.5)
      }
    }
  }, pat.interval)
}

function stopDrums() {
  if (_drumScheduleId !== null) {
    Tone.getTransport().clear(_drumScheduleId)
    _drumScheduleId = null
  }
  Tone.getTransport().swing = 0
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
