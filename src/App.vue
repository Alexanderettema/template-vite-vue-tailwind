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
const showOnboarding = ref(false)
const showOverlay = ref(false)
const onboardingStep = ref(0)
const showScrollIndicator = ref(true)
const darkMode = ref(false)

// Make these reactive values available to child components
provide('showOnboarding', showOnboarding)
provide('showOverlay', showOverlay)
provide('onboardingStep', onboardingStep)
provide('showScrollIndicator', showScrollIndicator)
provide('darkMode', darkMode)

// Load dark mode preference from localStorage
if (typeof window !== 'undefined') {
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
}

function startApp() {
  showChat.value = true
  // Show the initial onboarding screen for first-time users
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
  if (!hasSeenOnboarding) {
    showOnboarding.value = true
  }
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
  showOnboarding.value = false
  // Store that the user has seen onboarding
  localStorage.setItem('hasSeenOnboarding', 'true')
  // Show the UI overlay after closing the initial onboarding
  setTimeout(() => {
    showOverlay.value = true
    onboardingStep.value = 0
  }, 500)
}

function nextOverlayStep() {
  onboardingStep.value++
  if (onboardingStep.value > 3) {
    showOverlay.value = false
    onboardingStep.value = 0
  }
}

function skipOverlay() {
  showOverlay.value = false
  onboardingStep.value = 0
}

// Check scroll position in onboarding overlay
function checkOnboardingScroll(event: Event) {
  const onboardingContent = event.target as HTMLElement
  if (onboardingContent) {
    // If we're near the bottom, hide the scroll indicator
    const isAtBottom = onboardingContent.scrollHeight - onboardingContent.scrollTop - onboardingContent.clientHeight < 50
    showScrollIndicator.value = !isAtBottom
  }
}

// Add function to scroll down when indicator is clicked
function scrollDown() {
  const onboardingContent = document.querySelector('.onboarding-content')
  if (onboardingContent) {
    // Scroll down by 300px
    onboardingContent.scrollBy({
      top: 300,
      behavior: 'smooth'
    })
  }
}

// Handle keyboard events for guided tour
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && showOverlay.value) {
    nextOverlayStep()
  }
}

// Add and remove event listeners for keyboard navigation
onMounted(() => {
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
    
    <!-- Onboarding overlay - positioned at the root level -->
    <div v-if="showOnboarding" class="fixed inset-0 z-[100] flex items-center justify-center p-5"
         :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
      <!-- Dark backdrop overlay -->
      <div class="absolute inset-0 bg-black/70"></div>
      
      <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[800px] max-h-[90vh] overflow-y-auto font-mono onboarding-content relative z-10"
           :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']"
           @scroll="checkOnboardingScroll">
        <h2 class="text-center pb-2.5 mt-0 border-b-2"
            :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">Welkom bij de ACT Therapie App</h2>
        
        <div class="mb-4 p-2.5 border border-dashed"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <h3 class="mt-0 inline-block border-b"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">1. Wat is ACT?</h3>
          <p>Acceptance and Commitment Therapy (ACT) helpt je om lastige gedachten en gevoelens te accepteren terwijl je stappen zet richting een waardevol leven.</p>
        </div>
        
        <div class="mb-4 p-2.5 border border-dashed"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <h3 class="mt-0 inline-block border-b"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">2. Hoe gebruik je deze app?</h3>
          <ul class="pl-5">
            <li class="mb-2"><strong>Kies een onderwerp</strong> - Begin met een van de hoofdthema's: Waarden, Defusie of Mindfulness</li>
            <li class="mb-2"><strong>Verken subthema's</strong> - Verdiep je in specifieke oefeningen of concepten</li>
            <li class="mb-2"><strong>Stel vragen</strong> - Type je eigen vragen in het invoerveld onderaan</li>
            <li class="mb-2"><strong>Vervolg het gesprek</strong> - Klik op de kernbegrippen rechts om het gesprek verder te verdiepen</li>
          </ul>
        </div>
        
        <div class="mb-4 p-2.5 border border-dashed"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <h3 class="mt-0 inline-block border-b"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">3. Kernbegrippen paneel</h3>
          <p>Na elk antwoord van de assistent verschijnen er drie kernbegrippen in het rechterpaneel. <strong>Je kunt hierop klikken om direct een vervolgvraag te stellen</strong> over dat specifieke onderwerp en zo het gesprek te verdiepen.</p>
        </div>
        
        <div class="text-center mt-5">
          <button 
            @click="dismissOnboarding" 
            class="p-2 px-4 text-lg border-2 cursor-pointer transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-800 hover:bg-gray-800 hover:text-white']"
          >
            Begin met ACT therapie
          </button>
        </div>
        
        <!-- Scroll indicator as fixed element at bottom right -->
        <div v-if="showScrollIndicator" 
             @click="scrollDown"
             class="absolute bottom-8 right-8 p-2 rounded-full border-2 cursor-pointer shadow-md animate-pulse transition-all"
             :class="[darkMode ? 'bg-gray-700/90 border-gray-600 hover:bg-gray-600' : 'bg-white/90 border-gray-800 hover:bg-gray-200']">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
               :stroke="darkMode ? 'white' : 'black'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
               class="animate-bounce">
            <path d="M7 13l5 5 5-5"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- UI Overlay for guided onboarding - positioned at the root level -->
    <div v-if="showOverlay" class="fixed inset-0 z-[100] pointer-events-none">
      <!-- Semi-transparent overlay that helps focus attention while maintaining visibility -->
      <div class="absolute inset-0 bg-black/15 backdrop-blur-[0.5px]"></div>
      
      <!-- Tooltips with pointer-events-auto to allow clicking -->
      <!-- Step 1: Tooltip for themes panel -->
      <div v-if="onboardingStep === 0" 
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
          <button @click="nextOverlayStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Volgende
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Step 2: Tooltip for chat area -->
      <div v-if="onboardingStep === 1" 
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
          <button @click="nextOverlayStep" 
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
      <div v-if="onboardingStep === 2" 
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
          <button @click="nextOverlayStep" 
                class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center">
            Volgende
            <svg class="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M16 12H8M8 12L12 16M8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Step 4: Tooltip for input area -->
      <div v-if="onboardingStep === 3" 
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
          <button @click="nextOverlayStep" 
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
