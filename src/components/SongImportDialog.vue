<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="480"
  >
    <v-card color="surface" rounded="xl">
      <v-card-text class="pa-4">

        <!-- Search field -->
        <v-text-field
          v-model="query"
          placeholder="Search for a song..."
          variant="outlined"
          density="comfortable"
          clearable
          autofocus
          hide-details
          :loading="searching"
          class="spotify-search-field"
          @keydown="onKeydown"
        >
          <template #prepend-inner>
            <v-icon style="color: #1DB954">mdi-spotify</v-icon>
          </template>
        </v-text-field>

        <!-- Inline error -->
        <div v-if="errorMessage" class="text-caption mt-2 pl-1" style="color: #CF6679">
          Search unavailable — try again
        </div>

        <!-- Skeleton loaders while fetching -->
        <template v-if="searching">
          <v-skeleton-loader
            v-for="i in 3" :key="i"
            type="list-item-avatar"
            class="mt-1 skeleton-row"
          />
        </template>

        <!-- Results list -->
        <div v-else-if="results.length" class="mt-2" role="listbox">
          <div
            v-for="(track, i) in results.slice(0, 6)"
            :key="track.spotifyId"
            class="spotify-result-row"
            :class="{ 'spotify-result-row--focused': focusedIdx === i }"
            role="option"
            @click="selectTrack(track)"
            @mouseenter="focusedIdx = i"
          >
            <v-avatar size="40" rounded="md" class="flex-shrink-0">
              <v-img v-if="track.albumArt" :src="track.albumArt" :alt="track.title" />
              <v-icon v-else color="medium-emphasis" size="20">mdi-music</v-icon>
            </v-avatar>
            <div style="min-width: 0; flex: 1">
              <div class="spotify-result-title">{{ cleanTitle(track.title) }}</div>
              <div class="spotify-result-artist">{{ track.artist }}</div>
            </div>
          </div>
        </div>

        <!-- Empty state (only after 3+ chars typed) -->
        <div
          v-else-if="query.length >= 3 && !searching && !errorMessage"
          class="text-center py-5 text-caption text-medium-emphasis"
        >
          No results for "{{ query }}"
        </div>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchTracks, getTrackFeatures } from '../services/spotifySearch'

const props = defineProps({ modelValue: Boolean })
const emit  = defineEmits(['update:modelValue', 'song-selected'])

const query        = ref('')
const results      = ref([])
const searching    = ref(false)
const errorMessage = ref('')
const focusedIdx   = ref(0)
let   debounceTimer = null

function cleanTitle(title) {
  return title
    .replace(/\s*[-–]\s*(Remaster(ed)?(\s+\d{4})?)/gi, '')
    .replace(/\s*[-–]\s*(Re-?master(ed)?(\s+\d{4})?)/gi, '')
    .replace(/\s*\((Remaster(ed)?(\s+\d{4})?)\)/gi, '')
    .replace(/\s*\((Live[^)]*)\)/gi, '')
    .replace(/\s*\((Radio Edit)\)/gi, '')
    .replace(/\s*\((Single[^)]*)\)/gi, '')
    .replace(/\s*\((Album[^)]*)\)/gi, '')
    .trim()
}

async function handleSearch() {
  if (query.value.trim().length < 2) return
  searching.value  = true
  results.value    = []
  errorMessage.value = ''
  try {
    results.value  = await searchTracks(query.value)
    focusedIdx.value = 0
  } catch {
    errorMessage.value = 'unavailable'
  } finally {
    searching.value = false
  }
}

watch(query, (val) => {
  clearTimeout(debounceTimer)
  errorMessage.value = ''
  focusedIdx.value   = 0
  if (val.trim().length < 2) { results.value = []; return }
  debounceTimer = setTimeout(handleSearch, 300)
})

function selectTrack(track) {
  const featuresPromise = getTrackFeatures(track.spotifyId).catch(() => null)

  emit('song-selected', {
    title:           cleanTitle(track.title),
    artist:          track.artist,
    albumArt:        track.albumArt || null,
    spotifyId:       track.spotifyId,
    key:             '',
    keyType:         'major',
    bpm:             null,
    timeSignature:   4,
    featuresPending: true,
    featuresPromise,
  })

  emit('update:modelValue', false)
  resetDialog()
}

function onKeydown(e) {
  const visible = results.value.slice(0, 6)

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIdx.value = Math.min(focusedIdx.value + 1, visible.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIdx.value = Math.max(focusedIdx.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const track = visible[focusedIdx.value]
    if (track) selectTrack(track)
  } else if (e.key === 'Escape') {
    emit('update:modelValue', false)
  }
}

function resetDialog() {
  clearTimeout(debounceTimer)
  query.value        = ''
  results.value      = []
  errorMessage.value = ''
  focusedIdx.value   = 0
}

watch(() => props.modelValue, (val) => { if (!val) resetDialog() })
</script>

<style scoped>
.spotify-result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  border: 1px solid transparent;
}
.spotify-result-row:hover,
.spotify-result-row--focused {
  background: rgba(200, 169, 110, 0.06);
  border-color: rgba(200, 169, 110, 0.3);
}
.spotify-result-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spotify-result-artist {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.skeleton-row {
  border-radius: 8px;
  overflow: hidden;
}
</style>
