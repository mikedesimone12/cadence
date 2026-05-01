import { noteToSharp } from './musicTheory.js'

// Guitar voicings: fret arrays [E2, A2, D3, G3, B3, e4]
// -1 = muted, 0 = open string
// fingers: 0 = open/muted, 1-4 = index through pinky

const guitarVoicings = {
  // ─── MAJOR ──────────────────────────────────────────────────────────────────
  'C': [
    { label: 'Open',  frets: [-1,3,2,0,1,0],     fingers: [0,3,2,0,1,0] },
    { label: 'Barre', frets: [-1,3,5,5,5,3],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [8,10,10,9,8,8],    fingers: [1,3,4,2,1,1] },
  ],
  'C#': [
    { label: 'Barre', frets: [-1,4,6,6,6,4],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [9,11,11,10,9,9],   fingers: [1,3,4,2,1,1] },
  ],
  'D': [
    { label: 'Open',  frets: [-1,-1,0,2,3,2],    fingers: [0,0,0,1,3,2] },
    { label: 'Barre', frets: [-1,5,7,7,7,5],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [10,12,12,11,10,10],fingers: [1,3,4,2,1,1] },
  ],
  'D#': [
    { label: 'Barre', frets: [-1,6,8,8,8,6],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [11,13,13,12,11,11],fingers: [1,3,4,2,1,1] },
  ],
  'E': [
    { label: 'Open',  frets: [0,2,2,1,0,0],      fingers: [0,2,3,1,0,0] },
    { label: 'Barre', frets: [-1,7,9,9,9,7],     fingers: [0,1,3,4,4,1] },
  ],
  'F': [
    { label: 'Barre', frets: [1,3,3,2,1,1],      fingers: [1,3,4,2,1,1] },
    { label: 'High',  frets: [-1,8,10,10,10,8],  fingers: [0,1,3,4,4,1] },
  ],
  'F#': [
    { label: 'Barre', frets: [2,4,4,3,2,2],      fingers: [1,3,4,2,1,1] },
    { label: 'High',  frets: [-1,9,11,11,11,9],  fingers: [0,1,3,4,4,1] },
  ],
  'G': [
    { label: 'Open',  frets: [3,2,0,0,0,3],      fingers: [2,1,0,0,0,3] },
    { label: 'Barre', frets: [3,5,5,4,3,3],      fingers: [1,3,4,2,1,1] },
    { label: 'High',  frets: [-1,10,12,12,12,10],fingers: [0,1,3,4,4,1] },
  ],
  'G#': [
    { label: 'Barre', frets: [4,6,6,5,4,4],      fingers: [1,3,4,2,1,1] },
    { label: 'High',  frets: [-1,11,13,13,13,11],fingers: [0,1,3,4,4,1] },
  ],
  'A': [
    { label: 'Open',  frets: [-1,0,2,2,2,0],     fingers: [0,0,1,2,3,0] },
    { label: 'Barre', frets: [5,7,7,6,5,5],      fingers: [1,3,4,2,1,1] },
    { label: 'High',  frets: [-1,12,14,14,14,12],fingers: [0,1,3,4,4,1] },
  ],
  'A#': [
    { label: 'Barre', frets: [-1,1,3,3,3,1],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [6,8,8,7,6,6],      fingers: [1,3,4,2,1,1] },
  ],
  'B': [
    { label: 'Barre', frets: [-1,2,4,4,4,2],     fingers: [0,1,3,4,4,1] },
    { label: 'High',  frets: [7,9,9,8,7,7],      fingers: [1,3,4,2,1,1] },
  ],

  // ─── MINOR ──────────────────────────────────────────────────────────────────
  'Cm': [
    { label: 'Barre', frets: [-1,3,5,5,4,3],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [8,10,10,8,8,8],    fingers: [1,3,4,1,1,1] },
  ],
  'C#m': [
    { label: 'Barre', frets: [-1,4,6,6,5,4],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [9,11,11,9,9,9],    fingers: [1,3,4,1,1,1] },
  ],
  'Dm': [
    { label: 'Open',  frets: [-1,-1,0,2,3,1],    fingers: [0,0,0,2,3,1] },
    { label: 'Barre', frets: [-1,5,7,7,6,5],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [10,12,12,10,10,10],fingers: [1,3,4,1,1,1] },
  ],
  'D#m': [
    { label: 'Barre', frets: [-1,6,8,8,7,6],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [11,13,13,11,11,11],fingers: [1,3,4,1,1,1] },
  ],
  'Em': [
    { label: 'Open',  frets: [0,2,2,0,0,0],      fingers: [0,2,3,0,0,0] },
    { label: 'Barre', frets: [-1,7,9,9,8,7],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [12,14,14,12,12,12],fingers: [1,3,4,1,1,1] },
  ],
  'Fm': [
    { label: 'Barre', frets: [1,3,3,1,1,1],      fingers: [1,3,4,1,1,1] },
    { label: 'High',  frets: [-1,8,10,10,9,8],   fingers: [0,1,3,4,2,1] },
  ],
  'F#m': [
    { label: 'Barre', frets: [2,4,4,2,2,2],      fingers: [1,3,4,1,1,1] },
    { label: 'High',  frets: [-1,9,11,11,10,9],  fingers: [0,1,3,4,2,1] },
  ],
  'Gm': [
    { label: 'Barre', frets: [3,5,5,3,3,3],      fingers: [1,3,4,1,1,1] },
    { label: 'High',  frets: [-1,10,12,12,11,10],fingers: [0,1,3,4,2,1] },
  ],
  'G#m': [
    { label: 'Barre', frets: [4,6,6,4,4,4],      fingers: [1,3,4,1,1,1] },
    { label: 'High',  frets: [-1,11,13,13,12,11],fingers: [0,1,3,4,2,1] },
  ],
  'Am': [
    { label: 'Open',  frets: [-1,0,2,2,1,0],     fingers: [0,0,2,3,1,0] },
    { label: 'Barre', frets: [5,7,7,5,5,5],      fingers: [1,3,4,1,1,1] },
    { label: 'High',  frets: [-1,12,14,14,13,12],fingers: [0,1,3,4,2,1] },
  ],
  'A#m': [
    { label: 'Barre', frets: [-1,1,3,3,2,1],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [6,8,8,6,6,6],      fingers: [1,3,4,1,1,1] },
  ],
  'Bm': [
    { label: 'Barre', frets: [-1,2,4,4,3,2],     fingers: [0,1,3,4,2,1] },
    { label: 'High',  frets: [7,9,9,7,7,7],      fingers: [1,3,4,1,1,1] },
  ],

  // ─── DIMINISHED ─────────────────────────────────────────────────────────────
  // Shape A: root on A string — [-1, N, N+1, N+2, N+1, -1]
  // Shape B: 3-string cluster on D-G-B — [-1,-1,R+4,R+5,R+4,-1]
  'Cdim': [
    { label: 'Open',  frets: [-1,3,4,5,4,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,4,5,4,-1],   fingers: [0,0,2,3,2,0] },
  ],
  'C#dim': [
    { label: 'Open',  frets: [-1,4,5,6,5,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,5,6,5,-1],   fingers: [0,0,1,2,1,0] },
  ],
  'Ddim': [
    { label: 'Open',  frets: [-1,5,6,7,6,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,6,7,6,-1],   fingers: [0,0,1,2,1,0] },
  ],
  'D#dim': [
    { label: 'Open',  frets: [-1,6,7,8,7,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,7,8,7,-1],   fingers: [0,0,1,2,1,0] },
  ],
  'Edim': [
    { label: 'Open',  frets: [-1,7,8,9,8,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,8,9,8,-1],   fingers: [0,0,1,2,1,0] },
  ],
  'Fdim': [
    { label: 'Open',  frets: [-1,8,9,10,9,-1],   fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,9,10,9,-1],  fingers: [0,0,1,2,1,0] },
  ],
  'F#dim': [
    { label: 'Open',  frets: [-1,9,10,11,10,-1], fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,10,11,10,-1],fingers: [0,0,1,2,1,0] },
  ],
  'Gdim': [
    { label: 'Open',  frets: [-1,10,11,12,11,-1],fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,11,12,11,-1],fingers: [0,0,1,2,1,0] },
  ],
  'G#dim': [
    { label: 'Open',  frets: [-1,-1,0,1,0,-1],   fingers: [0,0,0,1,0,0] },
    { label: 'Barre', frets: [-1,11,12,13,12,-1],fingers: [0,1,2,4,3,0] },
  ],
  'Adim': [
    { label: 'Open',  frets: [-1,0,1,2,1,-1],    fingers: [0,0,1,3,2,0] },
    { label: 'Barre', frets: [-1,-1,1,2,1,-1],   fingers: [0,0,1,3,2,0] },
  ],
  'A#dim': [
    { label: 'Open',  frets: [-1,1,2,3,2,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,2,3,2,-1],   fingers: [0,0,1,3,2,0] },
  ],
  'Bdim': [
    { label: 'Open',  frets: [-1,2,3,4,3,-1],    fingers: [0,1,2,4,3,0] },
    { label: 'Barre', frets: [-1,-1,3,4,3,-1],   fingers: [0,0,1,3,2,0] },
  ],
}

// Piano voicings: notes in octave 4, bass in octave 3
const pianoVoicings = {
  // ─── MAJOR ──────────────────────────────────────────────────────────────────
  'C':   { notes: ['C4','E4','G4'],   bass: 'C3'  },
  'C#':  { notes: ['C#4','F4','G#4'], bass: 'C#3' },
  'D':   { notes: ['D4','F#4','A4'],  bass: 'D3'  },
  'D#':  { notes: ['D#4','G4','A#4'], bass: 'D#3' },
  'E':   { notes: ['E4','G#4','B4'],  bass: 'E3'  },
  'F':   { notes: ['F4','A4','C5'],   bass: 'F3'  },
  'F#':  { notes: ['F#4','A#4','C#5'],bass: 'F#3' },
  'G':   { notes: ['G4','B4','D5'],   bass: 'G3'  },
  'G#':  { notes: ['G#4','C5','D#5'], bass: 'G#3' },
  'A':   { notes: ['A4','C#5','E5'],  bass: 'A3'  },
  'A#':  { notes: ['A#4','D5','F5'],  bass: 'A#3' },
  'B':   { notes: ['B4','D#5','F#5'], bass: 'B3'  },
  // ─── MINOR ──────────────────────────────────────────────────────────────────
  'Cm':  { notes: ['C4','Eb4','G4'],  bass: 'C3'  },
  'C#m': { notes: ['C#4','E4','G#4'], bass: 'C#3' },
  'Dm':  { notes: ['D4','F4','A4'],   bass: 'D3'  },
  'D#m': { notes: ['D#4','F#4','A#4'],bass: 'D#3' },
  'Em':  { notes: ['E4','G4','B4'],   bass: 'E3'  },
  'Fm':  { notes: ['F4','Ab4','C5'],  bass: 'F3'  },
  'F#m': { notes: ['F#4','A4','C#5'], bass: 'F#3' },
  'Gm':  { notes: ['G4','Bb4','D5'],  bass: 'G3'  },
  'G#m': { notes: ['G#4','B4','D#5'], bass: 'G#3' },
  'Am':  { notes: ['A4','C5','E5'],   bass: 'A3'  },
  'A#m': { notes: ['A#4','C#5','F5'], bass: 'A#3' },
  'Bm':  { notes: ['B4','D5','F#5'],  bass: 'B3'  },
  // ─── DIMINISHED ─────────────────────────────────────────────────────────────
  'Cdim':  { notes: ['C4','Eb4','Gb4'],  bass: 'C3'  },
  'C#dim': { notes: ['C#4','E4','G4'],   bass: 'C#3' },
  'Ddim':  { notes: ['D4','F4','Ab4'],   bass: 'D3'  },
  'D#dim': { notes: ['D#4','F#4','A4'],  bass: 'D#3' },
  'Edim':  { notes: ['E4','G4','Bb4'],   bass: 'E3'  },
  'Fdim':  { notes: ['F4','Ab4','B4'],   bass: 'F3'  },
  'F#dim': { notes: ['F#4','A4','C5'],   bass: 'F#3' },
  'Gdim':  { notes: ['G4','Bb4','Db5'],  bass: 'G3'  },
  'G#dim': { notes: ['G#4','B4','D5'],   bass: 'G#3' },
  'Adim':  { notes: ['A4','C5','Eb5'],   bass: 'A3'  },
  'A#dim': { notes: ['A#4','C#5','E5'],  bass: 'A#3' },
  'Bdim':  { notes: ['B4','D5','F5'],    bass: 'B3'  },
}

export function getGuitarVoicings(chordName) {
  if (!chordName) return []
  const sharp = noteToSharp(chordName)
  return guitarVoicings[sharp] ?? []
}

export function getPianoVoicing(chordName) {
  if (!chordName) return null
  const sharp = noteToSharp(chordName)
  return pianoVoicings[sharp] ?? null
}

// Return chord tone note names (without octave) for a chord
export function getChordToneNames(chordName) {
  if (!chordName) return []
  const voicing = getPianoVoicing(chordName)
  if (!voicing) return []
  return [...voicing.notes, voicing.bass]
    .map(n => n.replace(/\d/, ''))
}
