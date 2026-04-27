import { ref } from 'vue'
import * as Tone from 'tone'
import Soundfont from 'soundfont-player'
import { noteToSharp } from '../core/musicTheory'

// ─── Note / MIDI helpers ──────────────────────────────────────────────────────

const NOTE_MIDI = {
  C: 60, 'C#': 61, D: 62, 'D#': 63, E: 64,
  F: 65, 'F#': 66, G: 67, 'G#': 68, A: 69, 'A#': 70, B: 71,
}
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function midiToNoteName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

function chordMidiNotes(chordName) {
  const sharp = noteToSharp(chordName)
  const m = sharp.match(/^([A-G]#?)(.*)$/)
  if (!m) return []
  const root = NOTE_MIDI[m[1]]
  if (root === undefined) return []
  const intervals = m[2] === 'dim' ? [0, 3, 6] : m[2] === 'm' ? [0, 3, 7] : [0, 4, 7]
  return intervals.map(i => root + i)
}

// ─── Singleton state ──────────────────────────────────────────────────────────

const activeInstrument = ref('piano')
const bassEnabled      = ref(true)
const isLoaded         = ref(false)
const volume           = ref(80)

let pianoPlayer  = null
let guitarPlayer = null
let bassPlayer   = null
let loadPromise  = null

// ─── Loading ──────────────────────────────────────────────────────────────────

async function loadInstruments() {
  if (isLoaded.value) return
  if (loadPromise)    return loadPromise

  loadPromise = (async () => {
    // Tone.getContext() creates the AudioContext (starts suspended — resume happens
    // on first user gesture via ensureContext())
    const ctx  = Tone.getContext().rawContext
    const opts = { soundfont: 'MusyngKite' }
    ;[pianoPlayer, guitarPlayer, bassPlayer] = await Promise.all([
      Soundfont.instrument(ctx, 'acoustic_grand_piano',  opts),
      Soundfont.instrument(ctx, 'acoustic_guitar_steel', opts),
      Soundfont.instrument(ctx, 'acoustic_bass',         opts),
    ])
    isLoaded.value = true
  })()

  return loadPromise
}

// Must be awaited from a user-gesture handler before any playback call.
async function ensureContext() {
  await Tone.start()
}

// ─── Playback ─────────────────────────────────────────────────────────────────

function _gain()  { return (volume.value / 100) * 0.9 }

function _activePlayers() {
  if (activeInstrument.value === 'guitar') return [guitarPlayer].filter(Boolean)
  if (activeInstrument.value === 'both')   return [pianoPlayer, guitarPlayer].filter(Boolean)
  return [pianoPlayer].filter(Boolean)
}

function playChord(chordName, when, duration = 1.5) {
  if (!isLoaded.value) return
  const notes = chordMidiNotes(chordName)
  if (!notes.length) return
  const g = _gain()
  const t = when ?? Tone.now()
  _activePlayers().forEach(player => {
    notes.forEach(midi => player.play(midiToNoteName(midi), t, { gain: g, duration }))
  })
  if (bassEnabled.value && bassPlayer) {
    bassPlayer.play(midiToNoteName(notes[0] - 24), t, { gain: g * 1.1, duration: duration * 1.2 })
  }
}

function playScale(keyRoot, type = 'major') {
  if (!isLoaded.value) return
  const root = NOTE_MIDI[noteToSharp(keyRoot)]
  if (root === undefined) return
  const player = activeInstrument.value === 'guitar' ? guitarPlayer : pianoPlayer
  if (!player) return
  const intervals = type === 'minor'
    ? [0, 2, 3, 5, 7, 8, 10, 12]
    : [0, 2, 4, 5, 7, 9, 11, 12]
  const g = _gain()
  // Schedule via WebAudio timeline — no setTimeout drift
  intervals.forEach((interval, i) => {
    player.play(midiToNoteName(root + interval), Tone.now() + i * 0.3, { gain: g, duration: 0.5 })
  })
}

function playNote(note) {
  if (!isLoaded.value) return
  const player = activeInstrument.value === 'guitar' ? guitarPlayer : pianoPlayer
  if (!player) return
  player.play(note, Tone.now(), { gain: _gain(), duration: 0.5 })
}

function stopAll() {
  pianoPlayer?.stop()
  guitarPlayer?.stop()
  bassPlayer?.stop()
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function useAudio() {
  return {
    activeInstrument,
    bassEnabled,
    isLoaded,
    volume,
    loadInstruments,
    ensureContext,
    playChord,
    playScale,
    playNote,
    stopAll,
    setInstrument:  v => { activeInstrument.value = v },
    setBassEnabled: v => { bassEnabled.value = v },
    setVolume:      v => { volume.value = v },
  }
}
