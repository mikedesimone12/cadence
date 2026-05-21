import * as Tone from 'tone'
import { ref, watch } from 'vue'
import { getPercussionPlayer } from './useAudio.js'

// ── Singleton state (persisted) ────────────────────────────────────────────────
const rhythmMode   = ref(localStorage.getItem('cadence_rhythm_mode')  || 'off')
const rhythmVolume = ref(Number(localStorage.getItem('cadence_rhythm_vol') ?? 70))
const swingAmount  = ref(Number(localStorage.getItem('cadence_swing_amt')  ?? 15))

watch(rhythmMode,   v => localStorage.setItem('cadence_rhythm_mode', v))
watch(rhythmVolume, v => localStorage.setItem('cadence_rhythm_vol', String(v)))
watch(swingAmount,  v => localStorage.setItem('cadence_swing_amt',  String(v)))

// ── General MIDI percussion note names ────────────────────────────────────────
// Each constant is the note name that maps to the given GM percussion MIDI pitch.
// Formula: octave = floor(midi/12) - 1, semitone = midi % 12 → note letter.
const PERC = {
  KICK:       'B1',   // MIDI 35 — Acoustic Bass Drum
  SIDE_STICK: 'C#2',  // MIDI 37 — Side Stick (bossa rim click)
  SNARE:      'D2',   // MIDI 38 — Acoustic Snare
  CLAP:       'D#2',  // MIDI 39 — Hand Clap (hip-hop)
  CLOSED_HAT: 'F#2',  // MIDI 42 — Closed Hi-Hat
  OPEN_HAT:   'A#2',  // MIDI 46 — Open Hi-Hat
  CRASH:      'C#3',  // MIDI 49 — Crash Cymbal 1
  RIDE:       'D#3',  // MIDI 51 — Ride Cymbal 1
  WOODBLOCK:  'E5',   // MIDI 76 — High Wood Block (click track accent)
}

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

// ── Tone.js synth nodes ───────────────────────────────────────────────────────
// Lazy-initialized after AudioContext starts. Used as fallback when the
// percussion soundfont hasn't loaded (network failure, slow CDN, etc).
let _gainNode     = null  // master gain for all synth drums
let _reverb       = null  // Freeverb — room ambience (acoustic mode only)
let _clickSynth   = null  // MetalSynth fallback for click track
let _kickSynth    = null  // MembraneSynth fallback for kick
let _808Synth     = null  // MembraneSynth — 808 hip-hop kick (always synth by design)
let _snareSynth   = null  // NoiseSynth fallback for snare
let _hihatSynth   = null  // MetalSynth fallback for closed hat
let _openHatSynth = null  // MetalSynth fallback for open hat
let _rideSynth      = null  // MetalSynth fallback for jazz ride
let _rimSynth       = null  // NoiseSynth fallback for bossa rim
let _rockKickSynth  = null  // MembraneSynth fallback for rock kick
let _rockSnareSynth = null  // NoiseSynth fallback for rock snare
let _crashSynth     = null  // MetalSynth fallback for rock crash
let _initialized    = false

function _init() {
  if (_initialized) return
  _initialized = true

  _reverb   = new Tone.Freeverb({ roomSize: 0.5, dampening: 4000 })
  _reverb.wet.value = 0
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

  _kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.09,
    octaves:    5,
    envelope:   { attack: 0.001, decay: 0.38, sustain: 0, release: 0.12 },
  }).connect(_gainNode)

  // 808 kick is always synthesized — the Roland TR-808 IS a synth drum.
  // Tuned to 60Hz for deep sub-bass; tighter sweep (5 oct) than old 8-oct setting.
  _808Synth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves:    5,
    envelope:   { attack: 0.001, decay: 0.4, sustain: 0, release: 0.5 },
  }).connect(_gainNode)

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

  _rideSynth = new Tone.MetalSynth({
    frequency:       600,
    envelope:        { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
    harmonicity:     5.1,
    modulationIndex: 16,
    resonance:       3500,
    octaves:         1.0,
  }).connect(_gainNode)

  _rimSynth = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
  }).connect(_gainNode)

  _rockKickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves:    6,
    envelope:   { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
  }).connect(_gainNode)

  _rockSnareSynth = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.10, sustain: 0, release: 0.03 },
  }).connect(_gainNode)

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

// ── Percussion sample helper ──────────────────────────────────────────────────
// Plays a GM percussion sample if the soundfont loaded; returns false so the
// caller can trigger a synth fallback instead.
function _perc(note, time, vel) {
  const player = getPercussionPlayer()
  if (!player) return false
  player.play(note, time, { gain: Math.max(0, Math.min(1, vel)) })
  return true
}

// ── Sequencer state ────────────────────────────────────────────────────────────
let _drumStep       = 0
let _drumScheduleId = null

// ── Public API ────────────────────────────────────────────────────────────────

function startDrums(rhythmPreset) {
  if (rhythmMode.value === 'off') return
  _init()

  const mode      = rhythmMode.value
  const transport = Tone.getTransport()

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

  // Rock: one-shot crash cymbal fires at pattern downbeat
  if (mode === 'rock') {
    const g = Math.min(1, rhythmVolume.value / 100)
    transport.schedule((time) => {
      if (!_perc(PERC.CRASH, time, g * 0.8)) {
        _crashSynth.triggerAttackRelease(300, '2n', time, g * 0.3)
      }
    }, 0)
  }

  _drumStep = 0

  _drumScheduleId = transport.scheduleRepeat((time) => {
    const step = _drumStep
    _drumStep  = (step + 1) % pat.steps

    const g = Math.min(1, rhythmVolume.value / 100)

    // ── Click track — woodblock sample, accented beat 1 ─────────────────────
    if (mode === 'click') {
      const vel = step === 0 ? g : g * 0.6
      if (!_perc(PERC.WOODBLOCK, time, vel)) {
        _clickSynth.triggerAttackRelease(400, '32n', time, vel)
      }
      return
    }

    let t = time

    // Hip-hop: manual swing delay on odd 16th steps
    if (mode === 'hiphop' && step % 2 === 1) {
      const stepSec = Tone.Time(pat.interval).toSeconds()
      t = time + (swingAmount.value / 100) * stepSec * 0.5
    }

    // Funk: fixed ~17% swing on off-beat 16ths for that loose pocket feel
    if (mode === 'funk' && step % 2 === 1) {
      const stepSec = Tone.Time(pat.interval).toSeconds()
      t = time + 0.17 * stepSec * 0.5
    }

    // ── Jazz / Swing ─────────────────────────────────────────────────────────
    if (mode === 'swing') {
      if (pat.ride[step])  { if (!_perc(PERC.RIDE,       time, g * 0.4))  _rideSynth.triggerAttackRelease(800, '16n', time, g * 0.4) }
      if (pat.hat[step])   { if (!_perc(PERC.OPEN_HAT,   time, g * 0.45)) _openHatSynth.triggerAttackRelease(400, '8n', time, g * 0.45) }
      if (pat.kick[step])  { if (!_perc(PERC.KICK,       time, g * 0.55)) _kickSynth.triggerAttackRelease('C1', '8n', time, g * 0.55) }
      if (pat.snare[step]) { if (!_perc(PERC.SNARE,      time, g * 0.5))  _snareSynth.triggerAttackRelease('16n', time, g * 0.5) }
      return
    }

    // ── Bossa nova ───────────────────────────────────────────────────────────
    if (mode === 'bossa') {
      if (pat.rim[step]) { if (!_perc(PERC.SIDE_STICK, t, g * 0.62)) _rimSynth.triggerAttackRelease('32n', t, g * 0.62) }
      if (pat.hat[step]) { if (!_perc(PERC.CLOSED_HAT, t, g * 0.2))  _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.2) }
      return
    }

    // ── Four on the floor ────────────────────────────────────────────────────
    if (mode === 'fourOnFloor') {
      if (pat.kick[step])  { if (!_perc(PERC.KICK,       t, g * 0.95)) _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.95) }
      if (pat.snare[step]) { if (!_perc(PERC.SNARE,      t, g * 0.82)) _snareSynth.triggerAttackRelease('16n', t, g * 0.82) }
      if (pat.hat[step])   { if (!_perc(PERC.CLOSED_HAT, t, g * 0.45)) _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.45) }
      return
    }

    // ── Funk (ghost notes use fractional velocities from pattern array) ───────
    if (mode === 'funk') {
      if (pat.kick[step]) {
        const kv = g * 0.9 * pat.kick[step]
        if (!_perc(PERC.KICK, t, kv)) _kickSynth.triggerAttackRelease('C1', '8n', t, kv)
      }
      if (pat.snare[step]) {
        const sv = g * 0.85 * pat.snare[step]
        if (!_perc(PERC.SNARE, t, sv)) _snareSynth.triggerAttackRelease('16n', t, sv)
      }
      if (pat.hat[step]) {
        const hv = g * 0.55 * pat.hat[step]
        if (!_perc(PERC.CLOSED_HAT, t, hv)) _hihatSynth.triggerAttackRelease(400, '64n', t, hv)
      }
      return
    }

    // ── Simple (kick + snare only, no hats) ──────────────────────────────────
    if (mode === 'simple') {
      if (pat.kick[step])  { if (!_perc(PERC.KICK,  t, g * 0.8)) _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.8) }
      if (pat.snare[step]) { if (!_perc(PERC.SNARE, t, g * 0.7)) _snareSynth.triggerAttackRelease('16n', t, g * 0.7) }
      return
    }

    // ── Rock ─────────────────────────────────────────────────────────────────
    if (mode === 'rock') {
      if (pat.kick[step])  { if (!_perc(PERC.KICK,       t, g * 1.0)) _rockKickSynth.triggerAttackRelease('C1', '8n', t, g * 1.0) }
      if (pat.snare[step]) { if (!_perc(PERC.SNARE,      t, g * 0.9)) _rockSnareSynth.triggerAttackRelease('16n', t, g * 0.9) }
      if (pat.hat[step])   { if (!_perc(PERC.CLOSED_HAT, t, g * 0.5)) _hihatSynth.triggerAttackRelease(400, '64n', t, g * 0.5) }
      return
    }

    // ── Acoustic / Hip-hop ───────────────────────────────────────────────────
    if (pat.kick[step]) {
      if (mode === 'hiphop') {
        // 808 kick is always synthesized — authentic to the hardware it emulates
        _808Synth.triggerAttackRelease(60, '8n', t, g)
      } else {
        if (!_perc(PERC.KICK, t, g * 0.95)) _kickSynth.triggerAttackRelease('C1', '8n', t, g * 0.95)
      }
    }

    if (pat.snare[step]) {
      if (mode === 'hiphop') {
        // Hip-hop snare → hand clap sample for that sharp crack
        if (!_perc(PERC.CLAP, t, g * 0.85)) _snareSynth.triggerAttackRelease('16n', t, g * 0.85)
      } else {
        if (!_perc(PERC.SNARE, t, g * 0.85)) _snareSynth.triggerAttackRelease('16n', t, g * 0.85)
      }
    }

    if (pat.hat?.[step]) {
      if (pat.hatOpen[step]) {
        const ov = mode === 'hiphop' ? g * 0.5 : g * 0.6
        if (!_perc(PERC.OPEN_HAT, t, ov)) _openHatSynth.triggerAttackRelease(400, '8n', t, ov)
      } else {
        const cv = mode === 'hiphop' ? g * 0.4 : g * 0.5
        if (!_perc(PERC.CLOSED_HAT, t, cv)) _hihatSynth.triggerAttackRelease(400, '64n', t, cv)
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
