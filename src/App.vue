<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from 'vue'
import ChatInterface from './components/ChatInterface.vue'
import LandingPage from './components/LandingPage.vue'

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

function nextOnboardingStep() {
  onboardingStep.value++
  if (onboardingStep.value > 4) {
    dismissOnboarding()
  }
}

function skipOverlay() {
  showOverlay.value = false
  onboardingStep.value = 0
}

// Handle keyboard events for guided tour
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && showOverlay.value) {
    nextOnboardingStep()
  }
}

// Initial setup onMounted
onMounted(() => {
  // Check for saved dark mode preference
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
  
  // Listen for keyboard events
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div>
    <LandingPage v-if="!showChat" @start-app="startApp" />
    <ChatInterface v-else @go-to-home="goToHome" />
    
    <!-- UI Overlay for guided tour ONLY - no explanation screen -->
    <div v-if="showOverlay" class="fixed inset-0 z-[100] pointer-events-none">
      <!-- Semi-transparent overlay that helps focus attention while maintaining visibility -->
      <div class="absolute inset-0 bg-black/15 backdrop-blur-[0.5px]"></div>
      
      <!-- Tooltips with pointer-events-auto to allow clicking -->
      <!-- Step 1: Tooltip for themes panel -->
      <div v-if="onboardingStep === 1" 
           class="absolute left-[150px] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 1 van 4
        </div>
        <h3 class="font-bold mb-2">Thema's</h3>
        <p class="mb-4">Begin je sessie door een van deze ACT thema's te kiezen. Elk thema bevat specifieke oefeningen.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Volgende
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="absolute w-6 h-6 bg-white transform rotate-45 left-[-12px] top-10"
             :class="[darkMode ? 'bg-gray-800' : 'bg-white']"></div>
      </div>
      
      <!-- Step 2: Tooltip for chat area -->
      <div v-if="onboardingStep === 2" 
           class="absolute left-1/2 -translate-x-1/2 top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 2 van 4
        </div>
        <h3 class="font-bold mb-2">Chat</h3>
        <p class="mb-4">Hier vindt het gesprek plaats. Je kunt eigen vragen stellen of antwoorden op de suggesties van de assistent.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Volgende
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Step 3: Tooltip for keywords panel -->
      <div v-if="onboardingStep === 3" 
           class="absolute right-[150px] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 3 van 4
        </div>
        <h3 class="font-bold mb-2">Kernbegrippen</h3>
        <p class="mb-4">Na elk antwoord verschijnen hier kernbegrippen. Klik erop om meer te leren over dat specifieke onderwerp.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Volgende
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="absolute w-6 h-6 bg-white transform rotate-45 right-[-12px] top-10"
             :class="[darkMode ? 'bg-gray-800' : 'bg-white']"></div>
      </div>
      
      <!-- Step 4: Tooltip for input area -->
      <div v-if="onboardingStep === 4" 
           class="absolute bottom-[120px] left-1/2 -translate-x-1/2 w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl z-30"
           :class="[darkMode ? 'bg-gray-800 border-emerald-600 text-white' : 'bg-white border-emerald-600']">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
          Stap 4 van 4
        </div>
        <h3 class="font-bold mb-2">Begin nu</h3>
        <p class="mb-4">Typ hier je eerste vraag of kies een thema links om te beginnen met je ACT sessie.</p>
        <div class="flex justify-between">
          <button @click="skipOverlay" 
                class="px-2 py-1 text-sm border rounded"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50']">
            Overslaan
          </button>
          <button @click="nextOnboardingStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Beginnen
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <!-- Keyboard hint -->
        <div class="mt-4 pt-2 border-t text-center text-xs opacity-60"
             :class="[darkMode ? 'border-gray-700' : 'border-gray-300']">
          Druk op <span class="px-1 py-0.5 inline-flex items-center justify-center mx-1" 
                        :class="[darkMode ? 'text-emerald-400' : 'text-emerald-600']">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span> om verder te gaan
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
