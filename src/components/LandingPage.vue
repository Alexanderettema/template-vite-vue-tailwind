<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// Define props and emits
const emit = defineEmits(['start-app'])

const darkMode = ref(false)
const showRoadmap = ref(false)
const roadmapContent = ref('')

const router = useRouter()
const { user, initUser } = useAuth()

// Load dark mode preference from localStorage
if (typeof window !== 'undefined') {
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
}

// Check auth state on component mount
onMounted(async () => {
  await initUser()
})

// Toggle dark mode
function toggleDarkMode() {
  darkMode.value = !darkMode.value
  // Store preference in localStorage
  localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
}

// Start the app
function startApp() {
  router.push('/chat')
}

// Go to auth page
function goToAuth() {
  router.push('/auth')
}

// Load and show roadmap
async function openRoadmap() {
  try {
    const response = await fetch('/docs/client-sessions.md')
    const text = await response.text()
    roadmapContent.value = marked(text) as string
    showRoadmap.value = true
  } catch (error) {
    console.error('Failed to load roadmap:', error)
  }
}

// Close roadmap dialog
function closeRoadmap() {
  showRoadmap.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-5 w-full" 
       :class="[darkMode ? 'bg-gradient-to-b from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800']">
    
    <!-- Dark mode toggle -->
    <div class="absolute top-5 right-5">
      <button @click="toggleDarkMode" 
              class="p-2 border-2 rounded-full shadow-md transition-all" 
              :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-800']">
        {{ darkMode ? '☀️' : '🌙' }}
      </button>
    </div>
    
    <div class="max-w-3xl w-full border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-8 text-center -mt-24"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-800']">
      
      <div class="mb-5 text-xl">
        <div class="text-6xl mb-2 flex justify-center">
          <!-- Simple mandala-like breathing circle logo -->
          <div class="relative w-24 h-24 flex items-center justify-center">
            <!-- Outer breathing circle -->
            <div class="absolute inset-0 border-4 rounded-full animate-pulse-slow" 
                 :class="darkMode ? 'border-emerald-600' : 'border-emerald-500'"></div>
            
            <!-- Mandala pattern - middle circle -->
            <div class="absolute w-16 h-16 border-2 rounded-full"
                 :class="darkMode ? 'border-emerald-500' : 'border-emerald-600'"></div>
                 
            <!-- Mandala pattern - decorative dotted circle -->
            <div class="absolute w-20 h-20 rounded-full border-dashed border-2 animate-spin-very-slow"
                 :class="darkMode ? 'border-emerald-500/50' : 'border-emerald-600/50'"></div>
            
            <!-- Mandala pattern - inner circle -->
            <div class="absolute w-8 h-8 border-1 rounded-full"
                 :class="darkMode ? 'border-emerald-600' : 'border-emerald-700'"></div>
            
            <!-- Center dot -->
            <div class="relative z-10 w-3 h-3 rounded-full"
                 :class="darkMode ? 'bg-emerald-500' : 'bg-emerald-600'"></div>
          </div>
        </div>
        <h1 class="text-4xl font-bold mb-1">ACT</h1>
        <p class="opacity-75">Interactieve sessies met een AI-therapeut</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div class="border-2 p-4 rounded-lg"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-300']">
          <h2 class="text-xl font-bold mb-2">Wat is ACT?</h2>
          <p class="text-left">
            Acceptance and Commitment Therapy leert je om moeilijke gevoelens te accepteren en te handelen volgens je eigen waarden. Onze app maakt deze therapie toegankelijk voor iedereen.
          </p>
        </div>
        <div class="border-2 p-4 rounded-lg"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-300']">
          <h2 class="text-xl font-bold mb-2">Hoe werkt het?</h2>
          <p class="text-left">
            Voer korte, interactieve gesprekken met onze AI-therapeut die gespecialiseerd is in ACT. Verken thema's zoals Waarden, Mindfulness en Acceptatie op je eigen tempo.
          </p>
        </div>
      </div>
      
      <div class="flex flex-wrap justify-center gap-3 mb-4">
        <div v-for="(topic, index) in ['Waarden', 'Defusie', 'Mindfulness', 'Acceptatie', 'Zelf', 'Toewijding', 'Compassie']"
             :key="index"
             class="px-3 py-1 text-sm rounded-full border"
             :class="[darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50']">
          {{ topic }}
        </div>
      </div>
      
      <!-- Show Start Session button if logged in, otherwise show Login/Register button -->
      <button v-if="user" 
              @click="startApp" 
              class="text-lg px-6 py-3 mt-3 border-2 font-mono transition-all hover:-translate-y-1 hover:shadow-lg"
              :class="[
                darkMode ? 
                  'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600' : 
                  'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              ]">
        Start de Therapie Sessie
      </button>
      
      <button v-else
              @click="goToAuth" 
              class="text-lg px-6 py-3 mt-3 border-2 font-mono transition-all hover:-translate-y-1 hover:shadow-lg"
              :class="[
                darkMode ? 
                  'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600' : 
                  'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              ]">
        Inloggen / Registreren
      </button>
      
      <div class="mt-5 text-sm space-y-2">
        <p class="opacity-70">
          Ontdek de kracht van ACT therapie met geavanceerde AI-technologie
        </p>
        <!-- Retro Roadmap Link -->
        <button @click="openRoadmap"
                class="inline-flex items-center gap-2 px-3 py-1.5 font-mono text-xs border border-black transition-all hover:bg-black hover:text-white cursor-pointer group"
                :class="[
                  darkMode ? 
                    'border-gray-600 hover:bg-gray-600' : 
                    'border-black hover:bg-black'
                ]">
          <font-awesome-icon :icon="['fas', 'map']" 
                            class="transform transition-transform group-hover:-translate-y-0.5" />
          <span class="tracking-wide">[ROADMAP_v1.0]</span>
        </button>
      </div>
    </div>

    <!-- Roadmap Dialog -->
    <div v-if="showRoadmap" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
           :class="[darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black']">
        <!-- Dialog Header -->
        <div class="flex items-center justify-between p-4 border-b-2 border-black dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
          <h2 class="font-mono text-lg flex items-center gap-2">
            <font-awesome-icon :icon="['fas', 'map']" />
            <span>System Roadmap</span>
          </h2>
          <button @click="closeRoadmap" 
                  class="w-8 h-8 flex items-center justify-center border-2 border-black dark:border-gray-600 hover:bg-black hover:text-white dark:hover:bg-gray-600 transition-colors">
            ×
          </button>
        </div>
        <!-- Dialog Content -->
        <div class="p-6 overflow-y-auto prose dark:prose-invert max-w-none"
             v-html="roadmapContent">
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Add any additional styles here */
.prose {
  font-size: 0.9rem;
}

.prose pre {
  background-color: #1a1a1a;
  color: #fff;
  padding: 1rem;
  border-radius: 4px;
}

/* Custom animations */
@keyframes pulse-slow {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.05);
    opacity: 1;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s infinite ease-in-out;
}

@keyframes spin-very-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-very-slow {
  animation: spin-very-slow 20s infinite linear;
}
</style> 