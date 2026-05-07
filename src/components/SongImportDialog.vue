<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="520"
    :persistent="step === 'loading'"
  >
    <v-card color="surface" rounded="xl">

      <!-- Header -->
      <v-card-title class="d-flex align-center pt-5 px-6">
        <v-icon color="primary" class="mr-2">mdi-magnify</v-icon>
        <span>Find a Song</span>
        <v-spacer />
        <v-btn
          icon variant="text" size="small"
          :disabled="step === 'loading'"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="px-6 pb-6">

        <!-- Search field — always visible -->
        <v-text-field
          v-model="query"
          placeholder="Song title or artist..."
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-music-note"
          clearable
          autofocus
          hide-details
          class="mb-4"
          :loading="searchLoading"
        />

        <!-- STEP: search results -->
        <template v-if="step === 'search'">
          <div v-if="results.length > 0">
            <div class="import-section-label mb-2">RESULTS</div>
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="track in results"
                :key="track.spotifyId"
                :title="track.title"
                :subtitle="track.artist"
                rounded="lg"
                class="mb-1 track-result-item"
                @click="selectTrack(track)"
              >
                <template #prepend>
                  <v-avatar size="40" rounded="md" class="mr-3">
                    <v-img v-if="track.albumArt" :src="track.albumArt" :alt="track.album" />
                    <v-icon v-else color="medium-emphasis">mdi-music</v-icon>
                  </v-avatar>
                </template>
                <template #append>
                  <v-icon size="16" color="medium-emphasis">mdi-chevron-right</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <div
            v-if="!searchLoading && results.length === 0 && query.length >= 2 && !errorMessage"
            class="text-center py-6 text-medium-emphasis"
          >
            No results found
          </div>
        </template>

        <!-- STEP: loading features -->
        <div v-if="step === 'loading'" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="36" class="mb-4" />
          <div class="text-body-2 text-medium-emphasis">Getting song details...</div>
        </div>

        <!-- STEP: result / confirm import -->
        <div v-if="step === 'result' && selectedTrack">

          <v-btn
            variant="text" size="small"
            prepend-icon="mdi-arrow-left"
            class="mb-4 px-0"
            @click="step = 'search'"
          >Back to results</v-btn>

          <!-- Song identity -->
          <div class="d-flex align-center mb-5">
            <v-avatar size="56" rounded="lg" class="mr-4">
              <v-img v-if="selectedTrack.albumArt" :src="selectedTrack.albumArt" />
              <v-icon v-else size="28" color="primary">mdi-music</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ selectedTrack.title }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ selectedTrack.artist }}</div>
            </div>
          </div>

          <!-- Metadata grid -->
          <div v-if="features" class="metadata-grid mb-5">
            <div class="metadata-cell">
              <div class="metadata-label">KEY</div>
              <div class="metadata-value">{{ features.key || '—' }}</div>
            </div>
            <div class="metadata-cell">
              <div class="metadata-label">TEMPO</div>
              <div class="metadata-value">{{ features.bpm ? `${features.bpm} BPM` : '—' }}</div>
            </div>
            <div class="metadata-cell">
              <div class="metadata-label">TIME</div>
              <div class="metadata-value">{{ features.timeSignature }}/4</div>
            </div>
            <div class="metadata-cell">
              <div class="metadata-label">ENERGY</div>
              <div class="metadata-value">{{ features.energy }}%</div>
            </div>
          </div>

          <!-- No features available -->
          <v-alert
            v-else
            type="info" variant="tonal" density="compact" class="mb-4"
          >
            Spotify doesn't have audio analysis for this track. Title and artist will still be imported.
          </v-alert>

          <v-btn
            color="primary" variant="flat" block size="large"
            prepend-icon="mdi-import"
            @click="handleImport"
          >
            Import to Song Form
          </v-btn>

          <div class="text-caption text-center text-medium-emphasis mt-3">
            You'll still add chord charts manually
          </div>
        </div>

        <!-- Error -->
        <v-alert
          v-if="errorMessage"
          type="error" variant="tonal" density="compact" class="mt-2"
          closable
          @click:close="errorMessage = ''"
        >{{ errorMessage }}</v-alert>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchTracks, getTrackFeatures } from '../services/spotifySearch'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'song-selected'])

const query           = ref('')
const results         = ref([])
const selectedTrack   = ref(null)
const features        = ref(null)
const step            = ref('search')
const searchLoading   = ref(false)
const errorMessage    = ref('')
const debounceTimer   = ref(null)

async function handleSearch() {
  if (query.value.trim().length < 2) return
  searchLoading.value = true
  results.value = []
  errorMessage.value = ''
  try {
    results.value = await searchTracks(query.value)
    if (results.value.length === 0) {
      errorMessage.value = 'No results found — try a different search'
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    searchLoading.value = false
  }
}

watch(query, (val) => {
  clearTimeout(debounceTimer.value)
  errorMessage.value = ''
  if (val.trim().length < 2) {
    results.value = []
    return
  }
  debounceTimer.value = setTimeout(handleSearch, 400)
})

async function selectTrack(track) {
  selectedTrack.value = track
  step.value = 'loading'
  errorMessage.value = ''
  try {
    features.value = await getTrackFeatures(track.spotifyId)
    step.value = 'result'
  } catch (err) {
    step.value = 'error'
    errorMessage.value = err.message
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s*[-–]\s*(Remaster(ed)?(\s+\d{4})?)/gi, '')
    .replace(/\s*[-–]\s*(Re-?master(ed)?(\s+\d{4})?)/gi, '')
    .replace(/\s*\((Remaster(ed)?(\s+\d{4})?)\)/gi, '')
    .replace(/\s*\((Live[^)]*)\)/gi, '')
    .replace(/\s*\((Radio Edit)\)/gi, '')
    .trim()
}

function handleImport() {
  if (!selectedTrack.value) return

  const key = features.value?.key || ''
  const isMinor = key.endsWith('m')
  const keyRoot = isMinor ? key.slice(0, -1) : key
  const keyType = isMinor ? 'minor' : 'major'

  emit('song-selected', {
    title:         cleanTitle(selectedTrack.value.title),
    artist:        selectedTrack.value.artist,
    key:           keyRoot,
    keyType:       keyType,
    bpm:           features.value?.bpm || null,
    timeSignature: features.value?.timeSignature || 4,
    spotifyId:     selectedTrack.value.spotifyId,
    albumArt:      selectedTrack.value.albumArt || null,
  })

  emit('update:modelValue', false)
  resetDialog()
}

function resetDialog() {
  query.value = ''
  results.value = []
  selectedTrack.value = null
  features.value = null
  step.value = 'search'
  errorMessage.value = ''
  clearTimeout(debounceTimer.value)
}

watch(() => props.modelValue, (val) => {
  if (!val) resetDialog()
})
</script>

<style scoped>
.track-result-item {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.track-result-item:hover {
  border-color: rgba(200, 169, 110, 0.3);
  background: rgba(200, 169, 110, 0.04);
}

.metadata-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.metadata-cell {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
}
.metadata-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}
.metadata-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.import-section-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
}
</style>
