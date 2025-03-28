<template>
  <div class="session-details pt-6 md:pt-8 w-full" :class="{ 'dark-mode': darkMode, 'bg-gradient-to-b from-gray-50 to-gray-100': !darkMode, 'bg-gradient-to-b from-gray-900 to-gray-800': darkMode }">
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
          
          <div v-if="!session.messages || session.messages.length === 0" class="py-4 text-center text-sm italic"
                :class="{ 'text-gray-400': !darkMode, 'text-gray-500': darkMode }">
            Geen berichten in deze sessie
            <div class="mt-2">
              <button 
                @click="reloadSession" 
                class="px-4 py-2 text-xs rounded transition-colors"
                :class="{ 
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': !darkMode, 
                  'bg-emerald-900 bg-opacity-30 text-emerald-200 hover:bg-emerald-800': darkMode 
                }"
              >
                <font-awesome-icon icon="sync" class="mr-1" :class="{ 'fa-spin': isReloading }" />
                Berichten opnieuw laden
              </button>
            </div>
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
                      'bg-emerald-400 bg-opacity-30 text-emerald-50': message.role === 'assistant',
                      'bg-gray-200 text-gray-800': message.role === 'user' && !darkMode,
                      'bg-gray-600 text-gray-100': message.role === 'user' && darkMode
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
import { ref, onMounted, inject, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionManagement, type TherapySession, type SessionSummary } from '@/composables/useSessionManagement'

// Inject dark mode
const darkMode = inject('darkMode', ref(false))

const route = useRoute()
const router = useRouter()
const { loadSession, currentSession, saveCurrentSession, deleteSession: removeSession, loadSavedSessions, savedSessions } = useSessionManagement()

const session = ref<TherapySession | null>(null)
const isLoading = ref(false)
const isReloading = ref(false)

// Load session on mount
onMounted(async () => {
  const sessionId = route.params.id as string
  if (!sessionId) {
    router.push('/sessions')
    return
  }

  try {
    isLoading.value = true
    
    // First load all saved sessions to ensure we have the latest data
    console.log("Loading all sessions before loading specific session")
    await loadSavedSessions()
    
    console.log("Loading session with ID:", sessionId)
    const loadedSession = await loadSession(sessionId)
    if (loadedSession) {
      console.log("Session loaded successfully:", {
        id: loadedSession.id,
        title: loadedSession.title,
        messageCount: loadedSession.messages?.length || 0,
        hasMessages: !!loadedSession.messages?.length
      })

      // Debug the messages
      if (loadedSession.messages?.length) {
        console.log("First message:", loadedSession.messages[0])
      } else {
        console.log("No messages found in the loaded session")
        
        // Try to find the session in savedSessions directly
        const savedSession = savedSessions.value.find(s => s.id === sessionId)
        if (savedSession && savedSession.messages?.length) {
          console.log("Found session in savedSessions with messages:", savedSession.messages.length)
          loadedSession.messages = JSON.parse(JSON.stringify(savedSession.messages))
        }
      }
      
      session.value = loadedSession
    } else {
      console.error("Failed to load session, redirecting to sessions list")
      router.push('/sessions')
    }
  } catch (error) {
    console.error('Error loading session:', error)
    router.push('/sessions')
  } finally {
    isLoading.value = false
  }
})

// Watch the currentSession for any updates to the currently viewed session
watch(() => currentSession.value, (newSession) => {
  if (newSession && session.value && newSession.id === session.value.id) {
    console.log('Updating viewed session with new data from currentSession')
    // Make a deep copy to avoid reference issues
    session.value = JSON.parse(JSON.stringify(newSession))
  }
}, { deep: true })

// Also watch savedSessions to detect changes there
watch(() => savedSessions.value, (newSessions) => {
  if (!session.value) return
  
  // Find the current session in the savedSessions array
  const updatedSession = newSessions.find(s => s.id === session.value?.id)
  if (updatedSession) {
    console.log('Updating viewed session with data from savedSessions')
    // Make a deep copy to avoid reference issues
    session.value = JSON.parse(JSON.stringify(updatedSession))
  }
}, { deep: true })

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

// Function to reload session data
async function reloadSession() {
  if (!session.value) return;
  
  const sessionId = session.value.id;
  isReloading.value = true;
  
  try {
    console.log("Forcefully reloading session data for:", sessionId);
    
    // First reload all sessions to ensure the database has the latest
    await loadSavedSessions();
    
    // Then try to load this specific session again
    const reloadedSession = await loadSession(sessionId);
    
    if (reloadedSession) {
      console.log("Session reloaded successfully with", reloadedSession.messages?.length || 0, "messages");
      session.value = reloadedSession;
    } else {
      console.error("Failed to reload session");
    }
  } catch (error) {
    console.error("Error reloading session:", error);
  } finally {
    isReloading.value = false;
  }
}
</script> 