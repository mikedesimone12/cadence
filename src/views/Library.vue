<template>

  <!-- ── Auth gate ──────────────────────────────────────────────────────────── -->
  <v-container
    v-if="!currentUser"
    class="d-flex align-center justify-center"
    style="min-height: calc(100vh - 120px)"
  >
    <v-card max-width="360" class="pa-6 text-center" variant="outlined">
      <v-icon size="48" color="primary" class="mb-4">mdi-book-music</v-icon>
      <div class="text-h6 mb-2 lib-title">Your Library</div>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Sign in to access your saved songs, practice stats, and achievements.
      </p>
      <v-btn color="primary" variant="flat" @click="authOpen = true">Sign In</v-btn>
    </v-card>
  </v-container>

  <!-- ── Main content ───────────────────────────────────────────────────────── -->
  <v-container v-else fluid class="pb-10 px-3">

    <!-- Page header -->
    <v-row align="center" class="mb-6" no-gutters>
      <v-col>
        <div class="page-title">Library</div>
        <div class="text-caption text-medium-emphasis">Your songs · Practice stats · Progress</div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          icon="mdi-refresh" variant="text" size="small"
          :loading="isLoading"
          @click="loadAllData"
        />
      </v-col>
    </v-row>

    <!-- Global error -->
    <v-alert
      v-if="loadError" type="error" variant="tonal" density="compact"
      closable class="mb-4" @click:close="loadError = ''"
    >{{ loadError }}</v-alert>

    <!-- Loading skeletons (first load only) -->
    <div v-if="isLoading && !songs.length">
      <div class="section-title">Saved Songs</div>
      <v-row class="mb-4">
        <v-col v-for="i in 4" :key="i" cols="12" md="6">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>
      <div class="section-title mt-4">Practice Stats</div>
      <v-row>
        <v-col v-for="i in 4" :key="i" cols="6" sm="3">
          <v-skeleton-loader type="heading,text" class="pa-3" style="min-height: 80px" />
        </v-col>
      </v-row>
    </div>

    <template v-if="!isLoading || songs.length">

      <!-- ════════════════════════════════════════════════════════════════════
           SECTION 1 — SAVED SONGS
           ════════════════════════════════════════════════════════════════════ -->
      <div class="section-title">Saved Songs</div>

      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        placeholder="Search by title or artist…"
        variant="outlined" density="compact" hide-details
        prepend-inner-icon="mdi-magnify"
        clearable
        class="mb-3"
        style="max-width: 500px"
      />

      <!-- Filter chips -->
      <div class="d-flex flex-wrap mb-4" style="gap: 8px">
        <v-chip
          v-for="f in FILTERS" :key="f.value"
          :color="activeFilter === f.value ? 'primary' : undefined"
          :variant="activeFilter === f.value ? 'flat' : 'outlined'"
          size="small" style="cursor: pointer"
          @click="activeFilter = f.value"
        >{{ f.label }}</v-chip>
      </div>

      <!-- No songs at all -->
      <div v-if="!songs.length" class="text-center text-medium-emphasis py-8">
        <v-icon size="40" class="mb-2" style="opacity: 0.3">mdi-music-note-outline</v-icon>
        <div class="text-body-2">No songs yet.</div>
        <div class="text-caption mt-1">Add songs in the Gig tab to see them here.</div>
      </div>

      <!-- No filter results -->
      <div v-else-if="!filteredSongs.length" class="text-center text-medium-emphasis py-6">
        <div class="text-body-2">No songs match this filter.</div>
      </div>

      <!-- Card grid -->
      <v-row v-else>
        <v-col
          v-for="song in filteredSongs" :key="song.id"
          cols="12" md="6"
        >
          <v-card
            class="song-card h-100"
            :class="{ 'song-card--expanded': expandedSongId === song.id }"
            @click="toggleExpand(song.id)"
          >
            <v-card-text class="pa-4">

              <!-- Card header: title + confidence dot + chevron -->
              <div class="d-flex align-start justify-space-between mb-2">
                <div style="min-width: 0; flex: 1">
                  <div class="song-title text-truncate">{{ song.title }}</div>
                  <div v-if="song.artist" class="lib-song-artist text-truncate">
                    {{ song.artist }}
                  </div>
                </div>
                <div class="d-flex align-center ml-2" style="gap: 6px; flex-shrink: 0">
                  <span
                    class="confidence-dot"
                    :class="confidenceClass(song.recentScores)"
                    :title="confidenceTitle(song.recentScores)"
                  />
                  <v-icon size="16" color="medium-emphasis">
                    {{ expandedSongId === song.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </div>
              </div>

              <!-- Key + Tempo with labels -->
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
              <!-- Date -->
              <div class="mb-2">
                <v-chip size="x-small" color="surface-variant" variant="tonal" class="text-caption" style="opacity:.5">
                  {{ formatDate(song.created_at) }}
                </v-chip>
              </div>

              <!-- Sections or flat chord/NNS chips -->
              <template v-if="hasSections(song)">
                <div class="d-flex flex-wrap mb-2" style="gap: 4px">
                  <v-chip size="x-small" color="primary" variant="tonal">Full form</v-chip>
                </div>
                <div v-for="sec in song.sections" :key="sec.id" class="section-display-row mb-1">
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
                    <v-chip v-for="(name, fi) in song.form_order" :key="fi" size="small" variant="flat" class="chip-section" style="min-height: 28px">
                      {{ abbrevSection(name) }}
                    </v-chip>
                  </div>
                </div>
              </template>
              <template v-else>
                <!-- Chord chips with label -->
                <template v-if="song.chord_chart?.length">
                  <div class="data-label">Chords</div>
                  <div class="d-flex flex-wrap mb-2" style="gap: 3px">
                    <v-chip
                      v-for="(ch, ci) in song.chord_chart" :key="ci"
                      size="x-small" variant="flat"
                      :class="chordQualityClass(ch)"
                    >{{ ch }}</v-chip>
                  </div>
                </template>
                <!-- NNS chips with label -->
                <template v-if="song.nns_chart?.length">
                  <div class="data-label">NNS</div>
                  <div class="d-flex flex-wrap" style="gap: 3px">
                    <v-chip
                      v-for="(nns, ni) in song.nns_chart" :key="ni"
                      size="x-small" variant="tonal"
                      :color="nns && nns !== '?' ? 'surface-variant' : 'error'"
                      class="font-weight-medium chip-nns-style"
                    >{{ nns ?? '?' }}</v-chip>
                  </div>
                </template>
              </template>

              <!-- Expanded section — click.stop so card doesn't re-toggle -->
              <v-expand-transition>
                <div v-if="expandedSongId === song.id" @click.stop>

                  <!-- Notes -->
                  <div v-if="song.notes" class="mt-3">
                    <div class="data-label mb-1">Notes</div>
                    <div class="notes-box text-body-2">{{ song.notes }}</div>
                  </div>

                  <!-- Transpose toggle -->
                  <div class="mt-3">
                    <v-chip
                      size="x-small" color="secondary" variant="tonal"
                      style="cursor: pointer"
                      @click.stop="toggleTranspose(song.id)"
                    >
                      <v-icon start size="11">mdi-music</v-icon>Transpose
                    </v-chip>
                  </div>

                  <v-expand-transition>
                    <div v-if="expandedTranspose[song.id]" class="mt-2 pt-2 transpose-panel">
                      <div class="d-flex align-center flex-wrap mb-2" style="gap: 8px">
                        <v-select
                          v-model="transposeKeys[song.id]"
                          :items="KEY_ROOTS"
                          item-title="label"
                          item-value="value"
                          label="Target key"
                          variant="outlined" density="compact" hide-details
                          style="max-width: 160px; min-width: 130px"
                        />
                        <v-btn
                          v-if="transposeKeys[song.id]"
                          size="x-small" variant="text" color="secondary"
                          prepend-icon="mdi-content-copy"
                          @click.stop="copyTransposed(song)"
                        >Copy</v-btn>
                      </div>
                      <template v-if="transposeKeys[song.id]">
                        <template v-if="hasSections(song)">
                          <div v-for="sec in transposedSectionsList(song, transposeKeys[song.id])" :key="sec.id" class="mb-2">
                            <div class="text-caption text-medium-emphasis mb-1">[{{ sec.name }}]</div>
                            <div class="d-flex flex-wrap" style="gap: 3px">
                              <v-chip v-for="(ch, ci) in sec.chord_chart" :key="ci" size="x-small" color="primary" variant="tonal">{{ ch }}</v-chip>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="song.chord_chart?.length">
                          <div class="d-flex flex-wrap mb-1" style="gap: 3px">
                            <v-chip
                              v-for="(ch, ci) in transposedChords(song, transposeKeys[song.id])"
                              :key="ci" size="x-small" color="primary" variant="tonal"
                            >{{ ch }}</v-chip>
                          </div>
                        </template>
                        <div v-if="capoText(transposeKeys[song.id])" class="text-caption text-medium-emphasis mt-1">
                          <v-icon size="11" class="mr-1">mdi-music-note</v-icon>
                          {{ capoText(transposeKeys[song.id]) }}
                        </div>
                      </template>
                    </div>
                  </v-expand-transition>

                  <!-- Action buttons -->
                  <div class="d-flex flex-wrap mt-4" style="gap: 8px">
                    <v-btn
                      size="small" variant="outlined" color="secondary"
                      prepend-icon="mdi-music-note-plus"
                      @click.stop="router.push('/gig')"
                    >Open in Gig</v-btn>
                    <v-btn
                      size="small" variant="tonal" color="primary"
                      prepend-icon="mdi-piano"
                      :disabled="!song.chord_chart?.length"
                      @click.stop="openInPlay(song)"
                    >Open in Play</v-btn>
                    <v-btn
                      size="small" variant="flat" color="primary"
                      prepend-icon="mdi-play-circle-outline"
                      :disabled="!song.chord_chart?.length"
                      @click.stop="openSingleDrill(song)"
                    >Practice this</v-btn>
                  </div>

                </div>
              </v-expand-transition>

            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ════════════════════════════════════════════════════════════════════
           SECTION 2 — PRACTICE STATS
           ════════════════════════════════════════════════════════════════════ -->
      <div class="section-title mt-7">Practice Stats</div>

      <v-row class="mb-4">
        <v-col v-for="s in statCards" :key="s.label" cols="6" sm="3">
          <v-card class="stat-card text-center pa-4">
            <v-icon class="stat-icon" size="40" color="primary">{{ s.icon }}</v-icon>
            <div class="stat-value">{{ s.value }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ s.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Confidence trend chart -->
      <v-card class="pa-4">
        <div class="section-label mb-3">Confidence trend — last 30 days</div>

        <div v-if="!chartHasData" class="text-center text-medium-emphasis py-6">
          <div class="text-body-2">No practice data yet.</div>
          <div class="text-caption mt-1">Head to the Gig tab to start drilling.</div>
        </div>

        <div v-else>
          <div class="chart-wrap">
            <!-- Y-axis labels -->
            <div class="chart-y-labels text-caption text-medium-emphasis">
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>
            <!-- SVG chart -->
            <svg
              viewBox="0 0 300 70"
              width="100%" height="70"
              preserveAspectRatio="none"
              class="chart-svg"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#C8A96E" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#C8A96E" stop-opacity="0" />
                </linearGradient>
              </defs>
              <!-- Horizontal grid lines -->
              <line x1="0" y1="5"  x2="300" y2="5"  stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="0" y1="37" x2="300" y2="37" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="0" y1="65" x2="300" y2="65" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <!-- Gradient area fill -->
              <path
                :d="svgAreaPath"
                fill="url(#chartGradient)"
                vector-effect="non-scaling-stroke"
              />
              <!-- Gold line -->
              <path
                :d="svgLinePath"
                fill="none"
                stroke="#C8A96E"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
              <!-- Data point dots -->
              <circle
                v-for="(pt, i) in chartDots" :key="i"
                :cx="pt.x" :cy="pt.y" r="3"
                fill="#C8A96E"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div class="d-flex justify-space-between mt-2">
            <span class="text-caption text-medium-emphasis">30 days ago</span>
            <span class="text-caption text-medium-emphasis">Today</span>
          </div>
        </div>
      </v-card>

      <!-- ════════════════════════════════════════════════════════════════════
           SECTION 3 — RECENT ACTIVITY
           ════════════════════════════════════════════════════════════════════ -->
      <div class="section-title mt-7">Recent Activity</div>

      <v-card>
        <div v-if="!recentActivity.length" class="text-center text-medium-emphasis pa-6">
          <v-icon size="32" class="mb-2" style="opacity: 0.3">mdi-history</v-icon>
          <div class="text-body-2">
            No practice sessions yet — head to the Gig tab to start drilling.
          </div>
        </div>

        <template v-else>
          <div
            v-for="(entry, i) in recentActivity" :key="entry.id"
            class="activity-row"
            :class="{ 'activity-row--last': i === recentActivity.length - 1 }"
          >
            <div class="d-flex align-center justify-space-between pa-3" style="gap: 10px">
              <div style="min-width: 0; flex: 1">
                <div class="text-body-2 font-weight-medium text-truncate">{{ entry.songTitle }}</div>
                <div class="text-caption text-medium-emphasis">{{ relativeTime(entry.created_at) }}</div>
              </div>
              <v-chip
                :color="scoreBadgeColor(entry.score)"
                size="x-small" variant="tonal"
                class="font-weight-medium flex-shrink-0"
              >{{ scoreBadgeLabel(entry.score) }}</v-chip>
            </div>
          </div>
        </template>
      </v-card>

      <!-- ════════════════════════════════════════════════════════════════════
           SECTION 4 — ACHIEVEMENTS
           ════════════════════════════════════════════════════════════════════ -->
      <div class="section-title mt-7">Achievements</div>

      <v-row>
        <v-col
          v-for="a in achievements" :key="a.id"
          cols="6" sm="4"
        >
          <v-card
            class="achievement-card pa-4 h-100"
            :class="{ 'achievement-card--unlocked': a.unlocked }"
          >
            <div class="d-flex flex-column align-center text-center" style="gap: 10px">
              <div class="achievement-icon-wrap" :class="{ 'achievement-icon-wrap--unlocked': a.unlocked }">
                <v-icon :color="a.unlocked ? 'primary' : undefined" size="40">{{ a.icon }}</v-icon>
              </div>
              <div>
                <div class="achievement-name" :class="{ 'text-primary': a.unlocked }">{{ a.label }}</div>
                <div class="text-caption text-medium-emphasis mt-1" style="line-height: 1.4">
                  {{ a.description }}
                </div>
              </div>
              <div v-if="!a.unlocked" class="w-100">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-caption text-medium-emphasis">{{ a.progress }}/{{ a.total }}</span>
                </div>
                <v-progress-linear
                  :model-value="Math.round((a.progress / a.total) * 100)"
                  color="primary"
                  bg-color="rgba(255,255,255,0.06)"
                  height="3"
                  rounded
                />
              </div>
              <v-icon v-else size="14" color="primary">mdi-check-circle</v-icon>
            </div>
          </v-card>
        </v-col>
      </v-row>

    </template>
  </v-container>

  <!-- AuthModal -->
  <AuthModal v-model="authOpen" />

  <!-- ── Single-song drill dialog ───────────────────────────────────────────── -->
  <v-dialog v-model="singleDrillOpen" fullscreen transition="dialog-bottom-transition">
    <v-card style="min-height: 100vh; display: flex; flex-direction: column" class="bg-background">
      <v-toolbar density="compact" color="surface" border="b">
        <v-btn icon size="small" @click="singleDrillOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="text-subtitle-1 lib-title">
          {{ singleDrillSong?.title ?? 'Practice' }}
        </v-toolbar-title>
      </v-toolbar>

      <!-- Select drill type -->
      <div
        v-if="singleDrillPhase === 'select'"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6"
        style="gap: 16px; max-width: 480px; margin: 0 auto; width: 100%"
      >
        <div class="text-h6 lib-title mb-2">Choose Drill Type</div>
        <v-tooltip
          v-for="dt in DRILL_TYPES" :key="dt.value"
          :disabled="!isDrillTypeDisabled(dt)"
          text="Song has no sections"
          location="top"
        >
          <template #activator="{ props }">
            <v-card
              v-bind="props"
              class="drill-type-card w-100" variant="outlined"
              :class="{ 'drill-type-card--disabled': isDrillTypeDisabled(dt) }"
              @click="!isDrillTypeDisabled(dt) && startSingleDrill(dt.value)"
            >
              <v-card-text class="pa-4">
                <div class="d-flex align-start" style="gap: 12px">
                  <v-icon
                    :icon="dt.icon"
                    :color="isDrillTypeDisabled(dt) ? undefined : 'primary'"
                    size="24" style="flex-shrink: 0; margin-top: 2px"
                  />
                  <div>
                    <div
                      class="text-subtitle-2 font-weight-bold mb-1"
                      :class="{ 'text-medium-emphasis': isDrillTypeDisabled(dt) }"
                    >{{ dt.label }}</div>
                    <div class="text-caption text-medium-emphasis">{{ dt.description }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </template>
        </v-tooltip>
      </div>

      <!-- Drilling -->
      <div
        v-else-if="singleDrillPhase === 'drilling' && singleDrillSong"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
        style="max-width: 560px; margin: 0 auto; width: 100%"
      >
        <div class="lib-drill-title mb-1">{{ singleDrillSong.title }}</div>
        <div v-if="singleDrillSong.artist" class="text-caption text-medium-emphasis mb-4">
          {{ singleDrillSong.artist }}
        </div>

        <!-- NNS Flash -->
        <template v-if="singleDrillType === 'nns'">
          <div class="lib-drill-prompt mb-3">Recall the chords for this progression:</div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 8px">
            <span v-for="(n, i) in singleDrillNNS" :key="i" class="lib-nns-number">{{ n ?? '?' }}</span>
          </div>
          <v-expand-transition>
            <div v-if="singleDrillReveal" class="w-100 drill-reveal-content">
              <div class="text-caption text-medium-emphasis mb-2">
                Chords ({{ singleDrillSong.key }}):
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip v-for="(ch, i) in singleDrillChords" :key="i" color="secondary" variant="tonal" size="small">
                  {{ ch }}
                </v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Transpose drill -->
        <template v-else-if="singleDrillType === 'transpose'">
          <div class="text-caption text-medium-emphasis mb-1">
            Original key: <strong>{{ singleDrillSong.key }}</strong>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            Target key: <strong class="text-primary">{{ singleDrillTransposeKey }}</strong>
          </div>
          <div class="d-flex flex-wrap justify-center mb-3" style="gap: 6px">
            <v-chip v-for="(ch, i) in singleDrillChords" :key="i" variant="outlined" size="small">{{ ch }}</v-chip>
          </div>
          <div class="text-caption text-medium-emphasis mb-6">Work out the transposed chords…</div>
          <v-expand-transition>
            <div v-if="singleDrillReveal" class="w-100 drill-reveal-content">
              <div class="text-caption text-medium-emphasis mb-2">
                Transposed to {{ singleDrillTransposeKey }}:
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip
                  v-for="(ch, i) in singleDrillTransposedChords" :key="i"
                  color="primary" variant="tonal" size="small"
                >{{ ch }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Reverse drill -->
        <template v-else-if="singleDrillType === 'reverse'">
          <div class="text-caption text-medium-emphasis mb-3">What key? What NNS numbers?</div>
          <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
            <v-chip v-for="(ch, i) in singleDrillChords" :key="i" variant="outlined" size="small">{{ ch }}</v-chip>
          </div>
          <v-expand-transition>
            <div v-if="singleDrillReveal" class="w-100 drill-reveal-content">
              <div class="text-caption text-medium-emphasis mb-2">
                Key: <strong>{{ singleDrillSong.key }}</strong>
              </div>
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 4px">
                <v-chip v-for="(n, i) in singleDrillNNS" :key="i" color="primary" variant="tonal" size="small">
                  {{ n ?? '?' }}
                </v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Form Drill / Section Flash -->
        <template v-else-if="['form', 'section_flash'].includes(singleDrillType)">
          <div class="text-caption text-medium-emphasis mb-2">
            Section {{ singleDrillSectionIdx + 1 }} / {{ singleDrillSectionsOrdered.length }}
          </div>
          <div class="text-subtitle-1 font-weight-bold mb-5 lib-title">
            {{ singleDrillSectionsOrdered[singleDrillSectionIdx]?.name }}
          </div>
          <div class="text-caption text-medium-emphasis mb-3">Recall the chords for this section:</div>
          <v-expand-transition>
            <div v-if="singleDrillReveal" class="w-100 drill-reveal-content">
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip
                  v-for="(ch, i) in (singleDrillSectionsOrdered[singleDrillSectionIdx]?.chord_chart ?? [])"
                  :key="i" color="secondary" variant="tonal" size="small"
                >{{ ch }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Transition Drill -->
        <template v-else-if="singleDrillType === 'transition'">
          <div class="text-caption text-medium-emphasis mb-2">
            Transition {{ singleDrillSectionIdx + 1 }} / {{ singleDrillSectionsOrdered.length }}
          </div>
          <div class="text-subtitle-1 font-weight-bold mb-2 lib-title d-flex align-center justify-center flex-wrap" style="gap: 4px">
            <span>{{ singleDrillSectionsOrdered[singleDrillSectionIdx]?.name }}</span>
            <v-icon size="14">mdi-arrow-right</v-icon>
            <span>{{ singleDrillSectionsOrdered[singleDrillSectionIdx]?.nextName }}</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-6">Recall the chords for the next section:</div>
          <v-expand-transition>
            <div v-if="singleDrillReveal" class="w-100 drill-reveal-content">
              <div class="d-flex flex-wrap justify-center mb-6" style="gap: 6px">
                <v-chip
                  v-for="(ch, i) in (singleDrillSectionsOrdered[singleDrillSectionIdx]?.nextSection?.chord_chart ?? [])"
                  :key="i" color="primary" variant="tonal" size="small"
                >{{ ch }}</v-chip>
              </div>
            </div>
          </v-expand-transition>
        </template>

        <!-- Reveal button -->
        <v-btn
          v-if="!singleDrillReveal"
          color="primary" variant="flat" block
          style="min-height: 52px; font-size: 1rem; font-weight: 600; max-width: 400px"
          @click="revealSingleCard"
        >Reveal</v-btn>

        <!-- After reveal: section types get Next or Rate; standard types get Rate immediately -->
        <template v-else>
          <template v-if="['form', 'section_flash', 'transition'].includes(singleDrillType)">
            <v-btn
              v-if="singleDrillSectionIdx < singleDrillSectionsOrdered.length - 1"
              color="primary" variant="tonal" block
              style="min-height: 52px; max-width: 400px"
              @click="advanceSingleSectionDrill"
            >
              Next ({{ singleDrillSectionIdx + 1 }}/{{ singleDrillSectionsOrdered.length }})
            </v-btn>
            <div v-else class="d-flex flex-column align-center w-100" style="gap: 10px; max-width: 400px">
              <v-btn color="success" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('got_it')">
                <v-icon start>mdi-check-circle-outline</v-icon>Got it
              </v-btn>
              <v-btn color="warning" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('almost')">
                <v-icon start>mdi-minus-circle-outline</v-icon>Almost
              </v-btn>
              <v-btn color="error" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('missed')">
                <v-icon start>mdi-close-circle-outline</v-icon>Missed
              </v-btn>
            </div>
          </template>
          <div v-else class="d-flex flex-column align-center w-100" style="gap: 10px; max-width: 400px">
            <v-btn color="success" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('got_it')">
              <v-icon start>mdi-check-circle-outline</v-icon>Got it
            </v-btn>
            <v-btn color="warning" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('almost')">
              <v-icon start>mdi-minus-circle-outline</v-icon>Almost
            </v-btn>
            <v-btn color="error" variant="flat" block :loading="singleDrillSaving" style="min-height:56px;font-size:1rem;font-weight:600" @click="rateSingleDrill('missed')">
              <v-icon start>mdi-close-circle-outline</v-icon>Missed
            </v-btn>
          </div>
        </template>
      </div>

      <!-- Done -->
      <div
        v-else-if="singleDrillPhase === 'done'"
        class="flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
      >
        <v-icon size="52" :color="doneIconColor" class="mb-3">{{ doneIcon }}</v-icon>
        <div class="text-h6 lib-title mb-1">{{ doneLabel }}</div>
        <div v-if="singleDrillSong" class="text-body-2 text-medium-emphasis mb-6">
          {{ singleDrillSong.title }}
        </div>
        <v-btn color="primary" variant="outlined" @click="singleDrillOpen = false">Done</v-btn>
      </div>

    </v-card>
  </v-dialog>

</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useAudio } from '../composables/useAudio'
import { supabase } from '../lib/supabase'
import {
  progressionToNNS, transposeProgression, getCapoSuggestion,
  noteToSharp, musicalKeys, transposeSections,
} from '../core/musicTheory'
import AuthModal from '../components/AuthModal.vue'

defineOptions({ name: 'LibraryView' })

// ─── Constants ───────────────────────────────────────────────────────────────

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

const FILTERS = [
  { label: 'All',             value: 'all'   },
  { label: 'High Confidence', value: 'high'  },
  { label: 'Needs Work',      value: 'needs' },
  { label: 'No Practice',     value: 'none'  },
]

const DRILL_TYPES = [
  {
    value: 'nns', label: 'NNS Flash', icon: 'mdi-pound',
    description: 'See the Nashville numbers — recall the chords mentally, then reveal.',
    requiresSections: false, requiresFormOrder: false,
  },
  {
    value: 'transpose', label: 'Transpose Drill', icon: 'mdi-swap-vertical',
    description: 'See original chords — work out the transposition to a random key.',
    requiresSections: false, requiresFormOrder: false,
  },
  {
    value: 'reverse', label: 'Reverse Drill', icon: 'mdi-magnify',
    description: 'See the chord names — identify the key and NNS numbers.',
    requiresSections: false, requiresFormOrder: false,
  },
  {
    value: 'form', label: 'Form Drill', icon: 'mdi-format-list-numbered',
    description: 'Work through each section of the song in order.',
    requiresSections: true, requiresFormOrder: false,
  },
  {
    value: 'section_flash', label: 'Section Flash', icon: 'mdi-shuffle-variant',
    description: 'Sections shown in random order — recall the chords for each.',
    requiresSections: true, requiresFormOrder: false,
  },
  {
    value: 'transition', label: 'Transition Drill', icon: 'mdi-arrow-right-bold',
    description: 'Practice the chord changes between consecutive sections.',
    requiresSections: false, requiresFormOrder: true,
  },
]

const SECTION_ABBREV = { Intro: 'In', Verse: 'V', 'Pre-Chorus': 'PC', Chorus: 'Ch', Bridge: 'Br', Outro: 'Out', Transition: 'Tr', Interlude: 'Int', Solo: 'So', Tag: 'Tag', Coda: 'Co' }
function abbrevSection(name) { return SECTION_ABBREV[name] ?? name.substring(0, 3) }

// Chart coordinate constants (viewBox 300×70)
const C_W  = 300
const C_H  = 70
const C_PT = 5   // pad top
const C_PB = 5   // pad bottom
const C_N  = 30

function chartX(i) { return (i / (C_N - 1)) * C_W }
function chartY(v) {
  const inner = C_H - C_PT - C_PB
  return C_PT + inner - (v / 100) * inner
}

// ─── Auth / Router ────────────────────────────────────────────────────────────

const { currentUser } = useAuth()
const router = useRouter()
const authOpen = ref(false)

// ─── Audio (for drill reveal) ─────────────────────────────────────────────────

const { playChord: audioPlayChord, loadInstruments, ensureContext } = useAudio()

// ─── Data state ───────────────────────────────────────────────────────────────

const songs          = ref([])
const sessions       = ref([])
const setlistCount   = ref(0)
const isLoading      = ref(false)
const loadError      = ref('')

// ─── UI state ────────────────────────────────────────────────────────────────

const searchQuery     = ref('')
const activeFilter    = ref('all')
const expandedSongId  = ref(null)
const expandedTranspose = ref({})
const transposeKeys   = ref({})

// ─── Drill state ─────────────────────────────────────────────────────────────

const singleDrillOpen            = ref(false)
const singleDrillSong            = ref(null)
const singleDrillType            = ref(null)
const singleDrillPhase           = ref('select')
const singleDrillReveal          = ref(false)
const singleDrillRating          = ref(null)
const singleDrillSaving          = ref(false)
const singleDrillTransposeKey    = ref(null)
const singleDrillSectionsOrdered = ref([])
const singleDrillSectionIdx      = ref(0)

// ─── Load all data ────────────────────────────────────────────────────────────

async function loadAllData() {
  if (!currentUser.value) return
  console.log('[Library] loadAllData fired')
  isLoading.value = true
  loadError.value = ''

  try {
    // Songs
    const { data: songRows, error: sErr } = await supabase
      .from('songs')
      .select('*')
      .eq('user_id', currentUser.value.id)
      .order('created_at', { ascending: false })
    if (sErr) throw sErr

    const songList = songRows ?? []
    const songIds  = songList.map(s => s.id)

    // Practice sessions (filtered through song ownership)
    const { data: sessionRows } = songIds.length
      ? await supabase
          .from('practice_sessions')
          .select('id, song_id, score, created_at')
          .in('song_id', songIds)
          .order('created_at', { ascending: false })
      : { data: [] }
    const sessionList = sessionRows ?? []

    // Setlist count (for First Gig achievement)
    const { count: slCount } = await supabase
      .from('setlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', currentUser.value.id)

    // Build recentScores per song (last 3 sessions)
    const scoreMap = {}
    sessionList.forEach(s => {
      if (!scoreMap[s.song_id]) scoreMap[s.song_id] = []
      if (scoreMap[s.song_id].length < 3) scoreMap[s.song_id].push(s.score)
    })

    songs.value      = songList.map(s => ({ ...s, recentScores: scoreMap[s.id] ?? [] }))
    sessions.value   = sessionList
    setlistCount.value = slCount ?? 0
  } catch (e) {
    loadError.value = e.message
  } finally {
    isLoading.value = false
  }
}

onMounted(()   => { if (currentUser.value) loadAllData() })
onActivated(() => { if (currentUser.value) loadAllData() })
watch(currentUser, u => { if (u) loadAllData() })

// ─── Data helpers ─────────────────────────────────────────────────────────────

function computeStats(sessionList) {
  if (!sessionList.length) return { totalPracticed: 0, totalDrills: 0, avgScore: 0, streak: 0 }
  const totalPracticed = new Set(sessionList.map(s => s.song_id)).size
  const totalDrills    = sessionList.length
  const avgScore       = Math.round(sessionList.reduce((sum, s) => sum + s.score, 0) / totalDrills)
  const streak         = computeStreak(sessionList)
  return { totalPracticed, totalDrills, avgScore, streak }
}

function computeStreak(sessionList) {
  if (!sessionList.length) return 0
  const days = new Set(sessionList.map(s => s.created_at.substring(0, 10)))
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().substring(0, 10)
    if (days.has(ds)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function buildChartData(sessionList) {
  const byDay = {}
  sessionList.forEach(s => {
    const day = s.created_at.substring(0, 10)
    if (!byDay[day]) byDay[day] = { total: 0, count: 0 }
    byDay[day].total += s.score
    byDay[day].count++
  })
  const result = []
  const today  = new Date()
  for (let i = C_N - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds  = d.toISOString().substring(0, 10)
    const rec = byDay[ds]
    result.push({ date: ds, avg: rec ? Math.round(rec.total / rec.count) : null })
  }
  return result
}

function buildActivity(recentSessions, songList) {
  const songMap = {}
  songList.forEach(s => { songMap[s.id] = s })
  return recentSessions.map(s => ({
    ...s,
    songTitle: songMap[s.song_id]?.title ?? 'Unknown',
  }))
}

function computeAchievements(songList, sessionList, slCount) {
  const lastScore = {}
  sessionList.forEach(s => { if (!(s.song_id in lastScore)) lastScore[s.song_id] = s.score })

  const highConfSongs  = songList.filter(s => lastScore[s.id] === 100).length
  const streak         = computeStreak(sessionList)
  const songsWithCharts = songList.filter(s => Array.isArray(s.chord_chart) && s.chord_chart.length).length
  const uniqueKeys     = new Set(songList.map(s => s.key).filter(Boolean)).size

  return [
    {
      id: 'first_gig', label: 'First Gig',
      description: 'Create your first setlist',
      icon: 'mdi-music-note-plus',
      unlocked: slCount >= 1, progress: Math.min(slCount, 1), total: 1,
    },
    {
      id: 'know_changes', label: 'Know The Changes',
      description: '10 songs at full confidence',
      icon: 'mdi-check-decagram',
      unlocked: highConfSongs >= 10, progress: highConfSongs, total: 10,
    },
    {
      id: 'woodshedder', label: 'Woodshedder',
      description: '7-day practice streak',
      icon: 'mdi-fire',
      unlocked: streak >= 7, progress: streak, total: 7,
    },
    {
      id: 'nns_pro', label: 'NNS Pro',
      description: '50 drill sessions completed',
      icon: 'mdi-pound',
      unlocked: sessionList.length >= 50, progress: sessionList.length, total: 50,
    },
    {
      id: 'transposer', label: 'Transposer',
      description: '10 songs with chord charts',
      icon: 'mdi-swap-horizontal',
      unlocked: songsWithCharts >= 10, progress: songsWithCharts, total: 10,
    },
    {
      id: 'theory_head', label: 'Theory Head',
      description: 'Songs in 5 different keys',
      icon: 'mdi-lightbulb-on-outline',
      unlocked: uniqueKeys >= 5, progress: uniqueKeys, total: 5,
    },
  ]
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const filteredSongs = computed(() => {
  let list = songs.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.artist?.toLowerCase() ?? '').includes(q)
  )
  switch (activeFilter.value) {
    case 'high':  return list.filter(s => confidenceClass(s.recentScores) === 'dot--green')
    case 'needs': return list.filter(s => ['dot--red', 'dot--yellow'].includes(confidenceClass(s.recentScores)))
    case 'none':  return list.filter(s => confidenceClass(s.recentScores) === 'dot--none')
    default:      return list
  }
})

const computedStats = computed(() => computeStats(sessions.value))
const chartData     = computed(() => buildChartData(sessions.value))
const achievements  = computed(() => computeAchievements(songs.value, sessions.value, setlistCount.value))
const recentActivity = computed(() => buildActivity(sessions.value.slice(0, 10), songs.value))

const statCards = computed(() => {
  const { totalPracticed, totalDrills, avgScore, streak } = computedStats.value
  return [
    { label: 'Songs practiced', value: totalPracticed, icon: 'mdi-music-note-outline' },
    { label: 'Drill sessions',  value: totalDrills,    icon: 'mdi-dumbbell' },
    { label: 'Avg confidence',  value: totalDrills ? `${avgScore}%` : '—', icon: 'mdi-chart-line' },
    { label: 'Day streak',      value: streak > 0 ? `${streak}` : '—', icon: 'mdi-fire' },
  ]
})

const chartHasData = computed(() => chartData.value.some(d => d.avg !== null))

const svgLinePath = computed(() => {
  let d = '', moving = true
  chartData.value.forEach((pt, i) => {
    if (pt.avg === null) { moving = true; return }
    const x = chartX(i).toFixed(1), y = chartY(pt.avg).toFixed(1)
    d += moving ? `M${x},${y}` : `L${x},${y}`
    moving = false
  })
  return d
})

const svgAreaPath = computed(() => {
  const pts = chartData.value
  let d = '', moving = true, firstX = null, lastX = null
  pts.forEach((pt, i) => {
    if (pt.avg === null) { moving = true; return }
    const x = chartX(i).toFixed(1), y = chartY(pt.avg).toFixed(1)
    if (moving) { d += `M${x},${y}`; if (firstX === null) firstX = x }
    else d += `L${x},${y}`
    lastX = x
    moving = false
  })
  if (firstX !== null && lastX !== null) d += ` L${lastX},65 L${firstX},65 Z`
  return d
})

const chartDots = computed(() =>
  chartData.value
    .map((pt, i) => pt.avg !== null ? { x: chartX(i), y: chartY(pt.avg) } : null)
    .filter(Boolean)
)

// ─── Song card helpers ────────────────────────────────────────────────────────

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

function toggleExpand(songId) {
  expandedSongId.value = expandedSongId.value === songId ? null : songId
}

function toggleTranspose(songId) {
  expandedTranspose.value = { ...expandedTranspose.value, [songId]: !expandedTranspose.value[songId] }
}

function parseKey(key) {
  if (!key) return { root: null, type: 'major' }
  if (key.length > 1 && key.endsWith('m')) return { root: key.slice(0, -1), type: 'minor' }
  return { root: key, type: 'major' }
}

function getRelativeMajor(minorRoot) {
  const sharp = noteToSharp(minorRoot)
  for (const [root, chords] of Object.entries(musicalKeys)) {
    if (chords[5].slice(0, -1) === sharp) return root
  }
  return sharp
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

function hasSections(song) { return Array.isArray(song?.sections) && song.sections.length > 0 }
function hasFormOrder(song) { return Array.isArray(song?.form_order) && song.form_order.length > 1 }

function transposedSectionsList(song, toKey) {
  if (!hasSections(song) || !song.key || !toKey) return []
  const { root } = parseKey(song.key)
  if (!root) return []
  return transposeSections(song.sections, root, toKey)
}

function isDrillTypeDisabled(dt) {
  if (dt.requiresSections)  return !hasSections(singleDrillSong.value)
  if (dt.requiresFormOrder) return !hasFormOrder(singleDrillSong.value)
  return false
}

async function copyTransposed(song) {
  const toKey = transposeKeys.value[song.id]
  if (!toKey) return
  let text
  if (hasSections(song)) {
    text = transposedSectionsList(song, toKey).map(s => `[${s.name}] ${s.chord_chart.join(', ')}`).join('\n')
  } else {
    text = transposedChords(song, toKey).join(', ')
  }
  try { await navigator.clipboard.writeText(text) } catch { /* unavailable */ }
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relativeTime(dateStr) {
  const diffMs    = Date.now() - new Date(dateStr).getTime()
  const diffMins  = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays  = Math.floor(diffHours / 24)
  if (diffMins  < 1)  return 'just now'
  if (diffMins  < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays  < 7)  return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreBadgeColor(score) {
  if (score === 100) return 'success'
  if (score === 60)  return 'warning'
  return 'error'
}
function scoreBadgeLabel(score) {
  if (score === 100) return 'Got it'
  if (score === 60)  return 'Almost'
  return 'Missed'
}

// ─── Open in Play ─────────────────────────────────────────────────────────────

function openInPlay(song) {
  if (!Array.isArray(song.chord_chart) || !song.chord_chart.length) return
  const { root, type } = parseKey(song.key ?? '')
  router.push({
    path: '/play',
    state: {
      _cadenceLoad: true,
      songTitle:  song.title + (song.artist ? ' — ' + song.artist : ''),
      chords:     [...song.chord_chart],
      key:        root ?? 'C',
      keyType:    type,
      bpm:        song.bpm ?? 80,
      sections:   song.sections  ? JSON.parse(JSON.stringify(song.sections))  : [],
      formOrder:  song.form_order ? [...song.form_order] : [],
    },
  })
}

// ─── Single-song drill ────────────────────────────────────────────────────────

const singleDrillChords = computed(() => {
  const song = singleDrillSong.value
  return Array.isArray(song?.chord_chart) ? song.chord_chart : []
})

const singleDrillNNS = computed(() => {
  const song = singleDrillSong.value
  if (!song) return []
  if (Array.isArray(song.nns_chart) && song.nns_chart.length) return song.nns_chart
  if (!song.key || !Array.isArray(song.chord_chart)) return []
  const { root, type } = parseKey(song.key)
  if (!root) return []
  const majorRoot = type === 'minor' ? getRelativeMajor(root) : noteToSharp(root)
  return progressionToNNS(song.chord_chart, majorRoot)
})

const singleDrillTransposedChords = computed(() => {
  const song = singleDrillSong.value
  if (!song?.key || !singleDrillTransposeKey.value || !Array.isArray(song.chord_chart)) return []
  const { root } = parseKey(song.key)
  return root ? transposeProgression(song.chord_chart, root, singleDrillTransposeKey.value) : []
})

const doneIcon = computed(() => {
  if (singleDrillRating.value === 'got_it') return 'mdi-check-circle-outline'
  if (singleDrillRating.value === 'almost') return 'mdi-minus-circle-outline'
  return 'mdi-close-circle-outline'
})
const doneIconColor = computed(() => {
  if (singleDrillRating.value === 'got_it') return 'success'
  if (singleDrillRating.value === 'almost') return 'warning'
  return 'error'
})
const doneLabel = computed(() => {
  if (singleDrillRating.value === 'got_it') return 'Got it!'
  if (singleDrillRating.value === 'almost') return 'Almost there'
  return 'Keep practicing'
})

function initSingleSectionDrill(song, type) {
  singleDrillSectionIdx.value = 0
  if (type === 'form') {
    singleDrillSectionsOrdered.value = [...(song.sections ?? [])]
  } else if (type === 'section_flash') {
    const arr = [...(song.sections ?? [])]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    singleDrillSectionsOrdered.value = arr
  } else if (type === 'transition') {
    const sects = song.sections ?? []
    const sectMap = {}
    sects.forEach(s => { sectMap[s.name] = s })
    const pairs = []
    const seen = new Set()
    const fo = song.form_order ?? []
    for (let i = 0; i < fo.length - 1; i++) {
      const key = fo[i] + '→' + fo[i + 1]
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push({ name: fo[i], nextName: fo[i + 1], nextSection: sectMap[fo[i + 1]] ?? null })
      }
    }
    singleDrillSectionsOrdered.value = pairs
  }
}

function advanceSingleSectionDrill() {
  singleDrillSectionIdx.value++
  singleDrillReveal.value = false
}

function openSingleDrill(song) {
  singleDrillSong.value            = song
  singleDrillType.value            = null
  singleDrillPhase.value           = 'select'
  singleDrillReveal.value          = false
  singleDrillRating.value          = null
  singleDrillTransposeKey.value    = null
  singleDrillSectionsOrdered.value = []
  singleDrillSectionIdx.value      = 0
  singleDrillOpen.value            = true
  loadInstruments()
}

function startSingleDrill(type) {
  singleDrillType.value   = type
  singleDrillPhase.value  = 'drilling'
  singleDrillReveal.value = false
  if (type === 'transpose') pickDrillTransposeKey()
  if (['form', 'section_flash', 'transition'].includes(type)) initSingleSectionDrill(singleDrillSong.value, type)
}

function pickDrillTransposeKey() {
  const song = singleDrillSong.value
  if (!song?.key) return
  const { root: fromRoot } = parseKey(song.key)
  const others = KEY_ROOTS.map(k => k.value).filter(k => k !== fromRoot)
  singleDrillTransposeKey.value = others[Math.floor(Math.random() * others.length)]
}

async function revealSingleCard() {
  singleDrillReveal.value = true
  try {
    await ensureContext()
    let chords
    if (['form', 'section_flash'].includes(singleDrillType.value)) {
      chords = singleDrillSectionsOrdered.value[singleDrillSectionIdx.value]?.chord_chart ?? []
    } else if (singleDrillType.value === 'transition') {
      chords = singleDrillSectionsOrdered.value[singleDrillSectionIdx.value]?.nextSection?.chord_chart ?? []
    } else {
      chords = singleDrillType.value === 'transpose'
        ? singleDrillTransposedChords.value
        : singleDrillChords.value
    }
    chords.forEach((chord, i) => setTimeout(() => audioPlayChord(chord), i * 400))
  } catch { /* non-blocking */ }
}

async function rateSingleDrill(rating) {
  const score = rating === 'got_it' ? 100 : rating === 'almost' ? 60 : 0
  singleDrillSaving.value = true
  try {
    await supabase.from('practice_sessions').insert({ song_id: singleDrillSong.value.id, score })
    // Patch local song confidence
    const local = songs.value.find(s => s.id === singleDrillSong.value.id)
    if (local) local.recentScores = [score, ...(local.recentScores ?? [])].slice(0, 3)
    // Refresh stats in background
    loadAllData()
  } catch { /* non-blocking */ } finally {
    singleDrillSaving.value = false
  }
  singleDrillRating.value = rating
  singleDrillPhase.value  = 'done'
}

onBeforeRouteLeave(() => {
  singleDrillOpen.value = false
  authOpen.value        = false
})

function chordQualityClass(chord) {
  if (!chord) return ''
  if (chord.endsWith('dim')) return 'chip-dim'
  if (chord.endsWith('m'))   return 'chip-minor'
  return 'chip-major'
}
</script>

<style scoped>
/* ── Typography ─────────────────────────────────────────────────────────── */
.page-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #C8A96E;
  margin-bottom: 2px;
}
.lib-title {
  font-family: 'Space Grotesk', sans-serif;
}
.lib-drill-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #E8E8E0;
  letter-spacing: -0.02em;
}
.lib-drill-prompt {
  font-size: 2rem;
  color: rgba(196,196,188,0.7);
  font-weight: 500;
}
.lib-nns-number {
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
.section-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 6px;
  margin-bottom: 12px;
  display: block;
}

/* ── Song card ──────────────────────────────────────────────────────────── */
.song-card {
  cursor: pointer;
  transition: border-color 0.15s;
}
.song-card:hover {
  border-color: rgba(200, 169, 110, 0.25) !important;
}
.song-card--expanded {
  border-color: rgba(200, 169, 110, 0.45) !important;
}
.song-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 600;
}
.lib-song-artist {
  font-size: 0.85rem;
  color: rgba(196,196,188,0.55);
  margin-top: 1px;
}

/* ── Confidence dot ─────────────────────────────────────────────────────── */
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
/* pulse-red animation applied via global.css */

/* ── Expanded content ───────────────────────────────────────────────────── */
.notes-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  white-space: pre-wrap;
  line-height: 1.6;
}
.transpose-panel {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

/* ── Stat cards ─────────────────────────────────────────────────────────── */
.stat-card {
  border-color: rgba(200, 169, 110, 0.15) !important;
  position: relative;
  overflow: hidden;
}
.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #C8A96E;
  line-height: 1;
}
.stat-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0.18;
}

/* ── Chart ──────────────────────────────────────────────────────────────── */
.chart-wrap {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.chart-y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.6rem;
  color: rgba(196, 196, 188, 0.4);
  text-align: right;
  flex-shrink: 0;
  width: 24px;
  padding: 2px 0;
}
.chart-svg {
  flex: 1;
  display: block;
  overflow: visible;
}

/* ── Activity feed ──────────────────────────────────────────────────────── */
.activity-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.activity-row--last {
  border-bottom: none;
}

/* ── Achievements ───────────────────────────────────────────────────────── */
.achievement-card {
  transition: border-color 0.15s;
}
.achievement-card--unlocked {
  border-color: rgba(200, 169, 110, 0.35) !important;
}
.achievement-card:not(.achievement-card--unlocked) {
  filter: grayscale(1);
  opacity: 0.4;
}
.achievement-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* unlocked animation in global.css */
.achievement-icon-wrap--unlocked {
  background: rgba(200, 169, 110, 0.18);
}
.achievement-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ── Drill type card ────────────────────────────────────────────────────── */
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

/* ── Section display (song cards) ───────────────────────────────────────── */
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
