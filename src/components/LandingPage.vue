<script setup lang="ts">
import { ref } from 'vue'
import { marked } from 'marked'

// Define props and emits
const emit = defineEmits(['start-app'])

const darkMode = ref(false)
const showRoadmap = ref(false)
const roadmapContent = ref('')

// Load dark mode preference from localStorage
if (typeof window !== 'undefined') {
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
}

// Toggle dark mode
function toggleDarkMode() {
  darkMode.value = !darkMode.value
  // Store preference in localStorage
  localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
}

// Start the app
function startApp() {
  emit('start-app')
}

// Load and show roadmap
async function openRoadmap() {
  try {
    const response = await fetch('/docs/client-sessions.md')
    const text = await response.text()
    roadmapContent.value = marked(text)
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
  <div class="min-h-screen flex flex-col items-center justify-center p-5" 
       :class="[darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800']">
    
    <!-- Dark mode toggle -->
    <div class="absolute top-5 right-5">
      <button @click="toggleDarkMode" 
              class="p-2 border-2 rounded-full shadow-md transition-all" 
              :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-800']">
        {{ darkMode ? '☀️' : '🌙' }}
      </button>
    </div>
    
    <div class="max-w-3xl w-full border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-8 text-center"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-800']">
      
      <div class="mb-8 text-xl mt-10">
        <div class="text-6xl mb-4">🧠</div>
        <h1 class="text-4xl font-bold mb-2">ACT Therapie App</h1>
        <p class="opacity-75">Acceptance and Commitment Therapy</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div class="border-2 p-4 rounded-lg"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-300']">
          <h2 class="text-xl font-bold mb-2">Wat is ACT?</h2>
          <p class="text-left">
            Acceptance and Commitment Therapy helpt je om lastige gedachten en gevoelens te accepteren 
            terwijl je stappen zet richting een waardevol leven.
          </p>
        </div>
        <div class="border-2 p-4 rounded-lg"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-300']">
          <h2 class="text-xl font-bold mb-2">Hoe werkt het?</h2>
          <p class="text-left">
            Verken thema's zoals Waarden, Defusie, Mindfulness en meer door te chatten 
            met een AI-assistent gespecialiseerd in ACT therapie.
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
      
      <button @click="startApp" 
              class="text-lg px-6 py-3 mt-5 border-2 font-mono transition-all hover:-translate-y-1 hover:shadow-lg"
              :class="[
                darkMode ? 
                  'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600' : 
                  'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              ]">
        Start de Therapie Sessie
      </button>
      
      <div class="mt-8 text-sm space-y-2">
        <p class="opacity-70">
          Ontwikkeld met behulp van moderne ACT principes en AI technologie
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
</style> 