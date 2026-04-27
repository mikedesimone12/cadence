/**
 * Pure music theory utilities. No Vue dependencies — safe to import anywhere,
 * including tests and server-side code.
 *
 * All keys are stored in sharp notation internally. Functions that accept
 * chord or note names accept either sharp or flat notation and normalize
 * automatically via noteToSharp().
 */

/**
 * All 12 major keys, keyed by root note in sharp notation.
 * Each value is a 7-element array of diatonic triads in Roman-numeral order:
 * [I, IIm, IIIm, IV, V, VIm, VIIdim]
 *
 * @type {Record<string, string[]>}
 */
export const musicalKeys = {
  C:    ['C',  'Dm',   'Em',   'F',  'G',  'Am',   'Bdim' ],
  'C#': ['C#', 'D#m',  'Fm',   'F#', 'G#', 'A#m',  'Cdim' ],
  D:    ['D',  'Em',   'F#m',  'G',  'A',  'Bm',   'C#dim'],
  'D#': ['D#', 'Fm',   'Gm',   'G#', 'A#', 'Cm',   'Ddim' ],
  E:    ['E',  'F#m',  'G#m',  'A',  'B',  'C#m',  'D#dim'],
  F:    ['F',  'Gm',   'Am',   'A#', 'C',  'Dm',   'Edim' ],
  'F#': ['F#', 'G#m',  'A#m',  'B',  'C#', 'D#m',  'Fdim' ],
  G:    ['G',  'Am',   'Bm',   'C',  'D',  'Em',   'F#dim'],
  'G#': ['G#', 'A#m',  'Cm',   'C#', 'D#', 'Fm',   'Gdim' ],
  A:    ['A',  'Bm',   'C#m',  'D',  'E',  'F#m',  'G#dim'],
  'A#': ['A#', 'Cm',   'Dm',   'D#', 'F',  'Gm',   'Adim' ],
  B:    ['B',  'C#m',  'D#m',  'E',  'F#', 'G#m',  'A#dim'],
}

/** @type {Record<string, string>} */
const FLAT_TO_SHARP = {
  Bb: 'A#', Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#',
}

/**
 * Converts a note or chord name from flat to sharp notation.
 * Handles full chord names, e.g. 'Bbm' → 'A#m', 'Ebdim' → 'D#dim'.
 * Non-flat inputs are returned unchanged.
 *
 * @param {string} note - Note or chord name in any notation.
 * @returns {string} Equivalent in sharp notation.
 */
export function noteToSharp(note) {
  const root = note.substring(0, 2)
  return FLAT_TO_SHARP[root]
    ? FLAT_TO_SHARP[root] + note.substring(2)
    : note
}

/**
 * Returns true when every chord in chordList appears in keyList.
 * Both arrays must already be in the same notation (sharp).
 *
 * @param {string[]} keyList - Seven-chord diatonic key array.
 * @param {string[]} chordList - Chords to test.
 * @returns {boolean}
 */
export function existsInKey(keyList, chordList) {
  return chordList.every(chord => keyList.includes(chord))
}

/**
 * Given a list of selected chords, returns the names of all major and
 * relative minor keys that contain those chords as a diatonic subset.
 * Accepts chords in either sharp or flat notation.
 *
 * @param {string[]} chordList - Selected chord names.
 * @returns {string[]} Human-readable key names, e.g. ['Key of C Major', 'Key of A Minor'].
 */
export function checkKeys(chordList) {
  if (!chordList.length) return []

  const normalized = chordList.map(noteToSharp)
  const results = []

  for (const [root, keyChords] of Object.entries(musicalKeys)) {
    if (existsInKey(keyChords, normalized)) {
      // VIm chord at index 5 is the relative minor — strip the trailing 'm' to get its root
      const relativeMinorRoot = keyChords[5].slice(0, -1)
      results.push(`Key of ${root} Major`)
      results.push(`Key of ${relativeMinorRoot} Minor`)
    }
  }

  return results
}

/**
 * Extracts the quality suffix from a sharp-notation chord name.
 * e.g. 'Am' → 'm', 'Bdim' → 'dim', 'C' → '', 'F#m' → 'm'
 *
 * @param {string} chord - Sharp-notation chord name.
 * @returns {string}
 */
function chordSuffix(chord) {
  const match = chord.match(/^[A-G]#?(.*)$/)
  return match ? match[1] : ''
}

/**
 * Returns the Nashville Number System degree for a chord within a major key.
 * The degree string includes the quality suffix so callers don't need to
 * recompute it: '1', '2m', '3m', '4', '5', '6m', '7dim'.
 * Returns null if the chord is not diatonic to the given key.
 *
 * @param {string} chord   - Chord name in sharp or flat notation.
 * @param {string} keyRoot - Major key root note in sharp or flat notation (e.g. 'C', 'F#', 'Bb').
 * @returns {string|null}
 *
 * @example
 * chordToNNS('Am', 'C')   // → '6m'
 * chordToNNS('G',  'C')   // → '5'
 * chordToNNS('Bdim','C')  // → '7dim'
 * chordToNNS('Bbm','Eb')  // → '5m'  (non-diatonic — returns null)
 */
export function chordToNNS(chord, keyRoot) {
  const normalizedChord = noteToSharp(chord)
  const normalizedRoot  = noteToSharp(keyRoot)
  const keyChords = musicalKeys[normalizedRoot]
  if (!keyChords) return null

  const index = keyChords.indexOf(normalizedChord)
  if (index === -1) return null

  return `${index + 1}${chordSuffix(normalizedChord)}`
}

/**
 * Converts an array of chords to Nashville Number System notation within a major key.
 * Chords not diatonic to the key are represented as null.
 *
 * @param {string[]} chords   - Chord names in sharp or flat notation.
 * @param {string}   keyRoot  - Major key root note in sharp or flat notation.
 * @returns {(string|null)[]} NNS degree strings, e.g. ['1', '5', '6m', '4'].
 *
 * @example
 * progressionToNNS(['C', 'G', 'Am', 'F'], 'C')  // → ['1', '5', '6m', '4']
 * progressionToNNS(['D', 'A', 'Bm', 'G'], 'D')  // → ['1', '5', '6m', '4']
 */
export function progressionToNNS(chords, keyRoot) {
  return chords.map(chord => chordToNNS(chord, keyRoot))
}

// ── Transposition ─────────────────────────────────────────────────────────────

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Transposes a single chord by the interval between fromKey and toKey.
 * Preserves chord quality (m, dim, aug, maj7, sus2, etc.).
 * Accepts flat notation — normalizes internally via noteToSharp.
 *
 * @param {string} chord   - Chord name in any notation.
 * @param {string} fromKey - Source key root (e.g. 'C', 'Bb').
 * @param {string} toKey   - Target key root.
 * @returns {string} Transposed chord in sharp notation.
 */
export function transposeChord(chord, fromKey, toKey) {
  const normalized = noteToSharp(chord)
  const match = normalized.match(/^([A-G]#?)(.*)$/)
  if (!match) return chord

  const [, root, suffix] = match
  const fromIdx = CHROMATIC.indexOf(noteToSharp(fromKey))
  const toIdx   = CHROMATIC.indexOf(noteToSharp(toKey))
  if (fromIdx === -1 || toIdx === -1) return chord

  const interval = (toIdx - fromIdx + 12) % 12
  const rootIdx  = CHROMATIC.indexOf(root)
  if (rootIdx === -1) return chord

  return CHROMATIC[(rootIdx + interval) % 12] + suffix
}

/**
 * Transposes an array of chords from one key to another.
 *
 * @param {string[]} chords  - Chord names.
 * @param {string}   fromKey - Source key root.
 * @param {string}   toKey   - Target key root.
 * @returns {string[]} Transposed chords in sharp notation.
 *
 * @example
 * transposeProgression(['C', 'Am', 'F', 'G'], 'C', 'G') // → ['G', 'Em', 'C', 'D']
 */
export function transposeProgression(chords, fromKey, toKey) {
  return chords.map(c => transposeChord(c, fromKey, toKey))
}

// ── Capo calculator ───────────────────────────────────────────────────────────

const CAPO_TABLE = {
  G: { 'G#': 1, A: 2, 'A#': 3, B: 4 },
  D: { 'D#': 1, E: 2, F: 3 },
  C: { 'C#': 1, D: 2, 'D#': 3 },
  A: { 'A#': 1, B: 2 },
}

/**
 * Returns a capo suggestion for reaching targetKey using shapes in a simpler open key.
 * @param {string} targetKey
 * @returns {{ playKey: string, fret: number } | null}
 */
export function getCapoSuggestion(targetKey) {
  const sharp = noteToSharp(targetKey)
  for (const [playKey, targets] of Object.entries(CAPO_TABLE)) {
    if (sharp in targets) return { playKey, fret: targets[sharp] }
  }
  return null
}
