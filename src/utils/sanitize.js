import DOMPurify from 'dompurify'

const CHORD_RE = /^[A-G][#b]?(m|maj|dim|aug|sus[24]?|add\d{1,2})?$/

export const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return ''
  return DOMPurify.sanitize(str.trim(), { ALLOWED_TAGS: [] })
}

export const sanitizeChord = (str) => {
  if (!str || typeof str !== 'string') return null
  const cleaned = str.trim().replace(/[^A-Ga-g#bmdijsua0-9]/g, '')
  return CHORD_RE.test(cleaned) ? cleaned : null
}

export const simplifyToTriad = (chord) => {
  if (!chord) return null
  const match = chord.match(/^([A-G][#b]?)(m(?!aj)|dim|aug)?/)
  if (!match) return null
  const root = match[1]
  const quality = match[2] || ''
  if (quality === 'aug') return root
  return root + quality
}

export const simplifyProgression = (chords) => {
  if (!Array.isArray(chords)) return []
  return chords
    .map(simplifyToTriad)
    .filter(Boolean)
    .filter((chord, i, arr) => chord !== arr[i - 1])
}
