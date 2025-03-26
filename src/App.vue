<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, nextTick, watch } from 'vue'
import ChatInterface from './components/ChatInterface.vue'
import LandingPage from './components/LandingPage.vue'
import { useAuth } from './composables/useAuth'
import { useRouter } from 'vue-router'

const router = useRouter()

const title = 'Vite template for Vue 3, TypeScript, and TailwindCSS'
const description = 'An open-source Vite template for Vue 3, TypeScript and TailwindCSS. Dark mode enabled, auto-import enabled, persistent localStorage enabled using Nano Stores'
const url = import.meta.env.VITE_BASE_URL
const imageURL = `${url}/og_image.png`
const author = 'Tri Le Minh'
const pubDate = (new Date()).toISOString()

useHead({
  meta: [
    {
      name: 'description',
      content: description,
    },
    {
      name: 'og:site_name',
      content: title,
    },
    {
      name: 'og:type',
      content: 'website',
    },
    {
      name: 'og:url',
      content: url,
    },
    {
      name: 'og:title',
      content: title,
    },
    {
      name: 'og:description',
      content: description,
    },
    {
      name: 'og:image',
      content: imageURL,
    },
    {
      name: 'og:image:alt',
      content: description,
    },
    {
      name: 'og:locale',
      content: 'en',
    },
    {
      name: 'twitter:site',
      content: '@ansidev',
    },
    {
      name: 'twitter:creator',
      content: '@ansidev',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:url',
      content: url,
    },
    {
      name: 'twitter:title',
      content: title,
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image:src',
      content: imageURL,
    },
    {
      name: 'robots',
      content: 'follow, index',
    },
    {
      name: 'author',
      content: author,
    },
    {
      name: 'article:published_time',
      content: pubDate,
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: url,
    }
  ]
})

const showChat = ref(false)
const showOverlay = ref(false)
const onboardingStep = ref(0)
const darkMode = ref(false)

// Make these reactive values available to child components
provide('showOverlay', showOverlay)
provide('onboardingStep', onboardingStep)
provide('darkMode', darkMode)

const { initUser, signOut } = useAuth()

function startApp() {
  showChat.value = true
  // Don't show any onboarding on start
}

function goToHome() {
  showChat.value = false
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  // Store preference in localStorage
  localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
}

function dismissOnboarding() {
  showOverlay.value = false
  onboardingStep.value = 0
}

// Function to focus the current tour step
function focusCurrentStep() {
  nextTick(() => {
    const currentStep = document.querySelector(`.tour-step-${onboardingStep.value}`)
    if (currentStep && 'focus' in currentStep) {
      (currentStep as HTMLElement).focus()
    }
  })
}

// Update existing functions to use the new focus function
function nextOnboardingStep() {
  onboardingStep.value++
  if (onboardingStep.value > 4) {
    dismissOnboarding()
  } else {
    focusCurrentStep()
  }
}

function skipOverlay() {
  showOverlay.value = false
  onboardingStep.value = 0
}

// Handle keyboard events for guided tour
function handleKeyDown(event: KeyboardEvent) {
  if (showOverlay.value) {
    // Check if the event target is a focused tour step element - if so, don't handle it here
    // as it's already being handled by the @keydown.enter directive on the element
    const target = event.target as HTMLElement;
    const isTourStepFocused = target && target.classList && 
      (target.classList.contains('tour-step-1') || 
       target.classList.contains('tour-step-2') || 
       target.classList.contains('tour-step-3') || 
       target.classList.contains('tour-step-4'));
    
    if (event.key === 'Enter' && !isTourStepFocused) {
      event.preventDefault();
      nextOnboardingStep();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      skipOverlay();
    }
  }
}

// Watch for changes to showOverlay
watch(showOverlay, (newValue) => {
  if (newValue) {
    focusCurrentStep()
  }
})

// Initial setup onMounted
onMounted(async () => {
  // Check for saved dark mode preference
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
  
  // Listen for keyboard events
  window.addEventListener('keydown', handleKeyDown)

  // Initialize auth state when app loads
  await initUser()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

async function handleLogout() {
  console.log('Attempting to logout...')
  try {
    await signOut()
    console.log('Logout successful')
    // Navigate to the home page
    router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>

<template>
  <div class="app-container min-h-screen w-full" :class="{'dark': darkMode, 'bg-gradient-to-b from-gray-50 to-gray-100': !darkMode, 'bg-gradient-to-b from-gray-900 to-gray-800': darkMode}">
    <div class="container mx-auto" :class="{'max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 md:pt-6': $route.name === 'sessions' || $route.name === 'session-details'}">
      <router-view v-slot="{ Component }">
        <component :is="Component" @start-app="startApp" @go-to-home="goToHome" />
      </router-view>
    </div>
    
    <!-- Fixed nav buttons that appear on specific pages only -->
    <div class="fixed bottom-4 right-4 flex space-x-2 z-10" v-if="$route.name === 'sessions' || $route.name === 'session-details' || $route.name === 'home'">
      <button @click="toggleDarkMode" 
        class="rounded-full p-3 transition-all border-2"
        :class="[
          darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-yellow-200' : 
                    'bg-white border-gray-800 hover:bg-gray-100 text-gray-800'
        ]"
      >
        <font-awesome-icon :icon="darkMode ? 'sun' : 'moon'" />
      </button>
      
      <router-link 
        v-if="$route.name === 'home' || $route.name === 'session-details'"
        to="/sessions" 
        class="rounded-full p-3 transition-all border-2 flex items-center justify-center"
        :class="[
          darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' : 
                    'bg-white border-gray-800 hover:bg-gray-100 text-gray-800'
        ]"
      >
        <font-awesome-icon icon="book" />
      </router-link>

      <router-link 
        v-if="$route.name === 'sessions'"
        to="/" 
        class="rounded-full p-3 transition-all border-2 flex items-center justify-center"
        :class="[
          darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' : 
                    'bg-white border-gray-800 hover:bg-gray-100 text-gray-800'
        ]"
      >
        <font-awesome-icon icon="home" />
      </router-link>
    </div>
    
    <!-- Onboarding overlay -->
    <div v-if="showOverlay" class="fixed inset-0 flex items-center justify-center z-50">
      <!-- Semi-transparent overlay that helps focus attention while maintaining visibility -->
      <div class="absolute inset-0 bg-black/40"></div>
      
      <!-- Tooltips with pointer-events-auto to allow clicking -->
      <!-- Step 1: Tooltip for themes panel -->
      <div v-if="onboardingStep === 1" 
           class="absolute left-[150px] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30 focus:outline-none tour-step-1"
           tabindex="0"
           @keydown.enter="nextOnboardingStep"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 1 van 4
        </div>
        <h3 class="font-bold mb-2">Thema's</h3>
        <p class="mb-4">Begin je sessie door een van deze ACT thema's te kiezen. Elk thema bevat specifieke oefeningen.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded flex items-center"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            <span class="text-xs mr-1 opacity-80">ESC</span>
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center"
                tabindex="0">
            Volgende
            <span class="text-xs ml-1 opacity-80">↵</span>
          </button>
        </div>
        <!-- Simplified keyboard hint for step 1 -->
        <div class="mt-4 pt-2 border-t text-center text-xs opacity-60"
             :class="[darkMode ? 'border-gray-700' : 'border-gray-300']">
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">ESC</span>
          om te annuleren | 
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">Enter ↵</span>
          om verder te gaan
        </div>
      </div>
      
      <!-- Step 2: Tooltip for chat area -->
      <div v-if="onboardingStep === 2" 
           class="absolute left-1/2 -translate-x-1/2 top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30 focus:outline-none tour-step-2"
           tabindex="0"
           @keydown.enter="nextOnboardingStep"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 2 van 4
        </div>
        <h3 class="font-bold mb-2">Chat</h3>
        <p class="mb-4">Hier vindt het gesprek plaats. Je kunt eigen vragen stellen of antwoorden op de suggesties van de assistent.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded flex items-center"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            <span class="text-xs mr-1 opacity-80">ESC</span>
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center"
                tabindex="0">
            Volgende
            <span class="text-xs ml-1 opacity-80">↵</span>
          </button>
        </div>
        <!-- Simplified keyboard hint for step 2 -->
        <div class="mt-4 pt-2 border-t text-center text-xs opacity-60"
             :class="[darkMode ? 'border-gray-700' : 'border-gray-300']">
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">ESC</span>
          om te annuleren | 
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">Enter ↵</span>
          om verder te gaan
        </div>
      </div>
      
      <!-- Step 3: Tooltip for keywords panel -->
      <div v-if="onboardingStep === 3" 
           class="absolute right-[150px] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30 focus:outline-none tour-step-3"
           tabindex="0"
           @keydown.enter="nextOnboardingStep"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 3 van 4
        </div>
        <h3 class="font-bold mb-2">Kernbegrippen</h3>
        <p class="mb-4">Na elk antwoord verschijnen hier kernbegrippen. Klik erop om meer te leren over dat specifieke onderwerp.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded flex items-center"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            <span class="text-xs mr-1 opacity-80">ESC</span>
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center"
                tabindex="0">
            Volgende
            <span class="text-xs ml-1 opacity-80">↵</span>
          </button>
        </div>
        <!-- Simplified keyboard hint for step 3 -->
        <div class="mt-4 pt-2 border-t text-center text-xs opacity-60"
             :class="[darkMode ? 'border-gray-700' : 'border-gray-300']">
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">ESC</span>
          om te annuleren | 
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">Enter ↵</span>
          om verder te gaan
        </div>
      </div>
      
      <!-- Step 4: Tooltip for input area -->
      <div v-if="onboardingStep === 4" 
           class="absolute bottom-[120px] left-1/2 -translate-x-1/2 w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30 focus:outline-none tour-step-4"
           tabindex="0"
           @keydown.enter="nextOnboardingStep"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 4 van 4
        </div>
        <h3 class="font-bold mb-2">Begin nu</h3>
        <p class="mb-4">Typ hier je eerste vraag of kies een thema links om te beginnen met je ACT sessie.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded flex items-center"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            <span class="text-xs mr-1 opacity-80">ESC</span>
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center"
                tabindex="0">
            Beginnen
            <span class="text-xs ml-1 opacity-80">↵</span>
          </button>
        </div>
        
        <!-- Simplified keyboard hint for step 4 -->
        <div class="mt-4 pt-2 border-t text-center text-xs opacity-60"
             :class="[darkMode ? 'border-gray-700' : 'border-gray-300']">
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">ESC</span>
          om te annuleren | 
          <span class="text-xs mx-1" :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">Enter ↵</span>
          om verder te gaan
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #111827;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}
</style>
