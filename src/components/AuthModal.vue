<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="pt-5 pb-0 px-5">
        <span class="text-h6" style="font-family: 'Space Grotesk', sans-serif;">
          Welcome to Cadence
        </span>
      </v-card-title>

      <v-card-text class="px-5 pt-3">
        <!-- Google OAuth -->
        <v-btn
          variant="outlined"
          block
          class="mb-4"
          :loading="googleLoading"
          @click="handleGoogle"
        >
          <v-icon start>mdi-google</v-icon>
          Continue with Google
        </v-btn>

        <div class="divider-row mb-4">
          <v-divider />
          <span class="divider-text text-caption text-medium-emphasis px-3">or</span>
          <v-divider />
        </div>

        <!-- Sign In / Sign Up tabs -->
        <v-tabs v-model="tab" density="compact" color="primary" class="mb-4">
          <v-tab value="signin">Sign In</v-tab>
          <v-tab value="signup">Sign Up</v-tab>
        </v-tabs>

        <v-window v-model="tab">

          <!-- Sign In -->
          <v-window-item value="signin">
            <v-form @submit.prevent="handleSignIn">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
                autocomplete="email"
              />
              <v-text-field
                v-model="password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-4"
                autocomplete="current-password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
              />
              <v-btn
                type="submit"
                color="primary"
                variant="flat"
                block
                :loading="emailLoading"
              >Sign In</v-btn>
            </v-form>
          </v-window-item>

          <!-- Sign Up -->
          <v-window-item value="signup">
            <v-form @submit.prevent="handleSignUp">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
                autocomplete="email"
              />
              <v-text-field
                v-model="password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-4"
                autocomplete="new-password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
              />
              <v-btn
                type="submit"
                color="primary"
                variant="flat"
                block
                :loading="emailLoading"
              >Create Account</v-btn>
            </v-form>

            <div v-if="signUpSuccess" class="mt-3">
              <v-alert type="success" variant="tonal" density="compact">
                Check your email to confirm your account.
              </v-alert>
            </div>
          </v-window-item>

        </v-window>

        <!-- Error -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          closable
          @click:close="error = ''"
        >{{ error }}</v-alert>
      </v-card-text>

      <v-card-actions class="px-5 pb-4 pt-0">
        <v-spacer />
        <v-btn variant="text" size="small" color="secondary" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const { signInWithGoogle, signInWithEmail, signUp } = useAuth()

const tab           = ref('signin')
const email         = ref('')
const password      = ref('')
const showPassword  = ref(false)
const error         = ref('')
const googleLoading = ref(false)
const emailLoading  = ref(false)
const signUpSuccess = ref(false)

async function handleGoogle() {
  googleLoading.value = true
  error.value = ''
  try {
    await signInWithGoogle()
    // redirect happens — modal will close naturally
  } catch (err) {
    error.value = err.message
    googleLoading.value = false
  }
}

async function handleSignIn() {
  emailLoading.value = true
  error.value = ''
  try {
    await signInWithEmail(email.value, password.value)
    emit('update:modelValue', false)
  } catch (err) {
    error.value = err.message
  } finally {
    emailLoading.value = false
  }
}

async function handleSignUp() {
  emailLoading.value = true
  error.value = ''
  signUpSuccess.value = false
  try {
    await signUp(email.value, password.value)
    signUpSuccess.value = true
    password.value = ''
  } catch (err) {
    error.value = err.message
  } finally {
    emailLoading.value = false
  }
}
</script>

<style scoped>
.divider-row {
  display: flex;
  align-items: center;
}
.divider-text {
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
