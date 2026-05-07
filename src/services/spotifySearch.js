export async function searchTracks(query) {
  if (!query?.trim()) return []

  const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Search failed')
  }

  const data = await res.json()
  return data.tracks || []
}

export async function getTrackFeatures(spotifyId) {
  if (!spotifyId) return null

  const res = await fetch(`/api/spotify/features/${spotifyId}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Could not load song details')
  }

  const data = await res.json()
  return data.features || null
}

export async function getMusicBrainzData(title, artist) {
  if (!title) return null
  try {
    const params = new URLSearchParams({ title })
    if (artist) params.set('artist', artist)
    const res = await fetch(`/api/musicbrainz?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    return (data.key || data.bpm) ? data : null
  } catch {
    return null
  }
}
