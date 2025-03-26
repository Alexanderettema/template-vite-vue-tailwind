<template>
  <div class="session-details pt-6 md:pt-8" :class="{ 'dark-mode': darkMode }">
    <!-- Back button and header -->
    <div class="flex items-center mb-6 mt-4">
      <button 
        @click="goBack" 
        class="mr-4 p-2 rounded-full transition-all"
        :class="{ 
          'text-gray-700 hover:bg-gray-100': !darkMode, 
          'text-gray-300 hover:bg-gray-800': darkMode 
        }"
      >
        <font-awesome-icon icon="arrow-left" />
      </button>
      <h2 class="text-xl font-semibold" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
        Sessie Details
      </h2>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-pulse flex flex-col items-center">
        <div class="h-16 w-16 rounded-full bg-emerald-500 opacity-75 mb-4"></div>
        <p :class="{ 'text-gray-600': !darkMode, 'text-gray-300': darkMode }">Sessie laden...</p>
      </div>
    </div>

    <!-- Session not found -->
    <div v-else-if="!session" class="py-10 px-4 flex flex-col items-center justify-center border-2 border-dashed rounded-lg"
         :class="{ 'border-gray-300 bg-gray-50': !darkMode, 'border-gray-700 bg-gray-800': darkMode }">
      <font-awesome-icon icon="exclamation-circle" class="text-4xl mb-4" :class="{ 'text-gray-400': !darkMode, 'text-gray-500': darkMode }" />
      <h3 class="text-lg font-medium mb-2" :class="{ 'text-gray-700': !darkMode, 'text-gray-200': darkMode }">
        Sessie niet gevonden
      </h3>
      <p class="text-center mb-4" :class="{ 'text-gray-500': !darkMode, 'text-gray-400': darkMode }">
        Deze sessie bestaat niet of is verwijderd.
      </p>
      <button 
        @click="goToSessions" 
        class="px-4 py-2 rounded-full text-sm font-medium transition-all"
        :class="{ 
          'bg-emerald-600 text-white hover:bg-emerald-700': !darkMode, 
          'bg-emerald-700 text-white hover:bg-emerald-800': darkMode 
        }"
      >
        Terug naar Sessies
      </button>
    </div>

    <!-- Session details -->
    <div v-else class="flex flex-col md:flex-row gap-6">
      <!-- Left column - Session meta -->
      <div class="md:w-1/3">
        <div class="sticky top-6">
          <!-- Session card -->
          <div class="session-meta p-5 rounded-lg border shadow-sm mb-6"
               :class="{ 
                 'bg-white border-gray-200': !darkMode, 
                 'bg-gray-800 border-gray-700': darkMode 
               }">
            <h1 class="text-xl font-semibold mb-2" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
              {{ session.title }}
            </h1>
            
            <div class="flex items-center mb-4 text-sm" :class="{ 'text-gray-500': !darkMode, 'text-gray-400': darkMode }">
              <font-awesome-icon icon="calendar-alt" class="mr-2" />
              {{ formatDate(session.date) }}
            </div>
            
            <div class="flex items-center mb-4 text-sm" :class="{ 'text-gray-500': !darkMode, 'text-gray-400': darkMode }">
              <font-awesome-icon icon="clock" class="mr-2" />
              Duur: {{ formatDuration(session.duration) }}
            </div>
            
            <!-- Tags -->
            <div class="mb-4">
              <div class="text-sm font-medium mb-2" :class="{ 'text-gray-700': !darkMode, 'text-gray-300': darkMode }">
                Thema's:
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span 
                  v-for="(theme, index) in session.summary?.keyThemes || []" 
                  :key="index"
                  class="text-xs px-2 py-1 rounded-full"
                  :class="{ 
                    'bg-gray-100 text-gray-600': !darkMode, 
                    'bg-gray-700 text-gray-300': darkMode 
                  }"
                >
                  #{{ theme }}
                </span>
                <span v-if="!session.summary?.keyThemes?.length" class="text-xs italic" 
                      :class="{ 'text-gray-400': !darkMode, 'text-gray-500': darkMode }">
                  Geen thema's gevonden
                </span>
              </div>
            </div>
            
            <!-- Action buttons -->
            <div class="flex gap-2 mt-5">
              <button 
                @click="continueSession(session.id)" 
                class="flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
                :class="{ 
                  'bg-emerald-600 text-white hover:bg-emerald-700': !darkMode, 
                  'bg-emerald-700 text-white hover:bg-emerald-800': darkMode 
                }"
              >
                <font-awesome-icon icon="play" class="mr-2" />
                Voortzetten
              </button>
              <button 
                @click="confirmDelete" 
                class="p-2 rounded-lg transition-colors"
                :class="{ 
                  'text-gray-700 hover:bg-gray-100': !darkMode, 
                  'text-gray-300 hover:bg-gray-800': darkMode 
                }"
              >
                <font-awesome-icon icon="trash-alt" />
              </button>
            </div>
          </div>
          
          <!-- Session summary -->
          <div class="p-5 rounded-lg border shadow-sm"
               :class="{ 
                 'bg-white border-gray-200': !darkMode, 
                 'bg-gray-800 border-gray-700': darkMode 
               }">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
                Samenvatting
              </h3>
              <button
                @click="regenerateSessionSummary"
                class="text-xs px-3 py-1.5 rounded-full transition-colors flex items-center"
                :class="{ 
                  'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700': !darkMode,
                  'bg-gray-700 text-gray-300 hover:bg-emerald-900 hover:text-emerald-200': darkMode
                }"
                :disabled="isGeneratingSummary"
              >
                <font-awesome-icon :icon="isGeneratingSummary ? 'circle-notch' : 'sync'" 
                  class="mr-1" :class="{ 'fa-spin': isGeneratingSummary }" />
                {{ isGeneratingSummary ? 'Vernieuwen...' : 'Vernieuwen' }}
              </button>
            </div>
            
            <div v-if="session.summary?.summary" class="mb-5">
              <p class="text-sm mb-3" :class="{ 'text-gray-600': !darkMode, 'text-gray-400': darkMode }">
                {{ session.summary.summary }}
              </p>
            </div>
            
            <!-- Insights/Discoveries -->
            <div v-if="session.insights?.length" class="mb-5">
              <h4 class="text-sm font-medium mb-2" :class="{ 'text-gray-700': !darkMode, 'text-gray-300': darkMode }">
                Inzichten:
              </h4>
              <ul class="text-sm space-y-1 pl-5 list-disc" :class="{ 'text-gray-600': !darkMode, 'text-gray-400': darkMode }">
                <li v-for="(insight, index) in session.insights" :key="index">
                  {{ insight }}
                </li>
              </ul>
            </div>
            
            <!-- Reflective questions -->
            <div v-if="session.summary?.reflectiveQuestions?.length">
              <h4 class="text-sm font-medium mb-2" :class="{ 'text-gray-700': !darkMode, 'text-gray-300': darkMode }">
                Reflectieve vragen:
              </h4>
              <div class="space-y-3 mt-3">
                <div 
                  v-for="(question, index) in session.summary.reflectiveQuestions" 
                  :key="index"
                  class="p-3 rounded-lg text-sm italic"
                  :class="{ 
                    'bg-emerald-50 text-emerald-700': !darkMode, 
                    'bg-emerald-900 bg-opacity-30 text-emerald-200': darkMode 
                  }"
                >
                  "{{ question }}"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right column - Conversation -->
      <div class="md:w-2/3">
        <div class="p-5 rounded-lg border shadow-sm"
             :class="{ 
               'bg-white border-gray-200': !darkMode, 
               'bg-gray-800 border-gray-700': darkMode 
             }">
          <h3 class="text-lg font-medium mb-4" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
            Conversatie
          </h3>
          
          <div v-if="!session.messages?.length" class="py-4 text-center text-sm italic"
               :class="{ 'text-gray-400': !darkMode, 'text-gray-500': darkMode }">
            Geen berichten in deze sessie
          </div>
          
          <div v-else class="space-y-4 mb-4">
            <div 
              v-for="(message, index) in session.messages" 
              :key="index"
              class="flex" 
              :class="{ 'justify-end': message.role === 'user' }"
            >
              <div class="max-w-[80%] p-3 rounded-lg"
                   :class="{ 
                     'bg-gray-100 text-gray-800': message.role === 'user' && !darkMode,
                     'bg-gray-700 text-white': message.role === 'user' && darkMode,
                     'bg-emerald-600 text-white': message.role === 'assistant' && !darkMode,
                     'bg-emerald-700 text-white': message.role === 'assistant' && darkMode
                   }">
                <div class="text-sm mb-1 font-medium">
                  {{ message.role === 'user' ? 'Jij' : 'AI Therapeut' }}
                </div>
                <div class="text-sm">
                  {{ message.content }}
                </div>
                
                <!-- Message essence tags -->
                <div v-if="message.essence" class="mt-2 flex flex-wrap gap-1.5">
                  <span 
                    v-for="(tag, tagIndex) in message.essence.split(',')" 
                    :key="tagIndex"
                    class="text-xs px-1.5 py-0.5 rounded-full"
                    :class="{ 
                      'bg-white bg-opacity-20 text-white': message.role === 'assistant',
                      'bg-gray-300 text-gray-700': message.role === 'user' && !darkMode,
                      'bg-gray-600 text-gray-200': message.role === 'user' && darkMode
                    }"
                  >
                    {{ tag.trim() }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionManagement, TherapySession } from '@/composables/useSessionManagement'

// Inject dark mode
const darkMode = inject('darkMode', ref(false))

const route = useRoute()
const router = useRouter()
const { 
  loadSession, 
  isLoading, 
  deleteSession: removeSession,
  currentSession,
  generateSessionSummary,
  saveCurrentSession
} = useSessionManagement()

const session = ref<TherapySession | null>(null)
const isGeneratingSummary = ref(false)

// Load session on component mount
onMounted(async () => {
  const sessionId = route.params.id as string
  if (sessionId) {
    const loadedSession = loadSession(sessionId)
    if (loadedSession) {
      session.value = loadedSession
      
      // If summary is missing, generate one
      if (!loadedSession.summary) {
        await regenerateSessionSummary()
      }
    }
  }
})

// Function to regenerate session summary
async function regenerateSessionSummary() {
  if (!session.value) return
  
  try {
    isGeneratingSummary.value = true
    
    // Store original session
    const originalSession = currentSession.value
    
    // Set current session for generating summary
    currentSession.value = session.value
    
    // Generate summary
    await generateSessionSummary()
    
    // Save changes
    await saveCurrentSession()
    
    // Restore original session
    currentSession.value = originalSession
  } catch (error) {
    console.error('Error regenerating summary:', error)
  } finally {
    isGeneratingSummary.value = false
  }
}

// Navigation functions
function goBack() {
  router.back()
}

function goToSessions() {
  router.push('/sessions')
}

function continueSession(sessionId: string) {
  router.push(`/chat?sessionId=${sessionId}`)
}

function confirmDelete() {
  if (!session.value) return
  
  if (confirm('Weet je zeker dat je deze sessie wilt verwijderen?')) {
    removeSession(session.value.id)
    router.push('/sessions')
  }
}

// Format date for display
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format duration for display
function formatDuration(minutes: number) {
  if (minutes < 1) return 'Minder dan 1 minuut'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) return `${hours} ${hours === 1 ? 'uur' : 'uren'}`
  return `${hours} ${hours === 1 ? 'uur' : 'uren'} en ${remainingMinutes} ${remainingMinutes === 1 ? 'minuut' : 'minuten'}`
}
</script> 