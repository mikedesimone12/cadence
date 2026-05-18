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
