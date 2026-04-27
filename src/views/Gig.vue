<template>
  <!-- Auth gate -->
  <v-container
    v-if="!currentUser"
    class="d-flex align-center justify-center"
    style="min-height: calc(100vh - 120px)"
  >
    <v-card max-width="360" class="pa-6 text-center" variant="outlined">
      <v-icon size="48" color="primary" class="mb-4">mdi-music-note-plus</v-icon>
      <div class="text-h6 mb-2 panel-title">Manage Your Gigs</div>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Sign in to create setlists, build chord charts, and track practice.
      </p>
      <v-btn color="primary" variant="flat" @click="authOpen = true">Sign In</v-btn>
    </v-card>
  </v-container>

  <!-- Main content -->
  <v-container v-else fluid class="pa-3 pa-md-5" style="max-width: 1200px">
    <v-row>
      <!-- ── Left: Setlist Manager ─────────────────────────────────────────── -->
      <v-col cols="12" md="4">
        <div class="d-flex align-center mb-3">
          <span class="text-h6 panel-title">Setlists</span>
          <v-spacer />
          <v-btn
            size="small" variant="text" color="primary"
            :prepend-icon="newSetlistOpen ? 'mdi-close' : 'mdi-plus'"
            @click="toggleNewSetlist"
          >{{ newSetlistOpen ? 'Cancel' : 'New' }}</v-btn>
        </div>

        <v-expand-transition>
          <v-card v-if="newSetlistOpen" variant="outlined" class="mb-3 pa-3">
            <v-text-field
              v-model="newSetlist.name"
              label="Setlist name *"
              variant="outlined" density="compact" hide-details
              class="mb-2" autofocus
            />
            <v-text-field
              v-model="newSetlist.venue"
              label="Venue"
              variant="outlined" density="compact" hide-details
              class="mb-2"
            />
            <v-text-field
              v-model="newSetlist.gig_date"
              label="Gig date"
              type="date"
              variant="outlined" density="compact" hide-details
              class="mb-3"
            />
            <div class="d-flex justify-end">
              <v-btn
                color="primary" variant="flat" size="small"
                :loading="savingSetlist"
                :disabled="!newSetlist.name.trim()"
                @click="saveSetlist"
              >Save Setlist</v-btn>
            </div>
            <v-alert
              v-if="setlistError"
              type="error" variant="tonal" density="compact" closable
              class="mt-2"
              @click:close="setlistError = ''"
            >{{ setlistError }}</v-alert>
          </v-card>
        </v-expand-transition>

        <div v-if="loadingSetlists">
          <v-skeleton-loader v-for="i in 3" :key="i" type="list-item-two-line" class="mb-2 rounded-lg" />
        </div>

        <template v-else-if="setlists.length">
          <v-card
            v-for="sl in setlists"
            :key="sl.id"
            class="mb-2 setlist-card"
            :class="{ 'setlist-card--active': selectedSetlist?.id === sl.id }"
            @click="selectedSetlist = sl"
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-start">
                <div class="flex-grow-1" style="min-width: 0">
                  <div class="text-subtitle-2 font-weight-bold text-truncate">{{ sl.name }}</div>
                  <div v-if="sl.venue" class="text-caption text-medium-emphasis text-truncate">
                    <v-icon size="10" class="mr-1">mdi-map-marker-outline</v-icon>{{ sl.venue }}
                  </div>
                  <div v-if="sl.gig_date" class="text-caption text-medium-emphasis">
                    <v-icon size="10" class="mr-1">mdi-calendar-outline</v-icon>{{ formatDate(sl.gig_date) }}
                  </div>
                </div>
                <div class="d-flex flex-column align-end ml-2" style="flex-shrink: 0; gap: 4px">
                  <v-chip v-if="sl.gig_date" :color="countdownColor(sl.gig_date)" size="x-small" variant="tonal">
                    {{ countdown(sl.gig_date) }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal" color="secondary">
                    {{ setlistSongCounts[sl.id] ?? 0 }}
                    {{ (setlistSongCounts[sl.id] ?? 0) !== 1 ? 'songs' : 'song' }}
                  </v-chip>
                </div>
              </div>
              <div class="d-flex justify-end mt-1" style="gap: 2px">
                <v-btn icon size="x-small" variant="text" color="primary" title="Practice drill" @click.stop="openDrill(sl)">
                  <v-icon size="14">mdi-play-circle-outline</v-icon>
                </v-btn>
                <v-btn icon size="x-small" variant="text" color="error" @click.stop="confirmDeleteSetlist(sl)">
                  <v-icon size="14">mdi-delete-outline</v-icon>
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <div v-else class="text-center text-medium-emphasis py-8">
          <v-icon size="36" class="mb-2" style="opacity: 0.3">mdi-playlist-plus</v-icon>
          <div class="text-body-2">No setlists yet.</div>
          <div class="text-caption mt-1">Create one above to get started.</div>
        </div>
      </v-col>

      <!-- ── Right: Song Manager ───────────────────────────────────────────── -->
      <v-col cols="12" md="8">
        <template v-if="selectedSetlist">
          <div class="d-flex align-center mb-3">
            <div style="min-width: 0">
              <div class="text-h6 panel-title text-truncate">{{ selectedSetlist.name }}</div>
              <div v-if="selectedSetlist.venue || selectedSetlist.gig_date" class="text-caption text-medium-emphasis">
                <template v-if="selectedSetlist.venue">@ {{ selectedSetlist.venue }}</template>
                <template v-if="selectedSetlist.gig_date"> · {{ formatDate(selectedSetlist.gig_date) }}</template>
              </div>
            </div>
            <v-spacer />
            <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-plus" @click="openAddSong">
              Add Song
            </v-btn>
          </div>

          <div v-if="loadingSongs">
            <v-skeleton-loader v-for="i in 3" :key="i" type="article" class="mb-2" />
          </div>

          <template v-else-if="songs.length">
            <div
              v-for="(song, idx) in songs"
              :key="song.setlist_song_id"
              class="song-row mb-2"
              :class="{ 'song-row--over': dragOverIndex === idx }"
              draggable="true"
              @dragstart="onDragStart(idx)"
              @dragover.prevent="onDragOver(idx)"
              @drop.prevent="onDrop(idx)"
              @dragend="onDragEnd"
            >
              <v-card>
                <v-card-text class="pa-3">
                  <div class="d-flex align-start" style="gap: 8px">
                    <v-icon size="18" color="medium-emphasis" class="drag-handle mt-1" style="flex-shrink: 0">
                      mdi-drag-vertical
                    </v-icon>
                    <div class="flex-grow-1" style="min-width: 0">
                      <div class="d-flex align-center flex-wrap mb-1" style="gap: 6px">
                        <span class="text-subtitle-2 font-weight-bold">{{ song.title }}</span>
                        <span v-if="song.artist" class="text-caption text-medium-emphasis">
                          — {{ song.artist }}
                        </span>
                        <span
                          class="confidence-dot"
                          :class="confidenceClass(song.recentScores)"
                          :title="confidenceTitle(song.recentScores)"
                        />
                      </div>
                      <div v-if="song.key || song.bpm" class="d-flex flex-wrap mb-2" style="gap: 4px">
                        <v-chip v-if="song.key" size="x-small" color="primary" variant="tonal">
                          {{ song.key }}
                        </v-chip>
                        <v-chip v-if="song.bpm" size="x-small" color="secondary" variant="tonal">
                          {{ song.bpm }} BPM
                        </v-chip>
                      </div>
                      <div v-if="parsedChords(song).length" class="d-flex flex-wrap mb-1" style="gap: 4px">
                        <v-chip
                          v-for="(chord, ci) in parsedChords(song)"
                          :key="ci"
                          size="x-small" variant="outlined"
                        >{{ chord }}</v-chip>
                      </div>
                      <div v-if="songNNS(song).length" class="d-flex flex-wrap" style="gap: 4px">
                        <v-chip
                          v-for="(nns, ni) in songNNS(song)"
                          :key="ni"
                          size="x-small" variant="tonal"
                          :color="nns ? 'surface-variant' : 'error'"
                          class="font-weight-medium"
                        >{{ nns ?? '?' }}</v-chip>
                      </div>
                      <!-- Transpose panel -->
                      <div class="mt-2">
                        <v-chip
                          size="x-small" color="secondary" variant="tonal"
                          style="cursor: pointer"
                          @click="toggleTranspose(song.id)"
                        >
                          <v-icon start size="11">mdi-music</v-icon>
                          Transpose
                        </v-chip>
                      </div>
                      <v-expand-transition>
                        <div v-if="expandedTranspose[song.id]" class="mt-2 pt-2 transpose-panel">
                          <div class="d-flex align-center flex-wrap mb-2" style="gap: 8px">
                            <v-select
                              v-model="transposeTargetKeys[song.id]"
                              :items="KEY_ROOTS"
                              item-title="label"
                              item-value="value"
                              label="Target key"
                              variant="outlined" density="compact" hide-details
                              style="max-width: 160px; min-width: 130px"
                            />
                            <v-btn
                              v-if="transposeTargetKeys[song.id]"
                              size="x-small" variant="text" color="secondary"
                              prepend-icon="mdi-content-copy"
                              @click="copyTransposed(song)"
                            >Copy</v-btn>
                          </div>
                          <template v-if="transposeTargetKeys[song.id] && parsedChords(song).length">
                            <div class="d-flex flex-wrap mb-1" style="gap: 4px">
                              <v-chip
                                v-for="(ch, ci) in transposedChords(song, transposeTargetKeys[song.id])"
                                :key="ci" size="x-small" color="primary" variant="tonal"
                              >{{ ch }}</v-chip>
                            </div>
                            <div v-if="capoText(transposeTargetKeys[song.id])" class="text-caption text-medium-emphasis mt-1">
                              <v-icon size="11" class="mr-1">mdi-music-note</v-icon>
                              {{ capoText(transposeTargetKeys[song.id]) }}
                            </div>
                          </template>
                        </div>
                      </v-expand-transition>
                    </div>
                    <div class="d-flex" style="flex-shrink: 0; gap: 2px">
                      <v-btn
                        v-if="parsedChords(song).length"
                        icon size="x-small" variant="text" color="primary"
                        title="Open in Play"
                        @click.stop="openInPlay(song)"
                      >
                        <v-icon size="14">mdi-piano</v-icon>
                      </v-btn>
                      <v-btn icon size="x-small" variant="text" color="secondary" @click="openEditSong(song)">
                        <v-icon size="14">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon size="x-small" variant="text" color="error" @click="confirmDeleteSong(song)">
                        <v-icon size="14">mdi-delete-outline</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </template>

          <div v-else class="text-center text-medium-emphasis py-10">
            <v-icon size="40" class="mb-2" style="opacity: 0.3">mdi-music-note-outline</v-icon>
            <div class="text-body-2">No songs yet.</div>
            <div class="text-caption mt-1">Add your first song above.</div>
          </div>

          <v-alert
            v-if="songsError"
            type="error" variant="tonal" density="compact" closable
            class="mt-2"
            @click:close="songsError = ''"
          >{{ songsError }}</v-alert>
        </template>

        <div v-else class="d-flex align-center justify-center" style="min-height: 300px">
          <div class="text-center text-medium-emphasis">
            <v-icon size="40" class="mb-3" style="opacity: 0.3">mdi-playlist-music-outline</v-icon>
            <div class="text-body-2">Select a setlist to view its songs</div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Mobile FAB -->
    <v-btn
      v-if="selectedSetlist"
      icon color="primary" size="large"
      class="d-md-none"
      style="position: fixed; bottom: 80px; right: 16px; z-index: 100"
      elevation="6"
      @click="openAddSong"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>
  </v-container>

  <!-- Drill fullscreen overlay -->
  <v-dialog v-model="drillOpen" fullscreen transition="dialog-bottom-transition">
    <v-card style="min-height: 100vh; display: flex; flex-direction: column" class="bg-background">
      <v-toolbar density="compact" color="surface" border="b">
        <v-btn icon size="small" @click="drillOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="panel-title text-subtitle-1">
          {{ drillSetlist?.name }}
        </v-toolbar-title>
        <v-spacer />
        <span v-if="drillPhase === 'drilling'" class="text-caption text-medium-emphasis mr-3">
          {{ drillQueueIdx + 1 }} / {{ drillQueue.length }}
        </span>
      </v-toolbar>

      <!-- Gig urgency banner -->
      <v-alert
        v-if="daysToGig !== null && daysToGig >= 0 && daysToGig <= 7"
        type="warning" variant="tonal" density="compact" :icon="false"
        class="mx-0 rounded-0"
      >
        <v-icon size="14" class="mr-1">mdi-calendar-alert</v-icon>
        <strong>{{ daysToGig === 0 ? 'Gig is today' : `${daysToGig} day${daysToGig === 1 ? '' : 's'} to your gig` }}</strong>
        — focusing on shaky songs first
      </v-alert>

      <!-- Loading -->
      <div v-if="drillLoadingData" class="flex-grow-1 d-flex align-center justify-center">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Phase: select drill type -->
      <div
        v-else-if="drillPhase === 'select'"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6"
        style="gap: 16px; max-width: 480px; margin: 0 auto; width: 100%"
      >
        <div class="text-h6 panel-title mb-2">Choose Drill Type</div>
        <v-card
          v-for="dt in DRILL_TYPES" :key="dt.value"
          class="drill-type-card w-100" variant="outlined"
          @click="startDrill(dt.value)"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-start" style="gap: 12px">
              <v-icon :icon="dt.icon" color="primary" size="24" style="flex-shrink: 0; margin-top: 2px" />
              <div>
                <div class="text-subtitle-2 font-weight-bold mb-1">{{ dt.label }}</div>
                <div class="text-caption text-medium-emphasis">{{ dt.description }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
        <v-alert v-if="drillError" type="error" variant="tonal" density="compact">{{ drillError }}</v-alert>
      </div>

      <!-- Phase: drilling -->
      <div
        v-else-if="drillPhase === 'drilling' && drillCurrentSong"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
        style="max-width: 560px; margin: 0 auto; width: 100%"
      >
        <div class="text-h6 panel-title mb-1">{{ drillCurrentSong.title }}</div>
        <div v-if="drillCurrentSong.artist" class="text-caption text-medium-emphasis mb-4">
          {{ drillCurrentSong.artist }}
        </div>

        <!-- NNS Flash -->
        <template v-if="drillType === 'nns'">
          <div class="text-caption text-medium-emphasis mb-3">Recall the chords for this progression:</div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
            <v-chip v-for="(n, i) in drillNNS" :key="i" color="primary" variant="tonal" size="small">
              {{ n ?? '?' }}
            </v-chip>
          </div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100">
              <div class="text-caption text-medium-emphasis mb-2">
                Chords ({{ drillCurrentSong.key }}):
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(ch, i) in drillChords" :key="i" color="secondary" variant="tonal" size="small">
                  {{ ch }}
                </v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Transpose Drill -->
        <template v-else-if="drillType === 'transpose'">
          <div class="text-caption text-medium-emphasis mb-1">
            Original key: <strong>{{ drillCurrentSong.key }}</strong>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            Target key: <strong class="text-primary">{{ drillCurrentTransposeKey }}</strong>
          </div>
          <div class="d-flex flex-wrap justify-center mb-3" style="gap: 6px">
            <v-chip v-for="(ch, i) in drillChords" :key="i" variant="outlined" size="small">{{ ch }}</v-chip>
          </div>
          <div class="text-caption text-medium-emphasis mb-6">Work out the transposed chords…</div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100">
              <div class="text-caption text-medium-emphasis mb-2">
                Transposed to {{ drillCurrentTransposeKey }}:
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(ch, i) in drillTransposedChords" :key="i" color="primary" variant="tonal" size="small">
                  {{ ch }}
                </v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Reverse Drill -->
        <template v-else-if="drillType === 'reverse'">
          <div class="text-caption text-medium-emphasis mb-3">What key? What NNS numbers?</div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
            <v-chip v-for="(ch, i) in drillChords" :key="i" variant="outlined" size="small">{{ ch }}</v-chip>
          </div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100">
              <div class="text-caption text-medium-emphasis mb-2">
                Key: <strong>{{ drillCurrentSong.key }}</strong>
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 4px">
                <v-chip v-for="(n, i) in drillNNS" :key="i" color="primary" variant="tonal" size="small">
                  {{ n ?? '?' }}
                </v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Action buttons -->
        <v-btn
          v-if="drillCardPhase === 'question'"
          color="primary" variant="flat" size="large"
          @click="revealDrillCard"
        >Reveal</v-btn>

        <div v-else class="d-flex justify-center flex-wrap" style="gap: 10px">
          <v-btn
            color="success" variant="tonal" size="small"
            :loading="drillSavingRating"
            @click="rateCurrentSong('got_it')"
          >
            <v-icon start>mdi-check-circle-outline</v-icon>Got it
          </v-btn>
          <v-btn
            color="warning" variant="tonal" size="small"
            :loading="drillSavingRating"
            @click="rateCurrentSong('almost')"
          >
            <v-icon start>mdi-minus-circle-outline</v-icon>Almost
          </v-btn>
          <v-btn
            color="error" variant="tonal" size="small"
            :loading="drillSavingRating"
            @click="rateCurrentSong('missed')"
          >
            <v-icon start>mdi-close-circle-outline</v-icon>Missed
          </v-btn>
        </div>
      </div>

      <!-- Phase: end -->
      <div
        v-else-if="drillPhase === 'end'"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
        style="max-width: 480px; margin: 0 auto; width: 100%"
      >
        <v-icon size="52" color="primary" class="mb-3">mdi-star-outline</v-icon>
        <div class="text-h6 panel-title mb-1">Session Complete</div>
        <div class="text-caption text-medium-emphasis mb-6">
          {{ drillSummary.total }} song{{ drillSummary.total !== 1 ? 's' : '' }} practiced
        </div>
        <div class="d-flex justify-center mb-8" style="gap: 24px">
          <div class="text-center">
            <div class="text-h4 font-weight-bold" style="color: #4B9E6F">{{ drillSummary.gotIt }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Got it</div>
          </div>
          <div class="text-center">
            <div class="text-h4 font-weight-bold" style="color: #C8A96E">{{ drillSummary.almost }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Almost</div>
          </div>
          <div class="text-center">
            <div class="text-h4 font-weight-bold" style="color: #CF4B4B">{{ drillSummary.missed }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Missed</div>
          </div>
        </div>
        <div class="d-flex flex-wrap justify-center" style="gap: 12px">
          <v-btn variant="outlined" color="secondary" @click="drillOpen = false">Done for today</v-btn>
          <v-btn color="primary" variant="flat" @click="keepGoing">Keep going</v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>

  <!-- AuthModal (always mounted) -->
  <AuthModal v-model="authOpen" />

  <!-- Song form dialog -->
  <v-dialog v-model="songDialog" max-width="480" :persistent="savingSong">
    <v-card>
      <v-card-title class="pt-5 pb-0 px-5 panel-title">
        {{ editingSong ? 'Edit Song' : 'New Song' }}
      </v-card-title>
      <v-card-text class="px-5 pt-4">
        <v-text-field
          v-model="songForm.title"
          label="Title *"
          variant="outlined" density="compact" hide-details
          class="mb-3" autofocus
        />
        <v-text-field
          v-model="songForm.artist"
          label="Artist"
          variant="outlined" density="compact" hide-details
          class="mb-3"
        />
        <v-row dense class="mb-3">
          <v-col cols="7">
            <v-select
              v-model="songForm.key_root"
              :items="KEY_ROOTS"
              item-title="label"
              item-value="value"
              label="Key"
              variant="outlined" density="compact" hide-details
              clearable
            />
          </v-col>
          <v-col cols="5">
            <v-select
              v-model="songForm.key_type"
              :items="[{ title: 'Major', value: 'major' }, { title: 'Minor', value: 'minor' }]"
              label="Type"
              variant="outlined" density="compact" hide-details
            />
          </v-col>
        </v-row>
        <v-text-field
          v-model.number="songForm.bpm"
          label="BPM"
          type="number" min="40" max="300"
          variant="outlined" density="compact" hide-details
          class="mb-3"
        />
        <v-text-field
          v-model="songForm.chord_chart"
          label="Chord chart (comma-separated)"
          placeholder="C, Am, F, G"
          variant="outlined" density="compact" hide-details
          class="mb-2"
        />
        <div v-if="formNNS.length" class="d-flex align-center flex-wrap mb-3" style="gap: 4px; padding-left: 2px">
          <span class="text-caption text-medium-emphasis mr-1">NNS:</span>
          <v-chip
            v-for="(nns, ni) in formNNS"
            :key="ni"
            size="x-small" variant="tonal"
            :color="nns ? 'primary' : 'error'"
          >{{ nns ?? '?' }}</v-chip>
        </div>
        <v-textarea
          v-model="songForm.notes"
          label="Notes"
          variant="outlined" density="compact"
          rows="2" auto-grow hide-details
        />
        <v-alert
          v-if="songFormError"
          type="error" variant="tonal" density="compact" closable
          class="mt-3"
          @click:close="songFormError = ''"
        >{{ songFormError }}</v-alert>
      </v-card-text>
      <v-card-actions class="px-5 pb-4 pt-0">
        <v-spacer />
        <v-btn variant="text" size="small" color="secondary" @click="songDialog = false">Cancel</v-btn>
        <v-btn
          color="primary" variant="flat" size="small"
          :loading="savingSong"
          :disabled="!songForm.title.trim()"
          @click="saveSong"
        >{{ editingSong ? 'Save Changes' : 'Add Song' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete confirm dialog -->
  <v-dialog v-model="deleteDialog" max-width="360">
    <v-card>
      <v-card-title class="pt-5 px-5 text-body-1 font-weight-bold">
        {{ pendingDelete?.type === 'setlist' ? 'Delete Setlist?' : 'Remove Song?' }}
      </v-card-title>
      <v-card-text class="px-5 text-body-2 text-medium-emphasis">
        {{ deleteMessage }}
      </v-card-text>
      <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mx-5 mb-2">
        {{ deleteError }}
      </v-alert>
      <v-card-actions class="px-5 pb-4 pt-0">
        <v-spacer />
        <v-btn variant="text" size="small" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn color="error" variant="flat" size="small" :loading="deleting" @click="executeDelete">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import { progressionToNNS, noteToSharp, musicalKeys, transposeProgression, getCapoSuggestion } from '../core/musicTheory'
import { useAudio } from '../composables/useAudio'
import AuthModal from '../components/AuthModal.vue'

const { currentUser } = useAuth()
const router   = useRouter()
const authOpen = ref(false)

const { playChord: audioPlayChord, isLoaded: audioIsLoaded, ensureContext } = useAudio()

const KEY_ROOTS = [
  { label: 'C',       value: 'C'  },
  { label: 'C# / Db', value: 'C#' },
  { label: 'D',       value: 'D'  },
  { label: 'D# / Eb', value: 'D#' },
  { label: 'E',       value: 'E'  },
  { label: 'F',       value: 'F'  },
  { label: 'F# / Gb', value: 'F#' },
  { label: 'G',       value: 'G'  },
  { label: 'G# / Ab', value: 'G#' },
  { label: 'A',       value: 'A'  },
  { label: 'A# / Bb', value: 'A#' },
  { label: 'B',       value: 'B'  },
]

// ── Setlists ──────────────────────────────────────────────────────────────────
const setlists          = ref([])
const loadingSetlists   = ref(false)
const setlistError      = ref('')
const selectedSetlist   = ref(null)
const setlistSongCounts = ref({})

const newSetlistOpen = ref(false)
const savingSetlist  = ref(false)
const newSetlist     = ref({ name: '', venue: '', gig_date: '' })

function toggleNewSetlist() {
  newSetlistOpen.value = !newSetlistOpen.value
  if (!newSetlistOpen.value) {
    newSetlist.value = { name: '', venue: '', gig_date: '' }
    setlistError.value = ''
  }
}

async function loadSetlists() {
  if (!currentUser.value) return
  loadingSetlists.value = true
  setlistError.value = ''
  try {
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .order('gig_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    setlists.value = data ?? []

    if (data?.length) {
      const { data: ss } = await supabase
        .from('setlist_songs')
        .select('setlist_id')
        .in('setlist_id', data.map(s => s.id))
      if (ss) {
        const counts = {}
        ss.forEach(r => { counts[r.setlist_id] = (counts[r.setlist_id] ?? 0) + 1 })
        setlistSongCounts.value = counts
      }
    }
  } catch (e) {
    setlistError.value = e.message
  } finally {
    loadingSetlists.value = false
  }
}

async function saveSetlist() {
  if (!newSetlist.value.name.trim()) return
  savingSetlist.value = true
  setlistError.value = ''
  try {
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        user_id: currentUser.value.id,
        name:    newSetlist.value.name.trim(),
        venue:   newSetlist.value.venue.trim() || null,
        gig_date: newSetlist.value.gig_date     || null,
      })
      .select()
      .single()
    if (error) throw error
    setlists.value.push(data)
    setlistSongCounts.value[data.id] = 0
    newSetlistOpen.value = false
    newSetlist.value = { name: '', venue: '', gig_date: '' }
    selectedSetlist.value = data
  } catch (e) {
    setlistError.value = e.message
  } finally {
    savingSetlist.value = false
  }
}

// ── Songs ─────────────────────────────────────────────────────────────────────
const songs        = ref([])
const loadingSongs = ref(false)
const songsError   = ref('')

async function loadSongs() {
  if (!selectedSetlist.value) { songs.value = []; return }
  loadingSongs.value = true
  songsError.value = ''
  try {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('id, position, songs ( id, title, artist, key, bpm, chord_chart, nns_chart, notes )')
      .eq('setlist_id', selectedSetlist.value.id)
      .order('position', { ascending: true })
    if (error) throw error

    const rows = (data ?? []).filter(r => r.songs)
    const songIds = rows.map(r => r.songs.id)
    const scoreMap = {}

    if (songIds.length) {
      const { data: sessions } = await supabase
        .from('practice_sessions')
        .select('song_id, score')
        .in('song_id', songIds)
        .order('created_at', { ascending: false })
      if (sessions?.length) {
        sessions.forEach(s => {
          if (!scoreMap[s.song_id]) scoreMap[s.song_id] = []
          if (scoreMap[s.song_id].length < 3) scoreMap[s.song_id].push(s.score)
        })
      }
    }

    songs.value = rows.map(r => ({
      setlist_song_id: r.id,
      position:        r.position,
      ...r.songs,
      recentScores: scoreMap[r.songs.id] ?? [],
    }))
  } catch (e) {
    songsError.value = e.message
  } finally {
    loadingSongs.value = false
  }
}

watch(() => selectedSetlist.value?.id, loadSongs)

// ── Song form ─────────────────────────────────────────────────────────────────
const songDialog    = ref(false)
const editingSong   = ref(null)
const songFormError = ref('')
const savingSong    = ref(false)

const blankForm = () => ({
  title: '', artist: '', key_root: null, key_type: 'major',
  bpm: null, chord_chart: '', notes: '',
})
const songForm = ref(blankForm())

const formNNS = computed(() => {
  const { chord_chart, key_root, key_type } = songForm.value
  if (!chord_chart.trim() || !key_root) return []
  const chords = chord_chart.split(',').map(c => c.trim()).filter(Boolean)
  if (!chords.length) return []
  const root = key_type === 'minor' ? getRelativeMajor(key_root) : noteToSharp(key_root)
  return progressionToNNS(chords, root)
})

function getRelativeMajor(minorRoot) {
  const sharp = noteToSharp(minorRoot)
  for (const [root, chords] of Object.entries(musicalKeys)) {
    if (chords[5].slice(0, -1) === sharp) return root
  }
  return sharp
}

function openAddSong() {
  if (!selectedSetlist.value) return
  editingSong.value = null
  songForm.value = blankForm()
  songFormError.value = ''
  songDialog.value = true
}

function openEditSong(song) {
  editingSong.value = song
  const { root, type } = parseKey(song.key)
  songForm.value = {
    title:       song.title,
    artist:      song.artist      ?? '',
    key_root:    root,
    key_type:    type,
    bpm:         song.bpm         ?? null,
    chord_chart: Array.isArray(song.chord_chart) ? song.chord_chart.join(', ') : (song.chord_chart ?? ''),
    notes:       song.notes       ?? '',
  }
  songFormError.value = ''
  songDialog.value = true
}

async function saveSong() {
  if (!songForm.value.title.trim()) return
  savingSong.value = true
  songFormError.value = ''
  try {
    const { key_root, key_type, chord_chart } = songForm.value
    const payload = {
      title:       songForm.value.title.trim(),
      artist:      songForm.value.artist.trim()  || null,
      key:         keyFromForm(key_root, key_type),
      bpm:         songForm.value.bpm            || null,
      chord_chart: chord_chart.trim() ? chord_chart.split(',').map(c => c.trim()).filter(Boolean) : null,
      nns_chart:   computeNNSChart(chord_chart, key_root, key_type),
      notes:       songForm.value.notes.trim()   || null,
    }

    if (editingSong.value) {
      const { error } = await supabase.from('songs').update(payload).eq('id', editingSong.value.id)
      if (error) throw error
    } else {
      const { data: song, error: sErr } = await supabase
        .from('songs')
        .insert({ ...payload, user_id: currentUser.value.id })
        .select()
        .single()
      if (sErr) throw sErr

      const { error: ssErr } = await supabase
        .from('setlist_songs')
        .insert({ setlist_id: selectedSetlist.value.id, song_id: song.id, position: songs.value.length })
      if (ssErr) throw ssErr

      setlistSongCounts.value[selectedSetlist.value.id] =
        (setlistSongCounts.value[selectedSetlist.value.id] ?? 0) + 1
    }

    await loadSongs()
    songDialog.value = false
  } catch (e) {
    songFormError.value = e.message
  } finally {
    savingSong.value = false
  }
}

// ── Drag reorder ──────────────────────────────────────────────────────────────
const dragSrcIndex  = ref(null)
const dragOverIndex = ref(null)

function onDragStart(idx) { dragSrcIndex.value = idx }
function onDragOver(idx)  { if (dragSrcIndex.value !== null) dragOverIndex.value = idx }
function onDragEnd()      { dragOverIndex.value = null }

async function onDrop(targetIdx) {
  const src = dragSrcIndex.value
  dragSrcIndex.value = null
  dragOverIndex.value = null
  if (src === null || src === targetIdx) return

  const list = [...songs.value]
  const [moved] = list.splice(src, 1)
  list.splice(targetIdx, 0, moved)
  songs.value = list

  await Promise.all(
    list.map((s, i) =>
      supabase.from('setlist_songs').update({ position: i }).eq('id', s.setlist_song_id)
    )
  )
}

// ── Delete dialog ─────────────────────────────────────────────────────────────
const deleteDialog  = ref(false)
const deleteMessage = ref('')
const deleteError   = ref('')
const deleting      = ref(false)
const pendingDelete = ref(null)

function confirmDeleteSetlist(sl) {
  pendingDelete.value = { type: 'setlist', data: sl }
  deleteMessage.value = `Delete "${sl.name}"? All song associations will be removed.`
  deleteError.value = ''
  deleteDialog.value = true
}

function confirmDeleteSong(song) {
  pendingDelete.value = { type: 'song', data: song }
  deleteMessage.value = `Remove "${song.title}" from this setlist?`
  deleteError.value = ''
  deleteDialog.value = true
}

async function executeDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    const { type, data } = pendingDelete.value
    if (type === 'setlist') {
      const { error } = await supabase.from('setlists').delete().eq('id', data.id)
      if (error) throw error
      setlists.value = setlists.value.filter(s => s.id !== data.id)
      delete setlistSongCounts.value[data.id]
      if (selectedSetlist.value?.id === data.id) selectedSetlist.value = null
    } else {
      const { error } = await supabase
        .from('setlist_songs').delete().eq('id', data.setlist_song_id)
      if (error) throw error
      songs.value = songs.value.filter(s => s.setlist_song_id !== data.setlist_song_id)
      if (selectedSetlist.value) {
        setlistSongCounts.value[selectedSetlist.value.id] = Math.max(
          0, (setlistSongCounts.value[selectedSetlist.value.id] ?? 1) - 1
        )
      }
    }
    deleteDialog.value = false
    pendingDelete.value = null
  } catch (e) {
    deleteError.value = e.message
  } finally {
    deleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parsedChords(song) {
  if (!Array.isArray(song.chord_chart)) return []
  return song.chord_chart
}

function songNNS(song) {
  if (!Array.isArray(song.nns_chart)) return []
  return song.nns_chart
}

function keyFromForm(root, type) {
  if (!root) return null
  return type === 'minor' ? `${root}m` : root
}

function parseKey(key) {
  if (!key) return { root: null, type: 'major' }
  // e.g. "Am" → minor, "C#m" → minor, "C" / "F#" → major
  if (key.length > 1 && key.endsWith('m')) {
    return { root: key.slice(0, -1), type: 'minor' }
  }
  return { root: key, type: 'major' }
}

function computeNNSChart(chord_chart, key_root, key_type) {
  if (!chord_chart?.trim() || !key_root) return null
  const chords = chord_chart.split(',').map(c => c.trim()).filter(Boolean)
  if (!chords.length) return null
  const majorRoot = key_type === 'minor' ? getRelativeMajor(key_root) : noteToSharp(key_root)
  return progressionToNNS(chords, majorRoot).map(n => n ?? '?')
}

function confidenceClass(recentScores) {
  if (!recentScores?.length) return 'dot--none'
  if (recentScores[0] === 0) return 'dot--red'
  if (recentScores.length >= 3 && recentScores.every(s => s === 100)) return 'dot--green'
  return 'dot--yellow'
}

function confidenceTitle(recentScores) {
  if (!recentScores?.length) return 'No practice sessions yet'
  const last = recentScores[0]
  if (last === 100) return 'Last session: Got it'
  if (last === 60)  return 'Last session: Almost'
  return 'Last session: Missed'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function countdown(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = Math.round((new Date(y, m - 1, d) - today) / 86400000)
  if (diff < 0)   return 'Past'
  if (diff === 0) return 'Today!'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d away`
}

function countdownColor(dateStr) {
  if (!dateStr) return 'secondary'
  const [y, m, d] = dateStr.split('-').map(Number)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = Math.round((new Date(y, m - 1, d) - today) / 86400000)
  if (diff < 0)   return 'surface-variant'
  if (diff <= 7)  return 'error'
  if (diff <= 30) return 'warning'
  return 'success'
}

// ── Transpose tool ────────────────────────────────────────────────────────────
const expandedTranspose  = ref({})
const transposeTargetKeys = ref({})

function toggleTranspose(songId) {
  expandedTranspose.value[songId] = !expandedTranspose.value[songId]
}

function transposedChords(song, toKey) {
  if (!song.key || !Array.isArray(song.chord_chart) || !toKey) return []
  const { root } = parseKey(song.key)
  if (!root) return []
  return transposeProgression(song.chord_chart, root, toKey)
}

function capoText(toKey) {
  if (!toKey) return null
  const cap = getCapoSuggestion(toKey)
  return cap ? `Play ${cap.playKey} shapes · capo ${cap.fret}` : null
}

async function copyTransposed(song) {
  const toKey = transposeTargetKeys.value[song.id]
  if (!toKey) return
  const chords = transposedChords(song, toKey)
  try {
    await navigator.clipboard.writeText(chords.join(', '))
  } catch { /* clipboard unavailable */ }
}

// ── Open in Play ──────────────────────────────────────────────────────────────

function openInPlay(song) {
  if (!Array.isArray(song.chord_chart) || !song.chord_chart.length) return
  const { root, type } = parseKey(song.key ?? '')
  router.push({
    path: '/play',
    state: {
      _cadenceLoad: true,
      chords:  song.chord_chart,
      key:     root ?? 'C',
      keyType: type,
      bpm:     song.bpm ?? 80,
    },
  })
}

// ── Drill mode ────────────────────────────────────────────────────────────────
const DRILL_TYPES = [
  {
    value: 'nns',
    label: 'NNS Flash',
    icon: 'mdi-pound',
    description: 'See the Nashville numbers — recall the chords mentally, then reveal.',
  },
  {
    value: 'transpose',
    label: 'Transpose Drill',
    icon: 'mdi-swap-vertical',
    description: 'See original chords — work out the transposition to a random target key.',
  },
  {
    value: 'reverse',
    label: 'Reverse Drill',
    icon: 'mdi-magnify',
    description: 'See the chord names — identify the key and NNS numbers.',
  },
]

const drillOpen               = ref(false)
const drillSetlist             = ref(null)
const drillType                = ref(null)
const drillPhase               = ref('select')   // 'select' | 'drilling' | 'end'
const drillCardPhase           = ref('question') // 'question' | 'reveal'
const drillQueue               = ref([])
const drillQueueIdx            = ref(0)
const drillRequeuedIds         = ref(new Set())
const drillSessionRatings      = ref({})
const drillCurrentTransposeKey = ref(null)
const drillLoadingData         = ref(false)
const drillSavingRating        = ref(false)
const drillError               = ref('')

const daysToGig = computed(() => {
  if (!drillSetlist.value?.gig_date) return null
  const [y, m, d] = drillSetlist.value.gig_date.split('-').map(Number)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d) - today) / 86400000)
})

const drillCurrentSong = computed(() => drillQueue.value[drillQueueIdx.value] ?? null)

const drillChords = computed(() => {
  const song = drillCurrentSong.value
  return Array.isArray(song?.chord_chart) ? song.chord_chart : []
})

const drillNNS = computed(() => {
  const song = drillCurrentSong.value
  if (!song) return []
  if (Array.isArray(song.nns_chart) && song.nns_chart.length) return song.nns_chart
  if (!song.key || !Array.isArray(song.chord_chart)) return []
  const { root } = parseKey(song.key)
  return root ? progressionToNNS(song.chord_chart, root) : []
})

const drillTransposedChords = computed(() => {
  const song = drillCurrentSong.value
  if (!song?.key || !drillCurrentTransposeKey.value || !Array.isArray(song.chord_chart)) return []
  const { root } = parseKey(song.key)
  return root ? transposeProgression(song.chord_chart, root, drillCurrentTransposeKey.value) : []
})

const drillSummary = computed(() => {
  let gotIt = 0, almost = 0, missed = 0
  Object.values(drillSessionRatings.value).forEach(rs => {
    const last = rs[rs.length - 1]
    if (last === 'got_it') gotIt++
    else if (last === 'almost') almost++
    else missed++
  })
  return { gotIt, almost, missed, total: Object.keys(drillSessionRatings.value).length }
})

function openDrill(sl) {
  drillSetlist.value = sl
  drillType.value = null
  drillPhase.value = 'select'
  drillCardPhase.value = 'question'
  drillQueue.value = []
  drillQueueIdx.value = 0
  drillRequeuedIds.value = new Set()
  drillSessionRatings.value = {}
  drillCurrentTransposeKey.value = null
  drillError.value = ''
  drillOpen.value = true
}

function pickTransposeKey() {
  if (drillType.value !== 'transpose') return
  const song = drillCurrentSong.value
  if (!song?.key) { drillCurrentTransposeKey.value = null; return }
  const { root: fromRoot } = parseKey(song.key)
  const others = KEY_ROOTS.map(k => k.value).filter(k => k !== fromRoot)
  drillCurrentTransposeKey.value = others[Math.floor(Math.random() * others.length)]
}

async function startDrill(type) {
  drillType.value = type
  drillLoadingData.value = true
  drillError.value = ''
  try {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('id, position, songs(id, title, artist, key, bpm, chord_chart, nns_chart)')
      .eq('setlist_id', drillSetlist.value.id)
      .order('position', { ascending: true })
    if (error) throw error

    const songRows = (data ?? [])
      .filter(r => r.songs && Array.isArray(r.songs.chord_chart) && r.songs.chord_chart.length)
      .map(r => r.songs)

    const songIds = songRows.map(s => s.id)
    const lastScores = {}
    if (songIds.length) {
      const { data: sessions } = await supabase
        .from('practice_sessions')
        .select('song_id, score')
        .in('song_id', songIds)
        .order('created_at', { ascending: false })
      if (sessions) {
        sessions.forEach(s => {
          if (!(s.song_id in lastScores)) lastScores[s.song_id] = s.score
        })
      }
    }

    // Missed (0) first, no data (50) next, Got it (100) last
    const ordered = [...songRows].sort((a, b) => {
      const sa = lastScores[a.id] ?? 50
      const sb = lastScores[b.id] ?? 50
      return sa - sb
    })

    drillQueue.value = ordered
    drillQueueIdx.value = 0
    drillRequeuedIds.value = new Set()
    drillSessionRatings.value = {}
    drillCardPhase.value = 'question'
    drillPhase.value = 'drilling'
    pickTransposeKey()
  } catch (e) {
    drillError.value = e.message
  } finally {
    drillLoadingData.value = false
  }
}

async function rateCurrentSong(rating) {
  const song = drillCurrentSong.value
  if (!song) return
  const score = rating === 'got_it' ? 100 : rating === 'almost' ? 60 : 0

  drillSavingRating.value = true
  try {
    await supabase.from('practice_sessions').insert({ song_id: song.id, score })
  } catch { /* non-blocking */ } finally {
    drillSavingRating.value = false
  }

  if (!drillSessionRatings.value[song.id]) drillSessionRatings.value[song.id] = []
  drillSessionRatings.value[song.id].push(rating)

  const newQueue = [...drillQueue.value]
  if (rating === 'missed' && !drillRequeuedIds.value.has(song.id)) {
    drillRequeuedIds.value.add(song.id)
    newQueue.push(song)
  }

  const nextIdx = drillQueueIdx.value + 1
  drillQueue.value = newQueue
  if (nextIdx >= newQueue.length) {
    drillPhase.value = 'end'
    loadSongs() // refresh confidence dots in background
  } else {
    drillQueueIdx.value = nextIdx
    drillCardPhase.value = 'question'
    pickTransposeKey()
  }
}

function keepGoing() {
  startDrill(drillType.value)
}

async function revealDrillCard() {
  drillCardPhase.value = 'reveal'
  if (!audioIsLoaded.value) return
  // ensureContext must be called from user gesture before scheduling playback
  await ensureContext()
  const chords = drillType.value === 'transpose'
    ? drillTransposedChords.value
    : drillChords.value
  chords.forEach((chord, i) => {
    setTimeout(() => audioPlayChord(chord), i * 400)
  })
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(()   => { if (currentUser.value) loadSetlists() })
onActivated(() => { if (currentUser.value) loadSetlists() })

watch(currentUser, user => {
  if (user) {
    loadSetlists()
  } else {
    setlists.value = []
    selectedSetlist.value = null
    songs.value = []
    setlistSongCounts.value = {}
  }
})
</script>

<style scoped>
.panel-title {
  font-family: 'Space Grotesk', sans-serif;
}

.setlist-card {
  cursor: pointer;
  transition: border-color 0.15s;
}
.setlist-card:hover {
  border-color: rgba(200, 169, 110, 0.3) !important;
}
.setlist-card--active {
  border-color: #C8A96E !important;
  background: rgba(200, 169, 110, 0.06) !important;
}

.song-row { cursor: grab; }
.song-row:active { cursor: grabbing; }
.song-row--over .v-card {
  border-color: rgba(200, 169, 110, 0.5) !important;
}

.drag-handle {
  cursor: grab;
  opacity: 0.35;
  transition: opacity 0.15s;
}
.song-row:hover .drag-handle { opacity: 0.7; }

.confidence-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}
.dot--none   { background: rgba(200, 200, 200, 0.2); border: 1px solid rgba(200, 200, 200, 0.3); }
.dot--green  { background: #4B9E6F; }
.dot--yellow { background: #C8A96E; }
.dot--red    { background: #CF4B4B; }

.transpose-panel {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.drill-type-card {
  cursor: pointer;
  transition: border-color 0.15s;
}
.drill-type-card:hover {
  border-color: rgba(200, 169, 110, 0.4) !important;
  background: rgba(200, 169, 110, 0.04) !important;
}
</style>
