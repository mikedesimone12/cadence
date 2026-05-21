import { ref, watch } from 'vue'
import * as Tone from 'tone'

// ── Singleton state ────────────────────────────────────────────────────────────
const VALID_MODES = new Set(['off', 'click', 'simple', 'swing', 'bossa', 'funk', 'hiphop'])
const _storedMode = localStorage.getItem('cadence_rhythm_mode') || 'off'
const rhythmMode   = ref(VALID_MODES.has(_storedMode) ? _storedMode : 'off')
const rhythmVolume = ref(Number(localStorage.getItem('cadence_rhythm_vol') ?? 70))

watch(rhythmMode,   v => localStorage.setItem('cadence_rhythm_mode', v))
watch(rhythmVolume, v => localStorage.setItem('cadence_rhythm_vol', String(v)))

const drumsReady = ref(false)

// ── 16-step drum patterns ──────────────────────────────────────────────────────
// Values: 0 = silent, 1 = full velocity, 0.0–1.0 = fractional (ghost notes)
const PATTERNS = {
  click: {
    hihat: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  simple: {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  },
  hiphop: {
    kick:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  },
  funk: {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    ghost: [0,0.25,0,0.25, 0,0.25,0,0.25, 0,0.25,0,0.25, 0,0.25,0,0.25],
    hihat: [1,0.5,0.85,0.5, 1,0.5,0.85,0.5, 1,0.5,0.85,0.5, 1,0.5,0.85,0.5],
  },
  swing: {
    ride:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],  // swung 8ths (Transport.swing)
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],  // foot hat: beat 4 "and"
    kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // soft kick: beat 1
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],  // brush snare: 2+4
  },
  bossa: {
    clave: [1,0,0,0, 0,0,1,0, 0,0,1,0, 1,0,1,0],  // 3-2 son clave
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],  // 16th shaker
    kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // beat 1 only
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],  // beats 2+4
    rim:   [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // subtle offbeat rim texture
  },
}

// ── Velocity config per preset ─────────────────────────────────────────────────
const VEL = {
  simple:  { kick: 0.85, snare: 0.7 },
  hiphop:  { kick: 0.9,  snare: 0.8,  hihat: 0.35 },
  funk:    { kick: 0.75, snare: 0.85, hihat: 0.55 },
  swing:   { ride: 0.5,  hihat: 0.35, kick: 0.4,  snare: 0.45 },
  bossa:   { clave: 0.6, hihat: 0.20, kick: 0.45, snare: 0.3 },
}

// ── Master gain ────────────────────────────────────────────────────────────────
let _masterGain = null
let _gainInited = false

function _initGain() {
  if (_gainInited) return
  _gainInited = true
  const ctx = Tone.getContext().rawContext
  _masterGain = ctx.createGain()
  _masterGain.gain.value = rhythmVolume.value / 100 * 0.9
  _masterGain.connect(ctx.destination)
}

watch(rhythmVolume, v => {
  if (_masterGain) _masterGain.gain.value = v / 100 * 0.9
})

// ── Buffer playback ─────────────────────────────────────────────────────────────
// Fresh BufferSourceNode per hit — polyphonic, per-hit velocity and pitch.
function _playBuffer(buffer, when, velocity, rate = 1.0) {
  if (!buffer || !_masterGain) return
  const ctx = Tone.getContext().rawContext
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = rate
  const gain = ctx.createGain()
  gain.gain.value = Math.max(0, Math.min(1.5, velocity))
  source.connect(gain)
  gain.connect(_masterGain)
  source.start(Math.max(ctx.currentTime + 0.001, when))
}

// ── Drum buffers ───────────────────────────────────────────────────────────────
let _drumBuffers = {}
let _loadPromise = null

// ── Public: initialize ─────────────────────────────────────────────────────────
// Pure file loading — no Tone.Offline. Tone.Offline swaps the global context
// and interferes with Tone.loaded(), so all synthesis is sample-based only.
async function initDrums() {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    _initGain()
    try {
      const p = {
        kick:    new Tone.Player('/sounds/drums/kick.mp3'),
        snare:   new Tone.Player('/sounds/drums/snare.mp3'),
        hihat:   new Tone.Player('/sounds/drums/hihat.mp3'),
        hihat2:  new Tone.Player('/sounds/drums/hihat2.mp3'),
        openhat: new Tone.Player('/sounds/drums/openhat.mp3'),
        clap:    new Tone.Player('/sounds/drums/clap.mp3'),
        ride:    new Tone.Player('/sounds/drums/ride.mp3'),
        crash:   new Tone.Player('/sounds/drums/crash.mp3'),
      }
      await Tone.loaded()
      _drumBuffers = {
        kick:      p.kick.buffer.get(),
        kick808:   p.kick.buffer.get(),
        snare:     p.snare.buffer.get(),
        hatCl:     p.hihat.buffer.get(),
        hatCl2:    p.hihat2.buffer.get(),
        hatOp:     p.openhat.buffer.get(),
        clap:      p.clap.buffer.get(),
        ride:      p.ride.buffer.get(),
        crash:     p.crash.buffer.get(),
        woodblock: p.hihat.buffer.get(),
      }
      Object.values(p).forEach(pl => pl.dispose())
      drumsReady.value = true
    } catch (err) {
      console.warn('[Cadence Audio] Drums failed:', err)
      drumsReady.value = false
    }
  })()
  return _loadPromise
}

// ── drumTick — called by the master loop in Play.vue ──────────────────────────
// time:  WebAudio context time (same `time` from Transport.scheduleRepeat)
// step:  0-based step index (0–15 for 16n, 0–11 for 8t/triplet)
// _bar:  bars elapsed — unused but kept for stable call signature
function drumTick(time, step, _bar) {
  const mode = rhythmMode.value
  if (mode === 'off' || !drumsReady.value) return

  const g   = rhythmVolume.value / 100
  const pat = PATTERNS[mode]
  const vel = VEL[mode] || {}
  const idx = step % 16

  // ── Click / metronome — woodblock (hihat sample), beat 1 accented ───────────
  if (mode === 'click') {
    if (PATTERNS.click.hihat[idx]) {
      _playBuffer(_drumBuffers.woodblock, time, g * (idx === 0 ? 0.9 : 0.6))
    }
    return
  }

  if (!pat) return

  // ── Swing — open hat for cymbal feel, soft brush snare ───────────────────
  if (mode === 'swing') {
    if (pat.ride?.[idx])  _playBuffer(_drumBuffers.hatOp, time, g * vel.ride  * 0.7)
    if (pat.hihat?.[idx]) _playBuffer(_drumBuffers.hatOp, time, g * vel.hihat)
    if (pat.kick?.[idx])  _playBuffer(_drumBuffers.kick,  time, g * vel.kick)
    if (pat.snare?.[idx]) _playBuffer(_drumBuffers.snare, time, g * vel.snare * 0.6)
    return
  }

  // ── Bossa nova — crash accent on beat 1, rim texture on offbeats ─────────
  if (mode === 'bossa') {
    if (_drumBuffers.crash && idx === 0) _playBuffer(_drumBuffers.crash, time, g * 0.15)
    if (pat.clave?.[idx])   _playBuffer(_drumBuffers.woodblock, time, g * vel.clave)
    if (pat.hihat?.[idx])   _playBuffer(_drumBuffers.hatCl,     time, g * vel.hihat)
    if (pat.kick?.[idx])    _playBuffer(_drumBuffers.kick,      time, g * vel.kick)
    if (pat.snare?.[idx])   _playBuffer(_drumBuffers.snare,     time, g * vel.snare)
    if (pat.rim?.[idx])     _playBuffer(_drumBuffers.snare,     time, g * 0.18)
    return
  }

  // ── Hip-Hop — 808 kick at 0.6x pitch, tight electronic hat ──────────────
  if (mode === 'hiphop') {
    if (pat.kick?.[idx])  _playBuffer(_drumBuffers.kick808, time, g * vel.kick * 1.4, 0.6)
    if (pat.snare?.[idx]) _playBuffer(_drumBuffers.clap,    time, g * vel.snare)
    if (pat.hihat?.[idx]) _playBuffer(_drumBuffers.hatCl2,  time, g * vel.hihat)
    return
  }

  // ── Funk — ghost snares, accented hats ───────────────────────────────────
  if (mode === 'funk') {
    const kv = pat.kick?.[idx]
    const sv = pat.snare?.[idx]
    const gv = pat.ghost?.[idx]
    const hv = pat.hihat?.[idx]
    if (kv) _playBuffer(_drumBuffers.kick,  time, g * vel.kick  * kv)
    if (sv) _playBuffer(_drumBuffers.snare, time, g * vel.snare * sv)
    if (gv) _playBuffer(_drumBuffers.snare, time, g * 0.22      * gv)
    if (hv) _playBuffer(_drumBuffers.hatCl, time, g * vel.hihat * hv)
    return
  }

  // ── Simple ────────────────────────────────────────────────────────────────
  if (pat.kick?.[idx])  _playBuffer(_drumBuffers.kick,  time, g * vel.kick)
  if (pat.snare?.[idx]) _playBuffer(_drumBuffers.snare, time, g * vel.snare)
}

// ── Public helpers ─────────────────────────────────────────────────────────────

function setRhythmVolume(v) { rhythmVolume.value = v }

export function useDrums() {
  return {
    rhythmMode,
    rhythmVolume,
    drumsReady,
    drumTick,
    initDrums,
    setRhythmVolume,
  }
}
