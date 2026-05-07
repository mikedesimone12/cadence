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
