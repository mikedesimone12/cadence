<template>
  <v-app>
    <div class="top-accent-line" />

    <!-- App bar -->
    <v-app-bar flat height="52" class="cadence-app-bar">
      <v-app-bar-title>
        <div class="app-logo">
          <img src="/favicon.svg" alt="" class="app-logo-icon" />
          <span class="app-name">Cadence</span>
        </div>
      </v-app-bar-title>
      <template #append>
        <template v-if="currentUser">
          <span class="text-caption text-medium-emphasis mr-2 d-none d-sm-inline">
            {{ userLabel }}
          </span>
          <v-btn
            icon size="small" variant="text"
            title="Sign out"
            @click="handleSignOut"
          >
            <v-icon size="18">mdi-logout</v-icon>
          </v-btn>
        </template>
        <v-btn
          v-else
          variant="outlined" size="small" color="primary"
          class="mr-2"
          @click="authOpen = true"
        >
          Sign in
        </v-btn>
      </template>
    </v-app-bar>

    <v-main class="pb-16">
      <router-view v-slot="{ Component }">
        <transition name="fade">
          <keep-alive>
            <component :is="Component" :key="$route.name" />
          </keep-alive>
        </transition>
      </router-view>
    </v-main>

    <v-bottom-navigation :model-value="activeTab" grow class="cadence-bottom-nav">
      <v-btn value="Explore" to="/explore">
        <v-icon>mdi-compass</v-icon>
        <span>Explore</span>
      </v-btn>
      <v-btn value="Gig" to="/gig">
        <v-icon>mdi-music-note-plus</v-icon>
        <span>Gig</span>
      </v-btn>
      <v-btn value="Play" to="/play">
        <v-icon>mdi-piano</v-icon>
        <span>Play</span>
      </v-btn>
      <v-btn value="Library" to="/library">
        <v-icon>mdi-book-music</v-icon>
        <span>Library</span>
      </v-btn>
    </v-bottom-navigation>

    <AuthModal v-model="authOpen" />
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'
import AuthModal from './components/AuthModal.vue'

const route    = useRoute()
const authOpen = ref(false)

const { currentUser, signOut } = useAuth()

const activeTab = computed(() => route.name)
const userLabel = computed(() => {
  const u = currentUser.value
  if (!u) return ''
  return u.email?.split('@')[0] ?? 'Account'
})

async function handleSignOut() {
  await signOut()
}
</script>

<style>
/* ── Global resets & typography ─────────────────────────────────────────── */
body,
.v-application {
  font-family: 'Inter', sans-serif !important;
}

h1, h2, h3, h4, h5, h6,
.v-card-title,
.v-list-item-title,
.text-h1, .text-h2, .text-h3, .text-h4, .text-h5, .text-h6,
.text-subtitle-1, .text-subtitle-2 {
  font-family: 'Space Grotesk', sans-serif !important;
}

/* ── Card treatment ─────────────────────────────────────────────────────── */
.v-card {
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* ── Page transition ─────────────────────────────────────────────────────── */
.fade-leave-active,
.fade-enter-active { transition: opacity 0.1s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>

<style scoped>
/* ── Gold accent line ────────────────────────────────────────────────────── */
.top-accent-line {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #C8A96E;
  z-index: 9999;
}

/* ── App bar ─────────────────────────────────────────────────────────────── */
.cadence-app-bar {
  background-color: #1A1A1F !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  padding-top: 2px; /* clear the accent line */
}
.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-logo-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.app-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #C8A96E;
}

/* ── Bottom navigation ──────────────────────────────────────────────────── */
.cadence-bottom-nav {
  background-color: #1A1A1F !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}
.cadence-bottom-nav .v-btn--active,
.cadence-bottom-nav .v-btn[aria-selected="true"] {
  color: #C8A96E !important;
}
</style>
