<template>
  <v-container fluid class="pb-8 px-3">

    <!-- ── Page header ────────────────────────────────────────────────────── -->
    <v-row align="center" class="mb-6" no-gutters>
      <v-col>
        <div class="page-title">Explore</div>
        <div class="text-caption text-medium-emphasis">Build a progression · Find your key</div>
      </v-col>
      <v-col cols="auto">
        <div class="d-flex align-center">
          <v-progress-circular
            v-if="isAudible && !isLoaded"
            indeterminate color="primary" size="14" width="2"
            class="mr-2" title="Loading sounds…"
          />
          <v-btn icon="mdi-cog-outline" variant="text" size="small" @click="settingsOpen = true" />
        </div>
      </v-col>
    </v-row>

    <!-- ── Settings dialog ───────────────────────────────────────────────── -->
    <v-dialog v-model="settingsOpen" max-width="320">
      <v-card title="Settings">
        <v-card-text>
          <div class="text-overline text-medium-emphasis mb-2">Notation</div>
          <v-btn-toggle
            v-model="sharpsOrFlats"
            mandatory density="compact" variant="outlined" color="primary"
            class="mb-5"
            style="width: 100%"
          >
            <v-btn value="sharps" style="flex:1">Sharps  ♯</v-btn>
            <v-btn value="flats"  style="flex:1">Flats  ♭</v-btn>
          </v-btn-toggle>
          <v-switch v-model="isAudible"     label="Play chord sounds"       hide-details color="primary" class="mb-1" />
          <template v-if="isAudible">
            <div class="text-overline text-medium-emphasis mt-4 mb-2">Instrument</div>
            <v-btn-toggle
              :model-value="activeInstrument"
              mandatory density="compact" variant="outlined" color="primary"
              class="mb-4"
              style="width: 100%"
              @update:model-value="setInstrument"
            >
              <v-btn value="piano"  style="flex: 1">Piano</v-btn>
              <v-btn value="guitar" style="flex: 1">Guitar</v-btn>
              <v-btn value="both"   style="flex: 1">Both</v-btn>
            </v-btn-toggle>
            <v-switch
              :model-value="bassEnabled"
              label="Bass note"
              hide-details color="primary" class="mb-3"
              @update:model-value="setBassEnabled"
            />
            <div class="d-flex align-center mb-2" style="gap: 8px">
              <v-icon size="16" color="medium-emphasis">mdi-volume-low</v-icon>
              <v-slider
                :model-value="volume"
                min="0" max="100" step="1"
                color="primary" hide-details
                style="flex: 1"
                @update:model-value="setVolume"
              />
              <v-icon size="16" color="medium-emphasis">mdi-volume-high</v-icon>
            </div>
          </template>
          <v-switch v-model="isShowingTips"   label="Show chord tones on hover" hide-details color="primary" />
          <v-switch v-model="showFingering"   label="Show chord fingering"      hide-details color="primary" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="settingsOpen = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Step 1: Progression row ───────────────────────────────────────── -->
    <div class="section-title">Your Progression</div>

    <v-card
      class="mb-4 progression-card"
      :class="{ 'progression-card--empty': !selectedChordsSharp.length }"
    >
      <v-card-text class="py-3">

        <!-- Empty state -->
        <div v-if="!selectedChordsSharp.length" class="empty-state">
          <v-icon size="20" class="mr-2" color="medium-emphasis">mdi-music-clef-treble</v-icon>
          <span class="text-body-2 text-medium-emphasis">Select chords below to start</span>
        </div>

        <!-- Chips -->
        <div v-else>
          <div class="progression-chips">
            <div
              v-for="(chord, i) in selectedChordsSharp" :key="chord"
              class="drag-wrap"
              :class="{ 'drag-wrap--over': dragOverIndex === i, 'drag-wrap--src': dragSrcIndex === i }"
              draggable="true"
              @dragstart="onDragStart(i, $event)"
              @dragover.prevent="dragOverIndex = i"
              @drop.prevent="onDrop(i)"
              @dragend="dragSrcIndex = null; dragOverIndex = null"
            >
              <v-chip
                :color="chipColor(chord)"
                variant="tonal" size="default"
                class="prog-chip"
                :class="{ 'prog-chip--viz': showFingering && progVizChord === chord }"
                @click.stop="toggleProgVizChord(chord)"
              >
                <v-icon start size="12" style="opacity:0.45">mdi-drag-vertical</v-icon>
                {{ toDisplay(chord) }}
                <template #append>
                  <v-btn
                    v-if="isAudible"
                    icon size="x-small" variant="text" class="ml-n1"
                    @click.stop="playChord(chord)"
                  ><v-icon size="12">mdi-play</v-icon></v-btn>
                  <v-btn
                    icon size="x-small" variant="text" class="ml-n2"
                    @click.stop="removeChord(chord)"
                  ><v-icon size="12">mdi-close</v-icon></v-btn>
                </template>
              </v-chip>
            </div>
          </div>

          <v-alert
            v-if="chordLimitWarning"
            type="warning" variant="tonal" density="compact" closable class="mt-2"
            @click:close="chordLimitWarning = false"
          >7 chords max — remove one to add another.</v-alert>

          <div class="d-flex align-center justify-space-between mt-2">
            <span class="text-caption text-medium-emphasis">
              <v-icon size="12" class="mr-1">mdi-drag-horizontal-variant</v-icon>Drag to reorder
            </span>
            <div class="d-flex align-center" style="gap: 4px">
              <span :class="countColor" class="text-caption">{{ selectedChordsSharp.length }}/7</span>
              <v-btn
                v-if="currentUser"
                variant="text" size="x-small" color="primary"
                prepend-icon="mdi-content-save-outline"
                @click="openSaveDialog"
              >Save</v-btn>
              <v-btn variant="text" size="x-small" color="error" @click="reset">
                Clear all
              </v-btn>
            </div>
          </div>

          <!-- Progression chord visualizer (chip-click driven) -->
          <v-expand-transition>
            <div v-if="showFingering && progVizChord" class="mt-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption text-medium-emphasis">Fingering</span>
                <v-btn icon size="x-small" variant="text" @click="progVizChord = null">
                  <v-icon size="14">mdi-close</v-icon>
                </v-btn>
              </div>
              <ChordVisualizer :chord-name="progVizChord" :compact="false" />
            </div>
          </v-expand-transition>
        </div>

      </v-card-text>
    </v-card>

    <!-- ── Step 2: Chord grid ────────────────────────────────────────────── -->
    <div class="section-title">Pick Chords</div>

    <v-card class="mb-4">
      <v-card-text class="pb-2">
        <div v-for="(group, gi) in chordGroups" :key="group.label">

          <!-- Separator between quality groups -->
          <div v-if="gi > 0" class="group-divider" />

          <!-- Section header -->
          <div class="group-header mb-2">
            <span class="group-label" :class="`group-label--${group.quality}`">{{ group.label }}</span>
          </div>

          <!-- Circle-of-fifths chord buttons -->
          <div class="chord-grid mb-3">
            <v-tooltip
              v-for="c in group.chords"
              :key="c.sharp"
              location="bottom"
              :disabled="!isShowingTips"
            >
              <template #activator="{ props: activatorProps }">
                <button
                  v-bind="activatorProps"
                  class="chord-btn"
                  :class="[
                    `chord-btn--${group.quality}`,
                    { 'chord-btn--selected': isSelected(c.sharp) },
                    { 'chord-btn--viz': showFingering && vizChord === c.sharp && !isSelected(c.sharp) },
                  ]"
                  :style="chordAnimStyle(c.sharp)"
                  @click="handleChordClick(c.sharp)"
                  @pointerdown="onChordPointerDown(c.sharp)"
                  @pointerup="onChordPointerUp(c.sharp)"
                  @pointercancel="pressingChord.value = null"
                >{{ c.display }}</button>
              </template>
              {{ chordTonesToDisplay(c.sharp) }}
            </v-tooltip>
          </div>

        </div>
      </v-card-text>
    </v-card>

    <!-- ── Chord fingering (grid click) ─────────────────────────────────── -->
    <v-expand-transition>
      <div v-if="showFingering && vizChord" class="mb-4">
        <v-card color="surface" class="pa-4 no-hover">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis">Fingering — {{ vizChord }}</span>
            <v-btn icon size="x-small" variant="text" @click="vizChord = null">
              <v-icon size="14">mdi-close</v-icon>
            </v-btn>
          </div>
          <ChordVisualizer :chord-name="vizChord" :compact="false" />
        </v-card>
      </div>
    </v-expand-transition>

    <!-- ── Step 3: Key analysis (unlocks on first chord) ────────────────── -->
    <v-expand-transition>
      <div v-if="selectedChordsSharp.length > 0">

        <!-- Confidence badge -->
        <div class="d-flex align-center mb-3">
          <v-icon :color="confidence.color" size="16" class="mr-1">{{ confidence.icon }}</v-icon>
          <span class="text-body-2 font-weight-medium" :class="`text-${confidence.color}`">
            {{ confidence.label }}
          </span>
          <span v-if="keyPairs.length" class="text-caption text-medium-emphasis ml-2">
            — {{ keyPairs.length }} key{{ keyPairs.length > 1 ? 's' : '' }} found
          </span>
        </div>

        <!-- No match state -->
        <v-card v-if="!keyPairs.length" variant="tonal" color="error" class="mb-4">
          <v-card-text class="text-body-2">
            No exact key match. Some progressions borrow chords from outside the key — try removing the most unusual chord.
          </v-card-text>
        </v-card>

        <!-- Key result cards -->
        <template v-for="pair in visibleKeyPairs" :key="pair.majorRoot">
          <v-card class="mb-3 key-card">
            <v-card-text>

              <!-- Key name + actions -->
              <div class="d-flex align-center mb-3">
                <div class="flex-1-1">
                  <div class="key-title">{{ toDisplayNote(pair.majorRoot) }} Major</div>
                  <div class="text-caption" style="color: rgba(196,196,188,0.5); margin-top: 2px;">
                    Relative minor: {{ relativeMinorDisplay(pair.majorRoot) }}
                  </div>
                </div>
                <div class="d-flex align-center gap-1">
                  <v-chip size="x-small" color="primary" variant="tonal">
                    {{ matchCount(pair.majorRoot) }}/{{ selectedChordsSharp.length }} in key
                  </v-chip>
                  <v-btn
                    v-if="isAudible"
                    icon size="x-small" variant="text"
                    @click="playScale(pair.majorRoot)"
                    title="Play scale"
                  ><v-icon size="14">mdi-play</v-icon></v-btn>
                </div>
              </div>

              <!-- 7 diatonic chords with NNS labels + substitution tooltips -->
              <div class="diatonic-row">
                <v-tooltip
                  v-for="item in diatonicChords(pair.majorRoot)" :key="item.chord"
                  location="top" :open-delay="300"
                >
                  <template #activator="{ props }">
                    <div
                      v-bind="props"
                      class="diatonic-cell"
                      :class="{ 'diatonic-cell--active': item.isSelected }"
                    >
                      <div class="nns-label">{{ item.nns }}</div>
                      <div class="diatonic-name">{{ item.display }}</div>
                    </div>
                  </template>
                  <!-- Substitution tooltip content -->
                  <div>
                    <div class="text-caption font-weight-bold mb-1">
                      {{ item.display }} &nbsp;({{ item.nns }})
                    </div>
                    <div v-if="item.subs.length" class="text-caption">
                      Try instead:
                      <span v-for="(s, si) in item.subs" :key="s.chord">
                        {{ s.display }} ({{ s.nns }})<span v-if="si < item.subs.length - 1"> · </span>
                      </span>
                    </div>
                    <div v-else class="text-caption text-medium-emphasis">No standard substitution</div>
                  </div>
                </v-tooltip>
              </div>

              <div class="text-caption text-medium-emphasis mt-2" style="opacity:0.5;">
                Hover a chord for substitution ideas
              </div>

              <!-- Load all chords from this key / send to Play -->
              <div class="d-flex flex-wrap align-center mt-2" style="gap: 4px">
                <v-btn
                  variant="text" size="x-small" color="secondary" class="ml-n2"
                  @click="loadKey(pair.majorRoot)"
                >
                  <v-icon start size="12">mdi-music-note-plus</v-icon>
                  Explore {{ toDisplayNote(pair.majorRoot) }} major
                </v-btn>
                <v-btn
                  variant="tonal" size="x-small" color="primary"
                  @click="sendToPlay(pair.majorRoot)"
                >
                  <v-icon start size="12">mdi-piano</v-icon>
                  Send to Play
                </v-btn>
              </div>

            </v-card-text>
          </v-card>
        </template>

        <!-- Show more toggle -->
        <v-btn
          v-if="keyPairs.length > 2"
          variant="text" size="small" color="secondary" class="mb-4 ml-n2"
          @click="showAllKeys = !showAllKeys"
        >
          {{ showAllKeys ? 'Show fewer keys' : `Show ${keyPairs.length - 2} more` }}
          <v-icon :icon="showAllKeys ? 'mdi-chevron-up' : 'mdi-chevron-down'" end />
        </v-btn>

        <!-- ── Step 4: Ask Claude — disabled for now ──────────────────────
        <v-expand-transition>
          <div v-if="keyPairs.length > 0">
            <v-divider class="mb-4" />
            ... explain / explainDifferently UI ...
          </div>
        </v-expand-transition>
        ─────────────────────────────────────────────────────────────────── -->

      </div>
    </v-expand-transition>

    <!-- ── Save Progression dialog ──────────────────────────────────────────── -->
    <v-dialog v-model="saveDialogOpen" max-width="380" :persistent="savingProg">
      <v-card>
        <v-card-title class="pt-5 pb-0 px-5" style="font-family: 'Space Grotesk', sans-serif">
          Save Progression
        </v-card-title>
        <v-card-text class="px-5 pt-3">
          <v-text-field
            v-model="saveForm.title"
            label="Title *"
            variant="outlined" density="compact" hide-details
            class="mb-3" autofocus
          />
          <v-text-field
            v-model="saveForm.artist"
            label="Artist"
            variant="outlined" density="compact" hide-details
            class="mb-3"
          />
          <v-text-field
            v-model.number="saveForm.bpm"
            label="BPM"
            type="number" min="40" max="300"
            variant="outlined" density="compact" hide-details
          />
          <v-alert
            v-if="saveError"
            type="error" variant="tonal" density="compact" closable class="mt-3"
            @click:close="saveError = ''"
          >{{ saveError }}</v-alert>
        </v-card-text>
        <v-card-actions class="px-5 pb-4 pt-0">
          <v-spacer />
          <v-btn variant="text" size="small" color="secondary" @click="saveDialogOpen = false">Cancel</v-btn>
          <v-btn
            color="primary" variant="flat" size="small"
            :loading="savingProg"
            :disabled="!saveForm.title.trim()"
            @click="saveProgression"
          >Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Common Progressions ───────────────────────────────────────────── -->
    <div
      class="d-flex align-center mb-2 mt-4"
      style="cursor:pointer; user-select:none"
      @click="progSectionOpen = !progSectionOpen"
    >
      <div class="section-title flex-1-1" style="margin-bottom:0">Common Progressions</div>
      <v-icon
        :icon="progSectionOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="18" color="medium-emphasis" class="ml-2"
      />
    </div>

    <v-expand-transition>
      <div v-if="progSectionOpen" class="mb-5">

        <!-- Key state -->
        <v-card variant="outlined" class="mb-3 prog-key-card">
          <v-card-text class="py-3 px-4">

            <!-- Detected key banner -->
            <template v-if="usingDetectedKey">
              <div class="d-flex align-center">
                <v-icon size="14" color="success" class="mr-1">mdi-key-variant</v-icon>
                <span class="text-body-2">
                  Using detected key:&nbsp;<strong>{{ toDisplayNote(detectedKey) }} Major</strong>
                </span>
                <v-btn
                  size="x-small" variant="text" color="secondary" class="ml-2"
                  @click="onSwapProgKey"
                >change</v-btn>
              </div>
            </template>

            <!-- Key selector -->
            <template v-else>
              <div class="text-caption text-medium-emphasis mb-2">Pick a key to get started</div>
              <div class="prog-key-scroll mb-3">
                <v-btn
                  v-for="note in PROG_NOTES"
                  :key="note"
                  :color="selectedProgKey === note ? 'primary' : undefined"
                  :variant="selectedProgKey === note ? 'flat' : 'outlined'"
                  size="small" class="prog-key-btn"
                  @click="selectedProgKey = note"
                >{{ toDisplayNote(note) }}</v-btn>
              </div>
              <v-btn-toggle
                v-model="selectedProgType"
                mandatory density="compact" variant="outlined" color="primary"
              >
                <v-btn value="major" style="min-width:80px">Major</v-btn>
                <v-btn value="minor" style="min-width:80px">Minor</v-btn>
              </v-btn-toggle>
            </template>

          </v-card-text>
        </v-card>

        <!-- Progression categories -->
        <v-expansion-panels variant="accordion">
          <v-expansion-panel
            v-for="(progs, category) in COMMON_PROGRESSIONS"
            :key="category"
          >
            <v-expansion-panel-title class="text-body-2 font-weight-semibold">
              {{ category }}
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div
                v-for="prog in progs"
                :key="prog.name"
                class="prog-item"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-body-2 font-weight-medium">{{ prog.name }}</span>
                  <v-btn
                    size="x-small" variant="flat" color="primary"
                    :disabled="!activeProgMajorRoot"
                    @click="loadProgression(prog)"
                  >Load</v-btn>
                </div>
                <div class="d-flex flex-wrap mb-1" style="gap:4px">
                  <v-chip
                    v-for="(label, li) in prog.nns"
                    :key="li"
                    size="x-small" variant="tonal"
                    :color="label[0] === label[0].toLowerCase() ? 'secondary' : 'primary'"
                  >{{ label }}</v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mb-1">{{ prog.description }}</div>
                <div class="text-caption" style="opacity:0.4">
                  <span v-for="(ex, ei) in prog.examples" :key="ex.title">
                    {{ ex.title }}<span v-if="ei < prog.examples.length - 1"> · </span>
                  </span>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

      </div>
    </v-expand-transition>

    <!-- ── Reference: extended chords ────────────────────────────────────── -->
    <v-expansion-panels variant="accordion" class="mt-2">
      <v-expansion-panel>
        <v-expansion-panel-title class="text-body-2 text-medium-emphasis">
          Using chords with extensions (7ths, sus, add…)
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 mb-3">
            Cadence works with triads for key detection. If your chart uses extended or altered chords,
            pick the matching triad type — the key analysis still works correctly:
          </p>
          <ul class="text-body-2 mb-0">
            <li class="mb-2">
              <strong>Major</strong> — covers maj7, 6, sus2, sus4, add9, dominant 7
              <span class="text-medium-emphasis">(e.g. G7 or Gsus4 → select G)</span>
            </li>
            <li class="mb-2">
              <strong>Minor</strong> — covers m7, m9, m6, m11
              <span class="text-medium-emphasis">(e.g. Am7 → select Am)</span>
            </li>
            <li>
              <strong>Diminished</strong> — covers dim7 and half-diminished (m7♭5 / ø)
              <span class="text-medium-emphasis">(e.g. Bø → select Bdim)</span>
            </li>
          </ul>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { musicalKeys, noteToSharp, checkKeys, chordToNNS, progressionToNNS, COMMON_PROGRESSIONS } from '@/core/musicTheory.js'
import { useAudio } from '../composables/useAudio'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import ChordVisualizer from '../components/ChordVisualizer.vue'
import { sanitizeText, sanitizeChord } from '../utils/sanitize'
import { validateText, validateBPM } from '../utils/validate'

defineOptions({ name: 'ExploreView' })

// ─── Constants ──────────────────────────────────────────────────────────────

const CHROMATIC     = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
const SHARP_TO_FLAT = { 'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab' }
const MAJOR_ROOTS   = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
const NNS_LABELS    = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const SUB_RULES     = { 1: [3, 6], 4: [2], 5: [7], 6: [1, 3] }
const PROG_NOTES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const MINOR_ORDER      = [5, 6, 0, 1, 2, 3, 4]
// Circle of fifths: C G D A E B | F Bb Eb Ab Db F# (sharps notation)
const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'A#', 'D#', 'G#', 'C#', 'F#']

// ─── State ──────────────────────────────────────────────────────────────────

const selectedChordsSharp = ref([])
const sharpsOrFlats        = ref('sharps')
const isAudible            = ref(true)
const isShowingTips        = ref(true)
const settingsOpen         = ref(false)

// ─── Chord fingering visualizer ───────────────────────────────────────────────

const showFingering = ref(localStorage.getItem('cadence_show_fingering') !== 'false')
watch(showFingering, v => localStorage.setItem('cadence_show_fingering', String(v)))

// Grid chord viz: shown below the chord grid section
const vizChord = ref(null)
function toggleVizChord(chord) {
  vizChord.value = vizChord.value === chord ? null : chord
}

// Progression chip viz: shown inside the progression card
const progVizChord = ref(null)
function toggleProgVizChord(chord) {
  progVizChord.value = progVizChord.value === chord ? null : chord
}
const showAllKeys          = ref(false)
const isExplaining         = ref(false)
const explanationText      = ref('')
const explanationError     = ref('')
const dragSrcIndex         = ref(null)
const dragOverIndex        = ref(null)
const chordLimitWarning    = ref(false)
const progSectionOpen      = ref(false)
const selectedProgKey      = ref(null)
const selectedProgType     = ref('major')
const progKeyOverride      = ref(false)

// ─── Router / auth ────────────────────────────────────────────────────────────

const router = useRouter()
const { currentUser } = useAuth()

// ─── Save progression dialog ──────────────────────────────────────────────────

const saveDialogOpen = ref(false)
const savingProg     = ref(false)
const saveError      = ref('')
const saveForm       = ref({ title: '', artist: '', bpm: 80 })

function openSaveDialog() {
  saveForm.value = { title: '', artist: '', bpm: 80 }
  saveError.value = ''
  saveDialogOpen.value = true
}

async function saveProgression() {
  if (!saveForm.value.title.trim()) return
  savingProg.value = true
  saveError.value = ''

  const titleVal = validateText(saveForm.value.title, 'Title', 200)
  if (!titleVal.valid) { saveError.value = titleVal.error; savingProg.value = false; return }

  const artistRaw = saveForm.value.artist.trim()
  if (artistRaw) {
    const artistVal = validateText(artistRaw, 'Artist', 200)
    if (!artistVal.valid) { saveError.value = artistVal.error; savingProg.value = false; return }
  }

  if (saveForm.value.bpm) {
    const bpmVal = validateBPM(saveForm.value.bpm)
    if (!bpmVal.valid) { saveError.value = bpmVal.error; savingProg.value = false; return }
  }

  try {
    const key = keyPairs.value[0]?.majorRoot ?? null
    const sanitizedChords = selectedChordsSharp.value.map(c => sanitizeChord(c)).filter(Boolean)
    const nnsChart = key
      ? progressionToNNS(sanitizedChords, key).map(n => n ?? '?')
      : null
    const { error } = await supabase.from('songs').insert({
      user_id:     currentUser.value.id,
      title:       sanitizeText(saveForm.value.title),
      artist:      artistRaw ? sanitizeText(artistRaw) : null,
      bpm:         saveForm.value.bpm ? parseInt(saveForm.value.bpm) : null,
      key,
      chord_chart: sanitizedChords,
      nns_chart:   nnsChart,
    })
    if (error) throw error
    saveDialogOpen.value = false
  } catch (e) {
    saveError.value = e.message
  } finally {
    savingProg.value = false
  }
}

function sendToPlay(majorRoot) {
  router.push({
    path: '/play',
    state: {
      _cadenceLoad: true,
      chords:  [...selectedChordsSharp.value], // plain array for structured-clone
      key:     majorRoot,
      keyType: 'major',
      bpm:     80,
    },
  })
}

// ─── Audio engine ──────────────────────────────────────────────────────────────

const {
  isLoaded, loadInstruments, ensureContext,
  playChord: audioPlayChord, playScale: audioPlayScale,
  activeInstrument, setInstrument,
  bassEnabled, setBassEnabled,
  volume, setVolume,
} = useAudio()

// Pre-fetch soundfonts on mount (AudioContext may be suspended until first gesture;
// decoding works in suspended state so sounds are ready the moment the user clicks)
onMounted(() => { if (isAudible.value) loadInstruments() })
watch(isAudible, enabled => { if (enabled && !isLoaded.value) loadInstruments() })

// ─── Display helpers ─────────────────────────────────────────────────────────

function toDisplayNote(n) {
  return sharpsOrFlats.value === 'flats' ? (SHARP_TO_FLAT[n] ?? n) : n
}
function toDisplay(chord) {
  return chord.replace(/^([A-G]#?)/, (_, r) => toDisplayNote(r))
}
function getChordTones(chordSharp) {
  const m = chordSharp.match(/^([A-G]#?)(.*)$/)
  if (!m) return []
  const ri = CHROMATIC.indexOf(m[1])
  const iv = m[2] === 'dim' ? [0, 3, 6] : m[2] === 'm' ? [0, 3, 7] : [0, 4, 7]
  return iv.map(i => CHROMATIC[(ri + i) % 12])
}
function chordTonesToDisplay(chordSharp) {
  return getChordTones(chordSharp).map(toDisplayNote).join(' · ')
}

// Color by chord quality
function chipColor(chordSharp) {
  if (chordSharp.endsWith('dim')) return 'error'
  if (chordSharp.endsWith('m'))   return 'secondary'
  return 'primary'
}

// ─── Chord grids ─────────────────────────────────────────────────────────────

const chordGroups = computed(() => [
  {
    label: 'MAJOR', quality: 'major',
    info: 'Bright, happy, stable sound',
    chords: CIRCLE_OF_FIFTHS.map(s => ({ sharp: s,         display: toDisplay(s)         })),
  },
  {
    label: 'MINOR', quality: 'minor',
    info: 'Dark, emotional, introspective sound',
    chords: CIRCLE_OF_FIFTHS.map(s => ({ sharp: s + 'm',   display: toDisplay(s + 'm')   })),
  },
  {
    label: 'DIMINISHED', quality: 'dim',
    info: 'Tense, unstable, dramatic sound',
    chords: CIRCLE_OF_FIFTHS.map(s => ({ sharp: s + 'dim', display: toDisplay(s + 'dim') })),
  },
])

// ─── Press animation ──────────────────────────────────────────────────────────

const pressingChord = ref(null)
const bouncingChord = ref(null)
let bounceTimer = null

function onChordPointerDown(sharp) {
  clearTimeout(bounceTimer)
  bouncingChord.value = null
  pressingChord.value = sharp
}
function onChordPointerUp(sharp) {
  pressingChord.value = null
  bouncingChord.value = sharp
  bounceTimer = setTimeout(() => { bouncingChord.value = null }, 100)
}
function chordAnimStyle(sharp) {
  if (pressingChord.value === sharp) return { transform: 'scale(0.95)', transition: 'transform 60ms ease-in' }
  if (bouncingChord.value === sharp) return { transform: 'scale(1.02)', transition: 'transform 80ms ease-out' }
  return { transform: 'scale(1)', transition: 'transform 100ms ease-out' }
}

// ─── Selection ───────────────────────────────────────────────────────────────

function isSelected(chordSharp) {
  return selectedChordsSharp.value.includes(chordSharp)
}
function handleChordClick(chordSharp) {
  const idx = selectedChordsSharp.value.indexOf(chordSharp)
  if (idx !== -1) {
    selectedChordsSharp.value.splice(idx, 1)
  } else {
    if (selectedChordsSharp.value.length >= 7) {
      chordLimitWarning.value = true
      return
    }
    selectedChordsSharp.value.push(chordSharp)
    if (isAudible.value) playChord(chordSharp)
  }
  if (showFingering.value) toggleVizChord(chordSharp)
}
function removeChord(chordSharp) {
  const idx = selectedChordsSharp.value.indexOf(chordSharp)
  if (idx !== -1) selectedChordsSharp.value.splice(idx, 1)
}
function reset() {
  selectedChordsSharp.value = []
  explanationText.value     = ''
  explanationError.value    = ''
  showAllKeys.value         = false
  chordLimitWarning.value   = false
  selectedProgKey.value     = null
  progKeyOverride.value     = false
}
function loadKey(majorRoot) {
  selectedChordsSharp.value = [...musicalKeys[majorRoot]]
  explanationText.value     = ''
  explanationError.value    = ''
}

function loadProgression(prog) {
  const majorRoot = activeProgMajorRoot.value
  if (!majorRoot) return
  const keyChords = musicalKeys[majorRoot]
  if (!keyChords) return
  const srcChords = prog.minor
    ? MINOR_ORDER.map(i => keyChords[i])
    : keyChords
  selectedChordsSharp.value = prog.degrees.map(d => srcChords[d])
  explanationText.value  = ''
  explanationError.value = ''
}

function onSwapProgKey() {
  progKeyOverride.value = true
  selectedProgKey.value = detectedKey.value
}

// ─── Drag-to-reorder ─────────────────────────────────────────────────────────

function onDragStart(index, event) {
  dragSrcIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}
function onDrop(targetIndex) {
  const src = dragSrcIndex.value
  if (src === null || src === targetIndex) return
  const arr = [...selectedChordsSharp.value]
  const [item] = arr.splice(src, 1)
  arr.splice(targetIndex, 0, item)
  selectedChordsSharp.value = arr
}

// ─── Key analysis ─────────────────────────────────────────────────────────────

const possibleKeys = computed(() => checkKeys(selectedChordsSharp.value))

const keyPairs = computed(() => {
  const pairs = []
  for (let i = 0; i + 1 < possibleKeys.value.length; i += 2) {
    const m = possibleKeys.value[i].match(/Key of ([A-G]#?) Major/)
    if (m) pairs.push({ majorRoot: m[1] })
  }
  return pairs
})

const visibleKeyPairs = computed(() =>
  showAllKeys.value ? keyPairs.value : keyPairs.value.slice(0, 2)
)

const confidence = computed(() => {
  const n = selectedChordsSharp.value.length
  if (!n) return null
  const k = keyPairs.value.length
  if (!k)  return { label: 'No exact key match',               color: 'error',     icon: 'mdi-alert-circle-outline'          }
  if (k === 1) return { label: 'Strong match',                 color: 'success',   icon: 'mdi-check-circle-outline'          }
  if (k <= 3)  return { label: 'A few possibilities',          color: 'warning',   icon: 'mdi-help-circle-outline'           }
  return           { label: 'Add more chords to narrow down', color: 'secondary', icon: 'mdi-dots-horizontal-circle-outline' }
})

const countColor = computed(() => {
  const n = selectedChordsSharp.value.length
  return n === 7 ? 'text-error' : n > 4 ? 'text-warning' : 'text-success'
})

const detectedKey = computed(() => keyPairs.value[0]?.majorRoot ?? null)

const activeProgMajorRoot = computed(() => {
  if (selectedProgKey.value !== null) {
    if (selectedProgType.value === 'minor') {
      const idx = PROG_NOTES.indexOf(selectedProgKey.value)
      return idx === -1 ? null : PROG_NOTES[(idx + 3) % 12]
    }
    return selectedProgKey.value
  }
  return detectedKey.value
})

const usingDetectedKey = computed(() =>
  !progKeyOverride.value && !!detectedKey.value && selectedProgKey.value === null
)

function relativeMinorDisplay(majorRoot) {
  const kc = musicalKeys[majorRoot]
  return kc ? `${toDisplayNote(kc[5].slice(0, -1))} Minor` : ''
}

function diatonicChords(majorRoot) {
  const kc = musicalKeys[majorRoot]
  if (!kc) return []
  return kc.map((chord, i) => ({
    chord,
    display:    toDisplay(chord),
    nns:        NNS_LABELS[i],
    isSelected: selectedChordsSharp.value.includes(chord),
    subs:       (SUB_RULES[i + 1] ?? []).map(d => ({
      display: toDisplay(kc[d - 1]),
      nns:     NNS_LABELS[d - 1],
    })),
  }))
}

function matchCount(majorRoot) {
  const kc = musicalKeys[majorRoot]
  return kc ? selectedChordsSharp.value.filter(c => kc.includes(c)).length : 0
}

// ─── Audio ───────────────────────────────────────────────────────────────────

async function playChord(chordSharp) {
  if (!isAudible.value || !isLoaded.value) return
  await ensureContext()
  audioPlayChord(chordSharp)
}
async function playScale(majorRoot) {
  if (!isAudible.value || !isLoaded.value) return
  await ensureContext()
  audioPlayScale(majorRoot)
}

// ─── Claude API ──────────────────────────────────────────────────────────────

async function explain(modifier = null) {
  isExplaining.value     = true
  explanationText.value  = ''
  explanationError.value = ''

  const chords = selectedChordsSharp.value.map(toDisplay)
  const keys   = keyPairs.value
    .map(p => `${toDisplayNote(p.majorRoot)} Major / ${relativeMinorDisplay(p.majorRoot)}`)
    .join(', ')

  let msg = `Chord progression: ${chords.join(' → ')}\nKey(s): ${keys || 'unknown'}`
  if (modifier) msg += `\n\n${modifier}`

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chords: selectedChordsSharp.value,
        key: keyPairs.value[0]?.majorRoot ?? null,
        userMessage: msg,
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    explanationText.value = data.content[0].text
  } catch (err) {
    explanationError.value = (err.message || 'Request failed')
  } finally {
    isExplaining.value = false
  }
}

function explainDifferently() {
  explain('Explain it a completely different way — use an analogy or describe how it physically feels to hear it. Keep it shorter and more casual.')
}

onBeforeRouteLeave(() => {
  settingsOpen.value  = false
  saveDialogOpen.value = false
})
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
/* group-label replaced below with quality variants */
.key-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #C8A96E;
}

/* ── Progression card ───────────────────────────────────────────────────── */
.progression-card {
  border-color: rgba(200, 169, 110, 0.2) !important;
  transition: border-color 0.3s;
}
.progression-card--empty {
  border-color: rgba(255, 255, 255, 0.05) !important;
}
.empty-state {
  display: flex;
  align-items: center;
  padding: 8px 0;
}
.progression-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ── Draggable chip wrapper ─────────────────────────────────────────────── */
.drag-wrap {
  cursor: grab;
  user-select: none;
  transition: transform 0.1s, opacity 0.15s;
  border-radius: 24px;
}
.drag-wrap:active { cursor: grabbing; }
.drag-wrap--src   { opacity: 0.35; }
.drag-wrap--over  {
  outline: 2px solid #C8A96E;
  outline-offset: 2px;
  border-radius: 24px;
}
.prog-chip { font-weight: 500; }

/* ── Chord grid ─────────────────────────────────────────────────────────── */
.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.group-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.group-label--major { color: #C8A96E; }
.group-label--minor { color: #6E8EAD; }
.group-label--dim   { color: #E8572A; }

.group-divider {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 16px 0;
}

.chord-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}

/* Native button reset + base */
.chord-btn {
  appearance: none;
  cursor: pointer;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  min-height: 52px;
  width: 100%;
  padding: 0 4px;
  outline: none;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.chord-btn:focus-visible {
  outline: 2px solid rgba(255,255,255,0.3);
  outline-offset: 2px;
}

/* Major */
.chord-btn--major {
  background: rgba(200, 169, 110, 0.12);
  border-color: rgba(200, 169, 110, 0.15);
  color: #C8A96E;
}
.chord-btn--major:hover {
  background: rgba(200, 169, 110, 0.13);
  border-color: rgba(200, 169, 110, 0.4);
}
.chord-btn--major.chord-btn--selected {
  background: #C8A96E;
  border-color: #C8A96E;
  color: #0D0D0F;
  box-shadow: 0 0 12px rgba(200, 169, 110, 0.5);
  font-weight: 700;
}

/* Minor */
.chord-btn--minor {
  background: rgba(110, 142, 173, 0.12);
  border-color: rgba(110, 142, 173, 0.15);
  color: #6E8EAD;
}
.chord-btn--minor:hover {
  background: rgba(110, 142, 173, 0.13);
  border-color: rgba(110, 142, 173, 0.4);
}
.chord-btn--minor.chord-btn--selected {
  background: #6E8EAD;
  border-color: #6E8EAD;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(110, 142, 173, 0.5);
  font-weight: 700;
}

/* Diminished */
.chord-btn--dim {
  background: rgba(232, 87, 42, 0.14);
  border-color: rgba(232, 87, 42, 0.2);
  color: #E8572A;
}
.chord-btn--dim:hover {
  background: rgba(232, 87, 42, 0.13);
  border-color: rgba(232, 87, 42, 0.4);
}
.chord-btn--dim.chord-btn--selected {
  background: #E8572A;
  border-color: #E8572A;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(232, 87, 42, 0.5);
  font-weight: 700;
}

/* Fingering viz highlight */
.chord-btn--viz { opacity: 0.65; }

/* ── Mobile overrides ────────────────────────────────────────────────────── */
@media (max-width: 599px) {
  .chord-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .chord-btn {
    min-height: 56px;
    font-size: 1rem;
  }
}

/* ── Diatonic chord row in key card ─────────────────────────────────────── */
.diatonic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.diatonic-cell {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  min-width:      44px;
  padding:        6px 8px 5px;
  border-radius:  8px;
  border:         1px solid rgba(255, 255, 255, 0.07);
  cursor:         default;
  transition:     border-color 0.2s, background-color 0.2s;
}
.diatonic-cell:hover {
  border-color:     rgba(200, 169, 110, 0.35);
  background-color: rgba(200, 169, 110, 0.05);
}
.diatonic-cell--active {
  border-color:     #C8A96E !important;
  background-color: rgba(200, 169, 110, 0.14) !important;
}
.nns-label {
  font-size:   0.6rem;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  color:       #6E8EAD;
  margin-bottom: 3px;
}
.diatonic-name {
  font-size:   0.82rem;
  font-weight: 500;
  color:       #C4C4BC;
}
.diatonic-cell--active .diatonic-name {
  color:       #C8A96E;
  font-weight: 700;
}

/* ── Key card ────────────────────────────────────────────────────────────── */
.key-card {
  border-color: rgba(200, 169, 110, 0.12) !important;
}

/* ── Waveform loading animation ─────────────────────────────────────────── */
.waveform {
  display:     inline-flex;
  gap:         3px;
  align-items: center;
  height:      24px;
}
.waveform-bar {
  display:          inline-block;
  width:            3px;
  height:           20px;
  background:       #C8A96E;
  border-radius:    2px;
  animation:        wave 0.9s ease-in-out infinite;
  transform-origin: center;
}
.waveform-bar:nth-child(1) { animation-delay: 0s;    }
.waveform-bar:nth-child(2) { animation-delay: 0.15s; }
.waveform-bar:nth-child(3) { animation-delay: 0.3s;  }
.waveform-bar:nth-child(4) { animation-delay: 0.15s; }
.waveform-bar:nth-child(5) { animation-delay: 0s;    }
@keyframes wave {
  0%, 100% { transform: scaleY(0.25); opacity: 0.35; }
  50%       { transform: scaleY(1);   opacity: 1;    }
}

/* ── Explanation card ───────────────────────────────────────────────────── */
.explanation-card {
  background: rgba(200,169,110,0.04) !important;
  border-left: 3px solid #C8A96E !important;
  border-color: rgba(200,169,110,0.2) !important;
}
.explanation-card p {
  font-style: italic;
  line-height: 1.8;
}

/* ── Key card ─────────────────────────────────────────────────────────────── */
.key-card {
  border-color: rgba(200, 169, 110, 0.15) !important;
  transition: box-shadow 0.2s ease, border-color 0.2s !important;
}
.key-card:hover {
  border-color: rgba(200, 169, 110, 0.3) !important;
  box-shadow: 0 0 0 1px rgba(200,169,110,0.12) !important;
}

/* ── Common Progressions ─────────────────────────────────────────────────── */
.prog-key-card {
  border-color: rgba(255, 255, 255, 0.08) !important;
}
.prog-key-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.prog-key-scroll::-webkit-scrollbar { display: none; }
.prog-key-btn {
  flex-shrink: 0 !important;
  min-width: 44px !important;
  min-height: 40px !important;
  border-radius: 999px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
}
.prog-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.prog-item:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}
</style>
