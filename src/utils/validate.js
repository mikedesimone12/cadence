export const validateBPM = (bpm) => {
  const n = parseInt(bpm)
  if (isNaN(n) || n < 20 || n > 300) {
    return { valid: false, error: 'BPM must be between 20 and 300' }
  }
  return { valid: true, value: n }
}

export const VALID_CHORD_REGEX = /^[A-G][#b]?(m|maj|dim|aug|sus[24]?|add\d{1,2})?$/

export const validateChord = (chord) => {
  return VALID_CHORD_REGEX.test(chord.trim())
}

export const validateChordChart = (chords) => {
  if (!Array.isArray(chords) || chords.length === 0) {
    return { valid: false, error: 'Add at least one chord' }
  }
  if (chords.length > 32) {
    return { valid: false, error: 'Maximum 32 chords per section' }
  }
  const invalid = chords.filter(c => !validateChord(c))
  if (invalid.length > 0) {
    return { valid: false, error: `Invalid chords: ${invalid.join(', ')}` }
  }
  return { valid: true }
}

export const validateText = (str, fieldName, maxLength = 200) => {
  if (!str || str.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` }
  }
  if (str.length > maxLength) {
    return { valid: false, error: `${fieldName} must be under ${maxLength} characters` }
  }
  return { valid: true }
}
