<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { signIn, signUp, signInWithGoogle, signOut, loading, error } = useAuth()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')

const handleSubmit = async () => {
  if (!email.value || !password.value) return
  
  try {
    if (isLogin.value) {
      console.log('Attempting to sign in...')
      const { data, error: signInError } = await signIn(email.value, password.value)
      if (signInError) {
        console.error('Sign in error:', signInError)
        return
      }
      console.log('Sign in successful:', data)
      router.push('/chat')
    } else {
      console.log('Attempting to sign up...')
      const { data, error: signUpError } = await signUp(email.value, password.value)
      if (signUpError) {
        console.error('Sign up error:', signUpError)
        return
      }
      console.log('Sign up successful:', data)
      router.push('/chat')
    }
  } catch (e) {
    console.error('Authentication error:', e)
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  email.value = ''
  password.value = ''
}

const handleLogout = async () => {
  await signOut()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
    <div class="w-full max-w-md">
      <!-- Auth Card -->
      <div class="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 p-8 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:drop-shadow-[6px_6px_0px_rgba(17,24,39,0.8)]">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold mb-2 font-mono dark:text-white">{{ isLogin ? 'Welkom Terug' : 'Account Aanmaken' }}</h1>
          <p class="text-gray-600 dark:text-gray-300 font-mono">
            {{ isLogin ? 'Log in om je therapietraject voort te zetten' : 'Registreer om je therapietraject te starten' }}
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded font-mono">
          {{ error }}
        </div>

        <!-- Auth Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 font-mono dark:text-gray-200" for="email">E-mail</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="w-full p-2 border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:border-emerald-500 font-mono dark:text-white"
              :disabled="loading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1 font-mono dark:text-gray-200" for="password">Wachtwoord</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full p-2 border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:border-emerald-500 font-mono dark:text-white"
              :disabled="loading"
            />
          </div>

          <button
            type="submit"
            class="w-full py-2 px-4 border-2 border-black dark:border-emerald-700 bg-emerald-600 dark:bg-emerald-600 text-white font-mono hover:bg-emerald-700 dark:hover:bg-emerald-500 focus:outline-none transition-colors"
            :disabled="loading"
          >
            {{ loading ? 'Laden...' : (isLogin ? 'Inloggen' : 'Registreren') }}
          </button>
        </form>

        <!-- Google Sign In -->
        <div class="mt-4">
          <button
            @click="signInWithGoogle"
            class="w-full py-2 px-4 border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 font-mono hover:bg-black hover:text-white dark:hover:bg-gray-600 dark:hover:text-white focus:outline-none transition-colors flex items-center justify-center gap-2 dark:text-white"
            :disabled="loading"
          >
            <span class="bg-white rounded-full w-5 h-5 flex items-center justify-center">
              <font-awesome-icon :icon="['fab', 'google']" class="text-gray-800" />
            </span>
            Doorgaan met Google
          </button>
        </div>

        <!-- Toggle Login/Signup -->
        <div class="mt-6 text-center">
          <button
            @click="toggleMode"
            class="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-mono"
            :disabled="loading"
          >
            {{ isLogin ? 'Nog geen account? Registreer je' : 'Heb je al een account? Log in' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template> 