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
      <v-col cols="12" md="4" class="gig-left-panel">
        <div class="d-flex align-center mb-3">
          <span class="panel-title section-title">Setlists</span>
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

        <div v-if="loadingSetlists && !setlists.length">
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
                  <v-chip
                    v-if="sl.gig_date"
                    :color="countdownColor(sl.gig_date)"
                    :variant="countdownColor(sl.gig_date) === 'error' ? 'flat' : 'tonal'"
                    size="x-small"
                    :style="countdownColor(sl.gig_date) === 'error' ? 'font-weight:700' : ''"
                  >
                    {{ countdown(sl.gig_date) }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal" color="secondary">
                    {{ setlistSongCounts[sl.id] ?? 0 }}
                    {{ (setlistSongCounts[sl.id] ?? 0) !== 1 ? 'songs' : 'song' }}
                  </v-chip>
                </div>
              </div>
              <div class="d-flex justify-end align-center mt-2" style="gap: 4px">
                <v-btn
                  size="x-small" variant="tonal" color="primary"
                  prepend-icon="mdi-play-circle-outline"
                  @click.stop="openDrill(sl)"
                >Practice</v-btn>
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
      <v-col cols="12" md="8" class="gig-right-panel">
        <template v-if="selectedSetlist">
          <div class="d-flex align-center mb-3">
            <div style="min-width: 0">
              <div class="panel-title section-title text-truncate">{{ selectedSetlist.name }}</div>
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

          <div v-if="loadingSongs && !songs.length">
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
                <v-card-text class="pa-4">
                  <div class="d-flex align-start" style="gap: 8px">
                    <v-icon size="18" color="medium-emphasis" class="drag-handle mt-1" style="flex-shrink: 0">
                      mdi-drag-vertical
                    </v-icon>
                    <div class="flex-grow-1" style="min-width: 0">
                      <div class="d-flex align-start justify-space-between mb-1">
                        <div style="min-width: 0; flex: 1">
                          <div class="song-card-title text-truncate">{{ song.title }}</div>
                          <div v-if="song.artist" class="song-card-artist text-truncate">
                            {{ song.artist }}
                          </div>
                        </div>
                        <span
                          class="confidence-dot ml-2"
                          :class="confidenceClass(song.recentScores)"
                          :title="confidenceTitle(song.recentScores)"
                          style="flex-shrink: 0; margin-top: 3px"
                        />
                      </div>
                      <div v-if="song.key || song.bpm" class="d-flex mb-2" style="gap: 16px">
                        <div v-if="song.key">
                          <div class="data-label">Key</div>
                          <v-chip size="x-small" color="primary" variant="tonal">{{ song.key }}</v-chip>
                        </div>
                        <div v-if="song.bpm">
                          <div class="data-label">Tempo</div>
                          <v-chip size="x-small" variant="flat" class="chip-bpm">{{ song.bpm }} BPM</v-chip>
                        </div>
                      </div>
                      <!-- Full-form song: show sections -->
                      <template v-if="hasSections(song)">
                        <v-chip size="x-small" color="primary" variant="tonal" class="mb-1">Full form</v-chip>
                        <div v-for="sec in songSections(song)" :key="sec.id" class="section-display-row mb-1">
                          <v-chip size="x-small" variant="flat" class="chip-section section-name-chip">{{ sec.name }}</v-chip>
                          <template v-for="(ch, ci) in sec.chord_chart" :key="'c'+ci">
                            <span v-if="ci > 0" class="section-dot">·</span>
                            <span class="section-chord">{{ ch }}</span>
                          </template>
                          <span class="section-arrow">→</span>
                          <template v-for="(n, ni) in sec.nns_chart" :key="'n'+ni">
                            <span v-if="ni > 0" class="section-dot">·</span>
                            <span class="section-nns">{{ n ?? '?' }}</span>
                          </template>
                        </div>
                        <div v-if="hasFormOrder(song)" class="mt-2">
                          <div class="data-label mb-1">Form</div>
                          <div class="d-flex flex-wrap" style="gap: 6px">
                            <v-chip
                              v-for="(name, fi) in song.form_order" :key="fi"
                              size="small" variant="flat" class="chip-section"
                              style="min-height: 28px"
                            >{{ abbrevSection(name) }}</v-chip>
                          </div>
                        </div>
                      </template>
                      <!-- Simple song: chord/NNS chips with whisper labels -->
                      <template v-else>
                        <template v-if="parsedChords(song).length">
                          <div class="data-label">Chords</div>
                          <div class="d-flex flex-wrap mb-2" style="gap: 4px">
                            <v-chip
                              v-for="(chord, ci) in parsedChords(song)"
                              :key="ci"
                              size="x-small" variant="flat"
                              :class="chordQualityClass(chord)"
                            >{{ chord }}</v-chip>
                          </div>
                        </template>
                        <template v-if="songNNS(song).length">
                          <div class="data-label">NNS</div>
                          <div class="d-flex flex-wrap" style="gap: 4px">
                            <v-chip
                              v-for="(nns, ni) in songNNS(song)"
                              :key="ni"
                              size="x-small" variant="tonal"
                              :color="nns ? 'surface-variant' : 'error'"
                              class="font-weight-medium chip-nns-style"
                            >{{ nns ?? '?' }}</v-chip>
                          </div>
                        </template>
                      </template>
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
                          <!-- Sections transpose -->
                          <template v-if="transposeTargetKeys[song.id] && hasSections(song)">
                            <div v-for="sec in transposedSections(song, transposeTargetKeys[song.id])" :key="sec.id" class="mb-2">
                              <div class="text-caption text-medium-emphasis mb-1">[{{ sec.name }}]</div>
                              <div class="d-flex flex-wrap" style="gap: 3px">
                                <v-chip v-for="(ch, ci) in sec.chord_chart" :key="ci" size="x-small" color="primary" variant="tonal">{{ ch }}</v-chip>
                              </div>
                            </div>
                            <div v-if="capoText(transposeTargetKeys[song.id])" class="text-caption text-medium-emphasis mt-1">
                              <v-icon size="11" class="mr-1">mdi-music-note</v-icon>
                              {{ capoText(transposeTargetKeys[song.id]) }}
                            </div>
                          </template>
                          <!-- Simple song transpose -->
                          <template v-else-if="transposeTargetKeys[song.id] && parsedChords(song).length">
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
    <v-card style="min-height: 100vh; display: flex; flex-direction: column; background: #1A1A1F" class="no-hover">
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
        <v-tooltip
          v-for="dt in DRILL_TYPES" :key="dt.value"
          :text="dt.requiresSections && !drillHasSections ? 'Requires songs with sections defined'
               : dt.requiresFormOrder && !drillHasFormOrder ? 'Requires songs with song form defined'
               : ''"
          :disabled="!(dt.requiresSections && !drillHasSections) && !(dt.requiresFormOrder && !drillHasFormOrder)"
          location="top"
        >
          <template #activator="{ props: tipProps }">
            <v-card
              v-bind="tipProps"
              class="drill-type-card w-100"
              :class="{ 'drill-type-card--disabled': (dt.requiresSections && !drillHasSections) || (dt.requiresFormOrder && !drillHasFormOrder) }"
              variant="outlined"
              @click="(dt.requiresSections && !drillHasSections) || (dt.requiresFormOrder && !drillHasFormOrder) ? null : startDrill(dt.value)"
            >
              <v-card-text class="pa-4">
                <div class="d-flex align-start" style="gap: 12px">
                  <v-icon
                    :icon="dt.icon"
                    :color="(dt.requiresSections && !drillHasSections) || (dt.requiresFormOrder && !drillHasFormOrder) ? undefined : 'primary'"
                    size="24" style="flex-shrink: 0; margin-top: 2px"
                  />
                  <div>
                    <div class="text-subtitle-2 font-weight-bold mb-1">{{ dt.label }}</div>
                    <div class="text-caption text-medium-emphasis">{{ dt.description }}</div>
                    <div
                      v-if="(dt.requiresSections && !drillHasSections) || (dt.requiresFormOrder && !drillHasFormOrder)"
                      class="text-caption mt-1" style="color: rgba(200,169,110,0.6)"
                    >Requires song sections</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </template>
        </v-tooltip>
        <v-alert v-if="drillError" type="error" variant="tonal" density="compact">{{ drillError }}</v-alert>
      </div>

      <!-- Phase: drilling -->
      <div
        v-else-if="drillPhase === 'drilling' && drillCurrentSong"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
        style="max-width: 560px; margin: 0 auto; width: 100%"
      >
        <div class="drill-song-title mb-1">{{ drillCurrentSong.title }}</div>
        <div v-if="drillCurrentSong.artist" class="text-caption text-medium-emphasis mb-4">
          {{ drillCurrentSong.artist }}
        </div>

        <!-- NNS Flash -->
        <template v-if="drillType === 'nns'">
          <div class="drill-prompt-text mb-3">Recall the chords for this progression:</div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 8px">
            <span v-for="(n, i) in drillNNS" :key="i" class="drill-nns-number">{{ n ?? '?' }}</span>
          </div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
              <div class="text-caption text-medium-emphasis mb-2">
                Chords ({{ drillCurrentSong.key }}):
              </div>
              <div class="d-flex flex-wrap justify-center mb-4" style="gap: 6px">
                <v-chip
                  v-for="(ch, i) in drillChords" :key="i"
                  color="secondary" variant="tonal" size="small"
                  style="cursor: pointer"
                  :class="{ 'chip-viz-active': drillVizChord === ch }"
                  @click="drillVizChord = drillVizChord === ch ? null : ch"
                >{{ ch }}</v-chip>
              </div>
              <v-expand-transition>
                <div v-if="showFingering && drillVizChord" class="mb-4">
                  <ChordVisualizer :chord-name="drillVizChord" :compact="true" />
                </div>
              </v-expand-transition>
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
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
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
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
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

        <!-- Form Drill -->
        <template v-else-if="drillType === 'form'">
          <div class="text-caption text-medium-emphasis mb-2">
            What are the chords for this section?
            <span style="opacity:0.55"> ({{ drillSectionIdx + 1 }}/{{ drillSectionsOrdered.length }})</span>
          </div>
          <v-chip color="primary" variant="flat" class="mb-6 px-4" style="font-size:1.1rem; font-weight:700; height:40px">
            {{ drillSectionsOrdered[drillSectionIdx]?.name ?? '—' }}
          </v-chip>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
              <div class="d-flex flex-wrap justify-center mb-2" style="gap: 6px">
                <v-chip v-for="(ch, i) in drillSectionsOrdered[drillSectionIdx]?.chord_chart ?? []" :key="i" color="secondary" variant="tonal" size="small">{{ ch }}</v-chip>
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(n, i) in drillSectionsOrdered[drillSectionIdx]?.nns_chart ?? []" :key="i" color="primary" variant="tonal" size="small">{{ n ?? '?' }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Section Flash -->
        <template v-else-if="drillType === 'section_flash'">
          <div class="text-caption text-medium-emphasis mb-3">
            Which section is this?
            <span style="opacity:0.55"> ({{ drillSectionIdx + 1 }}/{{ drillSectionsOrdered.length }})</span>
          </div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
            <v-chip v-for="(ch, i) in drillSectionsOrdered[drillSectionIdx]?.chord_chart ?? []" :key="i" variant="outlined" size="small">{{ ch }}</v-chip>
          </div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
              <v-chip color="primary" variant="flat" class="mb-3 px-4" style="font-size:1.1rem; font-weight:700; height:40px">
                {{ drillSectionsOrdered[drillSectionIdx]?.name ?? '—' }}
              </v-chip>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(n, i) in drillSectionsOrdered[drillSectionIdx]?.nns_chart ?? []" :key="i" color="primary" variant="tonal" size="small">{{ n ?? '?' }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Transition Drill -->
        <template v-else-if="drillType === 'transition'">
          <div class="text-caption text-medium-emphasis mb-2">
            You just finished:
            <span style="opacity:0.55"> ({{ drillSectionIdx + 1 }}/{{ drillSectionsOrdered.length }})</span>
          </div>
          <v-chip color="secondary" variant="flat" class="mb-3 px-4" style="font-size:1.1rem; font-weight:700; height:40px">
            {{ drillSectionsOrdered[drillSectionIdx]?.currentName ?? '—' }}
          </v-chip>
          <div class="text-caption text-medium-emphasis mb-6">What comes next in the form?</div>
          <v-expand-transition>
            <div v-if="drillCardPhase === 'reveal'" class="w-100 drill-reveal-content">
              <v-chip color="primary" variant="flat" class="mb-3 px-4" style="font-size:1.1rem; font-weight:700; height:40px">
                {{ drillSectionsOrdered[drillSectionIdx]?.nextName ?? '—' }}
              </v-chip>
              <div class="d-flex flex-wrap justify-center mb-2" style="gap: 6px">
                <v-chip v-for="(ch, i) in drillSectionsOrdered[drillSectionIdx]?.nextSection?.chord_chart ?? []" :key="i" color="secondary" variant="tonal" size="small">{{ ch }}</v-chip>
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(n, i) in drillSectionsOrdered[drillSectionIdx]?.nextSection?.nns_chart ?? []" :key="i" color="primary" variant="tonal" size="small">{{ n ?? '?' }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Action buttons -->
        <v-btn
          v-if="drillCardPhase === 'question'"
          color="primary" variant="flat" size="large"
          block style="min-height: 52px; font-size: 1rem; font-weight: 600; max-width: 400px"
          @click="revealDrillCard"
        >Reveal</v-btn>

        <!-- Section drills: Next section or rate -->
        <template v-else-if="['form','section_flash','transition'].includes(drillType)">
          <v-btn
            v-if="drillSectionIdx < drillSectionsOrdered.length - 1"
            color="primary" variant="tonal" size="large"
            block style="min-height: 52px; max-width: 400px"
            @click="advanceSectionDrill"
          >Next <span class="text-caption ml-1">({{ drillSectionIdx + 1 }}/{{ drillSectionsOrdered.length }})</span></v-btn>
          <div v-else class="d-flex flex-column align-center w-100" style="gap: 10px; max-width: 400px">
            <v-btn color="success" variant="flat" block :loading="drillSavingRating" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateCurrentSong('got_it')">
              <v-icon start>mdi-check-circle-outline</v-icon>Got it
            </v-btn>
            <v-btn color="warning" variant="flat" block :loading="drillSavingRating" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateCurrentSong('almost')">
              <v-icon start>mdi-minus-circle-outline</v-icon>Almost
            </v-btn>
            <v-btn color="error" variant="flat" block :loading="drillSavingRating" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateCurrentSong('missed')">
              <v-icon start>mdi-close-circle-outline</v-icon>Missed
            </v-btn>
          </div>
        </template>

        <!-- Regular drills: rate after reveal -->
        <div v-else class="d-flex flex-column align-center w-100" style="gap: 10px; max-width: 400px">
          <v-btn
            color="success" variant="flat" block
            :loading="drillSavingRating"
            style="min-height:56px;font-size:1rem;font-weight:600"
            @click="rateCurrentSong('got_it')"
          >
            <v-icon start>mdi-check-circle-outline</v-icon>Got it
          </v-btn>
          <v-btn
            color="warning" variant="flat" block
            :loading="drillSavingRating"
            style="min-height:56px;font-size:1rem;font-weight:600"
            @click="rateCurrentSong('almost')"
          >
            <v-icon start>mdi-minus-circle-outline</v-icon>Almost
          </v-btn>
          <v-btn
            color="error" variant="flat" block
            :loading="drillSavingRating"
            style="min-height:56px;font-size:1rem;font-weight:600"
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
  <v-dialog v-model="songDialog" max-width="540" :persistent="savingSong" scrollable>
    <v-card>
      <v-card-title class="pt-5 pb-0 px-5 panel-title">
        {{ editingSong ? 'Edit Song' : 'New Song' }}
      </v-card-title>
      <v-card-text class="px-5 pt-4">
        <!-- Mode toggle -->
        <v-btn-toggle
          v-model="songFormMode"
          mandatory density="compact" variant="outlined" color="primary"
          class="mb-4" style="width:100%"
        >
          <v-btn value="simple" style="flex:1">Simple</v-btn>
          <v-btn value="full"   style="flex:1">Full Song Form</v-btn>
        </v-btn-toggle>

        <!-- Shared fields -->
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

        <!-- ── Simple mode ───────────────────────────────────────────────── -->
        <template v-if="songFormMode === 'simple'">
          <v-text-field
            v-model="songForm.chord_chart"
            label="Chord chart (comma-separated)"
            placeholder="C, Am, F, G"
            variant="outlined" density="compact" hide-details
            class="mb-2"
          />
          <div v-if="formNNS.length" class="d-flex align-center flex-wrap mb-3" style="gap: 4px; padding-left: 2px">
            <span class="text-caption text-medium-emphasis mr-1">NNS:</span>
            <v-chip v-for="(nns, ni) in formNNS" :key="ni" size="x-small" variant="tonal" :color="nns ? 'primary' : 'error'">{{ nns ?? '?' }}</v-chip>
          </div>
          <v-textarea
            v-model="songForm.notes"
            label="Notes"
            variant="outlined" density="compact"
            rows="2" auto-grow hide-details
          />
        </template>

        <!-- ── Full form mode ─────────────────────────────────────────────── -->
        <template v-else>
          <!-- Section builder -->
          <div class="d-flex align-center mb-2">
            <span class="text-caption text-medium-emphasis" style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase">Sections</span>
            <v-spacer />
            <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-plus" @click="addSection">Add Section</v-btn>
          </div>

          <div
            v-for="(section, si) in songFormSections"
            :key="section.id"
            class="section-row-builder mb-2 pa-3"
            draggable="true"
            @dragstart="onSectionDragStart(si)"
            @dragover.prevent="sectionDragOverIdx = si"
            @drop.prevent="onSectionDrop(si)"
            @dragend="sectionDragSrcIdx = null; sectionDragOverIdx = null"
            :class="{ 'section-row--over': sectionDragOverIdx === si }"
          >
            <div class="d-flex align-center mb-2" style="gap: 8px">
              <v-icon size="16" color="medium-emphasis" style="cursor:grab;flex-shrink:0">mdi-drag-vertical</v-icon>
              <v-combobox
                v-model="section.name"
                :items="SECTION_PRESETS"
                label="Section name"
                variant="outlined" density="compact" hide-details
                style="flex:1"
              />
              <v-btn icon size="x-small" variant="text" color="error" @click="removeSection(si)">
                <v-icon size="14">mdi-close</v-icon>
              </v-btn>
            </div>
            <v-text-field
              v-model="section.chord_chart_str"
              label="Chords (comma-separated)"
              placeholder="C, Am, F, G"
              variant="outlined" density="compact" hide-details
              class="mb-1"
            />
            <div v-if="sectionNNS(section).length" class="d-flex align-center flex-wrap mb-2" style="gap: 3px; padding-left: 2px">
              <span class="text-caption text-medium-emphasis mr-1" style="font-size:0.65rem">NNS:</span>
              <v-chip v-for="(n, ni) in sectionNNS(section)" :key="ni" size="x-small" variant="tonal" :color="n ? 'primary' : 'error'">{{ n ?? '?' }}</v-chip>
            </div>
            <v-text-field
              v-model="section.notes"
              label="Notes (optional)"
              variant="outlined" density="compact" hide-details
            />
          </div>

          <v-btn
            v-if="!songFormSections.length"
            block variant="outlined" color="secondary" size="small"
            prepend-icon="mdi-plus" class="mb-3"
            @click="addSection"
          >Add your first section</v-btn>

          <!-- Form order builder -->
          <div v-if="songFormSections.some(s => s.name?.trim())" class="mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.07)">
            <div class="text-caption text-medium-emphasis mb-2" style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase">
              Song Form (performance order)
            </div>
            <div class="d-flex flex-wrap mb-2" style="gap: 6px">
              <v-chip
                v-for="s in songFormSections.filter(s => s.name?.trim())"
                :key="s.id"
                size="small" variant="outlined" color="secondary"
                style="cursor:pointer"
                @click="songFormOrder.push(s.name)"
              >+ {{ s.name }}</v-chip>
            </div>
            <div v-if="songFormOrder.length" class="d-flex flex-wrap mb-2" style="gap: 4px">
              <v-chip
                v-for="(name, oi) in songFormOrder" :key="oi"
                size="small" variant="tonal" color="primary"
                closable
                @click:close="songFormOrder.splice(oi, 1)"
              >{{ oi + 1 }}. {{ name }}</v-chip>
            </div>
            <div v-if="songFormOrder.length" class="text-right">
              <v-btn size="x-small" variant="text" color="error" @click="songFormOrder = []">Clear form</v-btn>
            </div>
          </div>
        </template>

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
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import { progressionToNNS, noteToSharp, musicalKeys, transposeProgression, getCapoSuggestion, transposeSections } from '../core/musicTheory'
import { useAudio } from '../composables/useAudio'
import AuthModal from '../components/AuthModal.vue'
import ChordVisualizer from '../components/ChordVisualizer.vue'
import { sanitizeText, sanitizeChord } from '../utils/sanitize'
import { validateBPM, validateText, validateChordChart } from '../utils/validate'

defineOptions({ name: 'GigView' })

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

const SECTION_PRESETS = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro', 'Transition', 'Interlude', 'Solo', 'Tag', 'Coda']

const SECTION_ABBREV = {
  Intro: 'In', Verse: 'V', 'Pre-Chorus': 'PC', Chorus: 'Ch',
  Bridge: 'Br', Outro: 'Out', Transition: 'Tr', Interlude: 'Int',
  Solo: 'So', Tag: 'Tag', Coda: 'Co',
}
function abbrevSection(name) {
  return SECTION_ABBREV[name] ?? name.substring(0, 3)
}

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

  const nameVal = validateText(newSetlist.value.name, 'Setlist name', 200)
  if (!nameVal.valid) { setlistError.value = nameVal.error; savingSetlist.value = false; return }
  const venueRaw = newSetlist.value.venue.trim()
  if (venueRaw && venueRaw.length > 200) { setlistError.value = 'Venue must be under 200 characters'; savingSetlist.value = false; return }

  try {
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        user_id: currentUser.value.id,
        name:    sanitizeText(newSetlist.value.name),
        venue:   venueRaw ? sanitizeText(venueRaw) : null,
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
      .select('id, position, songs ( id, title, artist, key, bpm, chord_chart, nns_chart, notes, sections, form_order )')
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

// Song form mode + sections
const songFormMode     = ref('simple') // 'simple' | 'full'
const songFormSections = ref([])       // [{ id, name, chord_chart_str, notes }]
const songFormOrder    = ref([])       // ordered section names for form_order
const sectionDragSrcIdx  = ref(null)
const sectionDragOverIdx = ref(null)

function newSectionRow() {
  return { id: crypto.randomUUID(), name: '', chord_chart_str: '', notes: '' }
}
function addSection() {
  songFormSections.value.push(newSectionRow())
}
function removeSection(idx) {
  const removed = songFormSections.value[idx]
  songFormSections.value.splice(idx, 1)
  // Also remove from form order
  if (removed.name) {
    songFormOrder.value = songFormOrder.value.filter(n => n !== removed.name)
  }
}
function onSectionDragStart(idx) { sectionDragSrcIdx.value = idx }
function onSectionDrop(targetIdx) {
  const src = sectionDragSrcIdx.value
  sectionDragSrcIdx.value = null
  sectionDragOverIdx.value = null
  if (src === null || src === targetIdx) return
  const arr = [...songFormSections.value]
  const [item] = arr.splice(src, 1)
  arr.splice(targetIdx, 0, item)
  songFormSections.value = arr
}

function sectionNNS(section) {
  const { key_root, key_type } = songForm.value
  if (!section.chord_chart_str?.trim() || !key_root) return []
  const chords = section.chord_chart_str.split(',').map(c => c.trim()).filter(Boolean)
  const root = key_type === 'minor' ? getRelativeMajor(key_root) : noteToSharp(key_root)
  return progressionToNNS(chords, root)
}

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
  songFormMode.value = 'simple'
  songFormSections.value = []
  songFormOrder.value = []
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
  const hasSec = Array.isArray(song.sections) && song.sections.length > 0
  songFormMode.value = hasSec ? 'full' : 'simple'
  songFormSections.value = hasSec
    ? song.sections.map(s => ({
        id: s.id,
        name: s.name,
        chord_chart_str: Array.isArray(s.chord_chart) ? s.chord_chart.join(', ') : '',
        notes: s.notes ?? '',
      }))
    : []
  songFormOrder.value = Array.isArray(song.form_order) ? [...song.form_order] : []
  songFormError.value = ''
  songDialog.value = true
}

async function saveSong() {
  if (!songForm.value.title.trim()) return
  savingSong.value = true
  songFormError.value = ''

  // Validate before write
  const titleVal = validateText(songForm.value.title, 'Title', 200)
  if (!titleVal.valid) { songFormError.value = titleVal.error; savingSong.value = false; return }

  const artistRaw = songForm.value.artist.trim()
  if (artistRaw) {
    const artistVal = validateText(artistRaw, 'Artist', 200)
    if (!artistVal.valid) { songFormError.value = artistVal.error; savingSong.value = false; return }
  }

  if (songForm.value.bpm) {
    const bpmVal = validateBPM(songForm.value.bpm)
    if (!bpmVal.valid) { songFormError.value = bpmVal.error; savingSong.value = false; return }
  }

  try {
    const { key_root, key_type, chord_chart } = songForm.value
    const majorRoot = key_type === 'minor' ? getRelativeMajor(key_root) : noteToSharp(key_root)

    let sectionsPayload = []
    let formOrderPayload = []
    let topChords = null
    let topNNS    = null

    if (songFormMode.value === 'full') {
      sectionsPayload = songFormSections.value
        .filter(s => s.name.trim() && s.chord_chart_str.trim())
        .map((s, i) => {
          const chords = s.chord_chart_str.split(',').map(c => sanitizeChord(c)).filter(Boolean)
          const nns = key_root ? progressionToNNS(chords, majorRoot).map(n => n ?? '?') : []
          return { id: s.id, name: sanitizeText(s.name), order: i, chord_chart: chords, nns_chart: nns, notes: sanitizeText(s.notes) }
        })

      // Validate each section's chord chart
      for (const sec of sectionsPayload) {
        if (sec.chord_chart.length > 0) {
          const chartVal = validateChordChart(sec.chord_chart)
          if (!chartVal.valid) { songFormError.value = `Section "${sec.name}": ${chartVal.error}`; savingSong.value = false; return }
        }
      }

      formOrderPayload = [...songFormOrder.value]
      // Flatten unique chords for backward compat
      const allChords = [...new Set(sectionsPayload.flatMap(s => s.chord_chart))]
      topChords = allChords.length ? allChords : null
      topNNS    = topChords && key_root ? progressionToNNS(topChords, majorRoot).map(n => n ?? '?') : null
    } else {
      const rawChords = chord_chart.trim() ? chord_chart.split(',').map(c => sanitizeChord(c)).filter(Boolean) : null
      if (rawChords && rawChords.length > 0) {
        const chartVal = validateChordChart(rawChords)
        if (!chartVal.valid) { songFormError.value = chartVal.error; savingSong.value = false; return }
      }
      topChords = rawChords
      topNNS    = computeNNSChart(chord_chart, key_root, key_type)
    }

    const payload = {
      title:       sanitizeText(songForm.value.title),
      artist:      artistRaw ? sanitizeText(artistRaw) : null,
      key:         keyFromForm(key_root, key_type),
      bpm:         songForm.value.bpm ? parseInt(songForm.value.bpm) : null,
      chord_chart: topChords,
      nns_chart:   topNNS,
      notes:       songFormMode.value === 'simple' ? (sanitizeText(songForm.value.notes) || null) : null,
      sections:    sectionsPayload,
      form_order:  formOrderPayload,
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

function chordQualityClass(chord) {
  if (!chord) return ''
  if (chord.endsWith('dim')) return 'chip-dim'
  if (chord.endsWith('m'))   return 'chip-minor'
  return 'chip-major'
}

function hasSections(song) {
  return Array.isArray(song.sections) && song.sections.length > 0
}

function songSections(song) {
  return hasSections(song) ? song.sections : []
}

function hasFormOrder(song) {
  return Array.isArray(song.form_order) && song.form_order.length > 0
}

function songNNS(song) {
  if (Array.isArray(song.nns_chart) && song.nns_chart.length) return song.nns_chart
  // Fallback: compute live from chord_chart + key (handles songs saved without nns_chart)
  if (!song.key || !Array.isArray(song.chord_chart) || !song.chord_chart.length) return []
  const { root, type } = parseKey(song.key)
  if (!root) return []
  const majorRoot = type === 'minor' ? getRelativeMajor(root) : noteToSharp(root)
  return progressionToNNS(song.chord_chart, majorRoot)
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

function transposedSections(song, toKey) {
  if (!song.key || !hasSections(song) || !toKey) return []
  const { root } = parseKey(song.key)
  if (!root) return []
  return transposeSections(song.sections, root, toKey)
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
      songTitle: song.title + (song.artist ? ' — ' + song.artist : ''),
      chords:  [...song.chord_chart], // plain array for structured-clone
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
  {
    value: 'form',
    label: 'Form Drill',
    icon: 'mdi-format-list-numbered',
    description: 'See a section name — recall its chords. Goes through every section.',
    requiresSections: true,
  },
  {
    value: 'section_flash',
    label: 'Section Flash',
    icon: 'mdi-shuffle-variant',
    description: 'See a section\'s chords — identify which section it is.',
    requiresSections: true,
  },
  {
    value: 'transition',
    label: 'Transition Drill',
    icon: 'mdi-arrow-right-bold',
    description: 'See a section name — recall what comes next in the form.',
    requiresFormOrder: true,
  },
]

const showFingering = ref(localStorage.getItem('cadence_show_fingering') !== 'false')
const drillVizChord = ref(null)

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

// Section-based drill state
const drillSectionsOrdered = ref([]) // sections or pairs, one batch per song
const drillSectionIdx      = ref(0)

const drillHasSections = computed(() =>
  songs.value.some(s => Array.isArray(s.sections) && s.sections.length > 0)
)
const drillHasFormOrder = computed(() =>
  songs.value.some(s => Array.isArray(s.form_order) && s.form_order.length > 1)
)

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
  const { root, type } = parseKey(song.key)
  if (!root) return []
  const majorRoot = type === 'minor' ? getRelativeMajor(root) : noteToSharp(root)
  return progressionToNNS(song.chord_chart, majorRoot)
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

function initSectionDrill(song) {
  drillSectionIdx.value = 0
  if (!song) return
  if (drillType.value === 'form') {
    drillSectionsOrdered.value = Array.isArray(song.sections) ? [...song.sections] : []
  } else if (drillType.value === 'section_flash') {
    const arr = Array.isArray(song.sections) ? [...song.sections] : []
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    drillSectionsOrdered.value = arr
  } else if (drillType.value === 'transition') {
    const sectionMap = {}
    ;(song.sections ?? []).forEach(s => { sectionMap[s.name] = s })
    const pairs = []
    const seen = new Set()
    ;(song.form_order ?? []).forEach((name, i, fo) => {
      if (i < fo.length - 1) {
        const next = fo[i + 1]
        const key = `${name}→${next}`
        if (!seen.has(key) && sectionMap[next]) {
          seen.add(key)
          pairs.push({ currentName: name, nextName: next, nextSection: sectionMap[next] })
        }
      }
    })
    drillSectionsOrdered.value = pairs
  } else {
    drillSectionsOrdered.value = []
  }
}

function advanceSectionDrill() {
  drillSectionIdx.value++
  drillCardPhase.value = 'question'
}

async function startDrill(type) {
  drillType.value = type
  drillLoadingData.value = true
  drillError.value = ''
  try {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('id, position, songs(id, title, artist, key, bpm, chord_chart, nns_chart, sections, form_order)')
      .eq('setlist_id', drillSetlist.value.id)
      .order('position', { ascending: true })
    if (error) throw error

    let songRows = (data ?? [])
      .filter(r => r.songs && Array.isArray(r.songs.chord_chart) && r.songs.chord_chart.length)
      .map(r => r.songs)

    // Filter for section-based drills
    if (type === 'form' || type === 'section_flash') {
      songRows = songRows.filter(s => Array.isArray(s.sections) && s.sections.length > 0)
    } else if (type === 'transition') {
      songRows = songRows.filter(s => Array.isArray(s.form_order) && s.form_order.length > 1)
    }

    if (!songRows.length) {
      drillError.value = (type === 'transition')
        ? 'No songs with a song form defined in this setlist.'
        : 'No songs with sections defined in this setlist.'
      drillLoadingData.value = false
      return
    }

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
    initSectionDrill(ordered[0])
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
    drillVizChord.value = null
    pickTransposeKey()
    initSectionDrill(newQueue[nextIdx])
  }
}

function keepGoing() {
  startDrill(drillType.value)
}

async function revealDrillCard() {
  drillCardPhase.value = 'reveal'
  if (!audioIsLoaded.value) return
  await ensureContext()
  let chords = []
  const t = drillType.value
  if (t === 'transpose') {
    chords = drillTransposedChords.value
  } else if (t === 'form') {
    chords = drillSectionsOrdered.value[drillSectionIdx.value]?.chord_chart ?? []
  } else if (t === 'section_flash') {
    chords = drillSectionsOrdered.value[drillSectionIdx.value]?.chord_chart ?? []
  } else if (t === 'transition') {
    chords = drillSectionsOrdered.value[drillSectionIdx.value]?.nextSection?.chord_chart ?? []
  } else {
    chords = drillChords.value
  }
  chords.forEach((chord, i) => setTimeout(() => audioPlayChord(chord), i * 400))
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(()   => { if (currentUser.value) loadSetlists() })
onActivated(() => { if (currentUser.value) loadSetlists() })

onBeforeRouteLeave(() => {
  drillOpen.value      = false
  songDialog.value     = false
  deleteDialog.value   = false
  newSetlistOpen.value = false
  authOpen.value       = false
})

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

/* section-title class from global.css is also applied */

/* ── Two-panel vertical divider (desktop) ────────────────────────────────── */
@media (min-width: 960px) {
  .gig-left-panel {
    border-right: 1px solid rgba(255,255,255,0.06);
    padding-right: 20px !important;
  }
  .gig-right-panel {
    padding-left: 20px !important;
  }
}

.setlist-card {
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.setlist-card:hover {
  border-color: rgba(200, 169, 110, 0.3) !important;
}
.setlist-card--active {
  border-left: 3px solid #C8A96E !important;
  background: rgba(200, 169, 110, 0.07) !important;
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
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}
.dot--none   { background: rgba(200, 200, 200, 0.2); border: 1px solid rgba(200, 200, 200, 0.3); }
.dot--green  { background: #4B9E6F; }
.dot--yellow { background: #C8A96E; }
.dot--red    { background: #CF4B4B; }
/* pulse-red animation applied via global.css .dot--red rule */

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
.drill-type-card--disabled {
  cursor: default;
  opacity: 0.45;
}
.drill-type-card--disabled:hover {
  border-color: rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
}

/* ── Drill typography ────────────────────────────────────────────────────── */
.drill-song-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #E8E8E0;
  letter-spacing: -0.02em;
}
.drill-prompt-text {
  font-size: 2rem;
  color: rgba(196,196,188,0.7);
  font-weight: 500;
}
.drill-nns-number {
  font-family: 'Space Grotesk', monospace;
  font-size: 2.5rem;
  font-weight: 700;
  color: #C8A96E;
  line-height: 1;
  letter-spacing: -0.01em;
  background: rgba(200,169,110,0.1);
  border-radius: 10px;
  padding: 8px 18px;
}

/* ── Song card title / artist ────────────────────────────────────────────── */
.song-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #E8E8E0;
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.01em;
}
.song-card-artist {
  font-size: 0.85rem;
  color: rgba(196,196,188,0.55);
  margin-top: 1px;
}

/* ── Section row builder (song form editor) ──────────────────────────────── */
.section-row-builder {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  transition: border-color 0.15s;
}
.section-row--over {
  border-color: rgba(200,169,110,0.4) !important;
}

/* ── Section display rows ─────────────────────────────────────────────────── */
.section-display-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  line-height: 1.6;
}
.section-name-chip {
  flex-shrink: 0;
  margin-right: 2px;
}
.section-chord {
  font-weight: 500;
  color: rgba(196, 196, 188, 0.85);
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.section-dot {
  color: rgba(196, 196, 188, 0.3);
  font-size: 0.65rem;
  flex-shrink: 0;
}
.section-arrow {
  color: rgba(196, 196, 188, 0.4);
  font-size: 0.65rem;
  margin: 0 6px;
  flex-shrink: 0;
}
.section-nns {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.62rem;
  color: #6E8EAD;
  padding: 1px 4px;
  background: rgba(110, 142, 173, 0.08);
  border-radius: 4px;
}
</style>
