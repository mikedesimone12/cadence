import DOMPurify from 'dompurify'

export const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return ''
  return DOMPurify.sanitize(str.trim(), { ALLOWED_TAGS: [] })
}

export const sanitizeChord = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.trim().replace(/[^A-Ga-g#bmdijsua0-9]/g, '')
}
