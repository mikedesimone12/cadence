import { ref, watch } from 'vue'
import Soundfont from 'soundfont-player'
import * as Tone from 'tone'

// ── Singleton state (persisted) ────────────────────────────────────────────────
const rhythmMode   = ref(localStorage.getItem('cadence_rhythm_mode') || 'off')
const rhythmVolume = ref(Number(localStorage.getItem('cadence_rhythm_vol') ?? 70))
const swingAmount  = ref(Number(localStorage.getItem('cadence_swing_amt') ?? 15))

watch(rhythmMode,   v => localStorage.setItem('cadence_rhythm_mode', v))
watch(rhythmVolume, v => localStorage.setItem('cadence_rhythm_vol', String(v)))
watch(swingAmount,  v => localStorage.setItem('cadence_swing_amt',  String(v)))

const drumsReady = ref(false)

// ── soundfont-player instrument handles ───────────────────────────────────────
let _kickKit  = null  // synth_drum  — kick, 808, crash
let _snareKit = null  // taiko_drum  — snare, ghost notes
let _hatKit   = null  // woodblock   — hats, click, ride, clave
let _loadPromise = null

// ── MIDI note choices per voice ────────────────────────────────────────────────
// synth_drum: pitched electronic drum — lower = deeper/punchier
// taiko_drum: Japanese barrel drum — mid-range sounds most like a snare crack
// woodblock:  wooden click — higher = brighter/shorter
const NOTES = {
  kick:    'C2',   // synth_drum — standard GM bass drum note, punchy
  kick808: 'G1',   // synth_drum — sub-bass 808 boom
  crash:   'C5',   // synth_drum — higher pitch for metallic crash texture
  snare:   'F3',   // taiko_drum — mid-range crack
  hatCl:   'A5',   // woodblock  — bright, very short closed hat
  hatOp:   'E5',   // woodblock  — slightly lower, more open hat feel
  ride:    'B4',   // woodblock  — rounder ride click
  clave:   'G5',   // woodblock  — bright clave / rim
  click:   'C6',   // woodblock  — sharpest metronome click
}

// ── 16-step drum patterns (one step = one 16th note) ─────────────────────────
// Values: 0 = silent, 1 = full velocity, 0.0–1.0 = fractional (ghost notes)
const PATTERNS = {
  simple: {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  },
  acoustic: {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  rock: {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  hiphop: {
    kick:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  },
  fourOnFloor: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  funk: {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    ghost: [0,0.25,0,0.25, 0,0.25,0,0.25, 0,0.25,0,0.25, 0,0.25,0,0.25],
    hihat: [1,0.5,0.85,0.5, 1,0.5,0.85,0.5, 1,0.5,0.85,0.5, 1,0.5,0.85,0.5],
  },
  // Swing uses 16-step grid; Transport.swing=0.5 with swingSubdivision='8n'
  // makes the off-beat 8ths land on the triplet upbeat automatically.
  swing: {
    ride:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    hihat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  },
  bossa: {
    clave: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
    hihat: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
}

// ── Velocity config per preset ─────────────────────────────────────────────────
const VEL = {
  simple:      { kick: 0.85, snare: 0.7 },
  acoustic:    { kick: 0.8,  snare: 0.7,  hihat: 0.4 },
  rock:        { kick: 1.0,  snare: 0.95, hihat: 0.5, crash: 0.28 },
  hiphop:      { kick: 0.9,  snare: 0.8,  hihat: 0.35 },
  fourOnFloor: { kick: 0.95, snare: 0.7,  hihat: 0.4 },
  funk:        { kick: 0.75, snare: 0.85, hihat: 0.55 },
  swing:       { ride: 0.5,  hihat: 0.3,  kick: 0.4,  snare: 0.45 },
  bossa:       { clave: 0.6, hihat: 0.25 },
}

// ── Loading ────────────────────────────────────────────────────────────────────

async function initDrums() {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    const ctx  = Tone.getContext().rawContext
    const opts = { soundfont: 'MusyngKite', format: 'mp3' }
    ;[_kickKit, _snareKit, _hatKit] = await Promise.all([
      Soundfont.instrument(ctx, 'synth_drum',  opts),
      Soundfont.instrument(ctx, 'taiko_drum',  opts),
      Soundfont.instrument(ctx, 'woodblock',   opts),
    ])
    drumsReady.value = true
  })()
  return _loadPromise
}

// ── drumTick — called by the master loop in Play.vue ──────────────────────────
// time:     WebAudio context time (same `time` from Transport.scheduleRepeat)
// step:     0-based step index (0-15 for 16n, 0-11 for 8t/triplet)
// barCount: total bars elapsed since playback started (for rock crash)
function drumTick(time, step, barCount) {
  const mode = rhythmMode.value
  if (mode === 'off' || !drumsReady.value) return

  const g   = rhythmVolume.value / 100
  const pat = PATTERNS[mode]
  const vel = VEL[mode] || {}
  const idx = step % 16

  // ── Click / metronome ──────────────────────────────────────────────────────
  if (mode === 'click') {
    const clickVel = g * (idx === 0 ? 1.0 : 0.55)
    _hatKit?.play(NOTES.click, time, { gain: clickVel, duration: 0.05 })
    return
  }

  if (!pat) return

  const kd = 0.22   // kick note duration (seconds)
  const sd = 0.12   // snare note duration
  const hd = 0.05   // hat note duration

  // ── Swing / jazz ride ──────────────────────────────────────────────────────
  if (mode === 'swing') {
    if (pat.ride?.[idx])  _hatKit?.play(NOTES.ride,  time, { gain: g * vel.ride,  duration: hd * 3 })
    if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatOp, time, { gain: g * vel.hihat, duration: hd * 4 })
    if (pat.kick?.[idx])  _kickKit?.play(NOTES.kick,  time, { gain: g * vel.kick,  duration: kd })
    if (pat.snare?.[idx]) _snareKit?.play(NOTES.snare, time, { gain: g * vel.snare, duration: sd })
    return
  }

  // ── Bossa nova clave ───────────────────────────────────────────────────────
  if (mode === 'bossa') {
    if (pat.clave?.[idx]) _hatKit?.play(NOTES.clave, time, { gain: g * vel.clave, duration: hd })
    if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatCl, time, { gain: g * vel.hihat, duration: hd })
    return
  }

  // ── Rock ───────────────────────────────────────────────────────────────────
  if (mode === 'rock') {
    if (pat.kick?.[idx])  _kickKit?.play(NOTES.kick,  time, { gain: g * vel.kick,  duration: kd })
    if (pat.snare?.[idx]) _snareKit?.play(NOTES.snare, time, { gain: g * vel.snare, duration: sd })
    if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatCl,  time, { gain: g * vel.hihat, duration: hd })
    // Crash one-shot on the very first step of the very first bar
    if (idx === 0 && barCount === 0 && pat.crash?.[0]) {
      _kickKit?.play(NOTES.crash, time, { gain: g * vel.crash, duration: 1.8 })
    }
    return
  }

  // ── Hip-Hop (808, manual per-step swing) ───────────────────────────────────
  if (mode === 'hiphop') {
    let t = time
    if (idx % 2 === 1) {
      // Manually push odd 16ths back for hip-hop pocket feel
      const stepSec = Tone.Time('16n').toSeconds()
      t = time + (swingAmount.value / 100) * stepSec * 0.5
    }
    if (pat.kick?.[idx])  _kickKit?.play(NOTES.kick808, t, { gain: g * vel.kick,  duration: kd * 2 })
    if (pat.snare?.[idx]) _snareKit?.play(NOTES.snare,  t, { gain: g * vel.snare, duration: sd })
    if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatCl,   t, { gain: g * vel.hihat, duration: hd })
    return
  }

  // ── 4 on the Floor ─────────────────────────────────────────────────────────
  if (mode === 'fourOnFloor') {
    if (pat.kick?.[idx])  _kickKit?.play(NOTES.kick,  time, { gain: g * vel.kick,  duration: kd })
    if (pat.snare?.[idx]) _snareKit?.play(NOTES.snare, time, { gain: g * vel.snare, duration: sd })
    if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatCl,  time, { gain: g * vel.hihat, duration: hd })
    return
  }

  // ── Funk (ghost notes, accented hats) ─────────────────────────────────────
  if (mode === 'funk') {
    // Slight swing on off-beat 16ths for that loose pocket
    let t = time
    if (idx % 2 === 1) {
      const stepSec = Tone.Time('16n').toSeconds()
      t = time + 0.17 * stepSec * 0.5
    }
    const kv = pat.kick?.[idx]
    const sv = pat.snare?.[idx]
    const gv = pat.ghost?.[idx]
    const hv = pat.hihat?.[idx]
    if (kv) _kickKit?.play(NOTES.kick,  t, { gain: g * vel.kick  * kv, duration: kd })
    if (sv) _snareKit?.play(NOTES.snare, t, { gain: g * vel.snare * sv, duration: sd })
    if (gv) _snareKit?.play(NOTES.snare, t, { gain: g * 0.22      * gv, duration: sd * 0.5 })
    if (hv) _hatKit?.play(NOTES.hatCl,  t, { gain: g * vel.hihat * hv, duration: hd })
    return
  }

  // ── Simple / Acoustic ──────────────────────────────────────────────────────
  if (pat.kick?.[idx])  _kickKit?.play(NOTES.kick,  time, { gain: g * vel.kick,  duration: kd })
  if (pat.snare?.[idx]) _snareKit?.play(NOTES.snare, time, { gain: g * vel.snare, duration: sd })
  if (pat.hihat?.[idx]) _hatKit?.play(NOTES.hatCl,  time, { gain: g * (vel.hihat ?? 0.4), duration: hd })
}

// ── Public helpers ─────────────────────────────────────────────────────────────

function setRhythmVolume(v) { rhythmVolume.value = v }
function setSwingAmount(v)  { swingAmount.value  = v }

export function useDrums() {
  return {
    rhythmMode,
    rhythmVolume,
    swingAmount,
    drumsReady,
    drumTick,
    initDrums,
    setRhythmVolume,
    setSwingAmount,
  }
}
