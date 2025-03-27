<template>
  <div class="session-browser p-6 md:p-8 w-full" :class="{ 'dark-mode': darkMode, 'bg-gradient-to-b from-gray-50 to-gray-100': !darkMode, 'bg-gradient-to-b from-gray-900 to-gray-800': darkMode }">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
        Mijn Sessies
      </h2>
      <button 
        @click="goToChat" 
        class="px-4 py-2 rounded-full text-sm font-medium transition-all"
        :class="{ 
          'bg-emerald-600 text-white hover:bg-emerald-700': !darkMode, 
          'bg-emerald-700 text-white hover:bg-emerald-800': darkMode 
        }"
      >
        <font-awesome-icon icon="plus" class="mr-2" />
        Nieuwe Sessie
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 p-4 rounded-lg flex flex-wrap gap-3 items-center" :class="{ 'bg-gray-100': !darkMode, 'bg-gray-800': darkMode }">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Zoek in sessies..." 
        class="flex-grow px-4 py-2 rounded-full text-sm border transition-all"
        :class="{
          'border-gray-300 focus:border-emerald-500 bg-white text-gray-800': !darkMode,
          'border-gray-700 focus:border-emerald-600 bg-gray-700 text-white': darkMode
        }"
      />
      <div class="flex items-center">
        <span class="text-sm mr-2" :class="{ 'text-gray-600': !darkMode, 'text-gray-300': darkMode }">Sorteren:</span>
        <select 
          v-model="sortOption" 
          class="px-3 py-2 rounded-full text-sm border transition-all"
          :class="{
            'border-gray-300 bg-white text-gray-800': !darkMode,
            'border-gray-700 bg-gray-700 text-white': darkMode
          }"
        >
          <option value="date-desc">Nieuwste eerst</option>
          <option value="date-asc">Oudste eerst</option>
          <option value="duration-desc">Langste eerst</option>
          <option value="duration-asc">Kortste eerst</option>
        </select>
      </div>
      
      <!-- Delete all sessions button -->
      <button 
        @click="confirmDeleteAll" 
        class="ml-auto text-xs px-3 py-2 rounded-full transition-colors flex items-center"
        :class="{ 
          'bg-red-100 text-red-700 hover:bg-red-200': !darkMode, 
          'bg-red-900 bg-opacity-30 text-red-300 hover:bg-red-800 hover:bg-opacity-50': darkMode 
        }"
      >
        <font-awesome-icon icon="trash-alt" class="mr-1" />
        Verwijder Alle Sessies
      </button>

      <!-- Test connection button -->
      <button 
        @click="testConnection" 
        class="ml-2 text-xs px-3 py-2 rounded-full transition-colors flex items-center"
        :class="{ 
          'bg-blue-100 text-blue-700 hover:bg-blue-200': !darkMode, 
          'bg-blue-900 bg-opacity-30 text-blue-300 hover:bg-blue-800 hover:bg-opacity-50': darkMode 
        }"
      >
        <font-awesome-icon icon="database" class="mr-1" />
        Test Supabase
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading || isInitialLoading" class="flex flex-col items-center justify-center py-12 px-4">
      <div class="relative w-24 h-24 mb-6">
        <!-- Outer circle -->
        <div class="absolute inset-0 border-4 border-emerald-200 rounded-full animate-pulse"></div>
        <!-- Inner circle -->
        <div class="absolute inset-2 border-4 border-emerald-300 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
        <!-- Center circle -->
        <div class="absolute inset-4 border-4 border-emerald-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
        <!-- Center dot -->
        <div class="absolute inset-8 bg-emerald-500 rounded-full animate-pulse" style="animation-delay: 0.6s"></div>
      </div>
      <div class="text-center space-y-2">
        <p class="text-lg font-medium text-emerald-600 animate-pulse" style="animation-delay: 0.8s">
          Even geduld...
        </p>
        <p class="text-sm text-gray-500 italic max-w-md animate-pulse" style="animation-delay: 1s">
          We verzamelen je sessies met dezelfde zorg als een therapeut die luistert naar je verhaal
        </p>
      </div>
    </div>

    <!-- Sessions grid - only show when not loading and has sessions -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div 
        v-for="session in filteredSessions" 
        :key="session.id"
        class="session-card rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer hover:shadow-md border"
        :class="{ 
          'bg-white border-gray-200': !darkMode, 
          'bg-gray-800 border-gray-700': darkMode 
        }"
        @click="viewSession(session.id)"
      >
        <!-- Card header -->
        <div class="p-5 border-b" :class="{ 'border-gray-200': !darkMode, 'border-gray-700': darkMode }">
          <div class="flex justify-between items-start">
            <h3 class="font-medium" :class="{ 'text-gray-800': !darkMode, 'text-white': darkMode }">
              {{ session.title }}
            </h3>
            <div class="text-xs rounded-full px-2.5 py-1.5" :class="{ 
              'bg-emerald-100 text-emerald-800': !darkMode, 
              'bg-emerald-900 text-emerald-200': darkMode 
            }">
              {{ formatDuration(session.duration) }}
            </div>
          </div>
          <div class="text-sm mt-1.5" :class="{ 'text-gray-500': !darkMode, 'text-gray-400': darkMode }">
            {{ formatDate(session.date) }}
          </div>
          <!-- Session ID as small text to help identify duplicates -->
          <div class="text-xs mt-1 opacity-50" :class="{ 'text-gray-500': !darkMode, 'text-gray-400': darkMode }">
            ID: {{ session.id.substring(0, 8) }}
          </div>
        </div>

        <!-- Card body -->
        <div class="p-5">
          <div v-if="session.summary" class="mb-4">
            <div class="text-sm font-medium mb-1.5" :class="{ 'text-gray-700': !darkMode, 'text-gray-300': darkMode }">
              Samenvatting:
            </div>
            <p class="text-sm line-clamp-2" :class="{ 'text-gray-600': !darkMode, 'text-gray-400': darkMode }">
              {{ session.summary.summary }}
            </p>
          </div>

          <!-- Tags -->
          <div class="flex flex-wrap gap-2 mb-4">
            <span 
              v-for="(theme, index) in session.summary?.keyThemes || []" 
              :key="index"
              class="text-xs px-2.5 py-1 rounded-full"
              :class="{ 
                'bg-gray-100 text-gray-600': !darkMode, 
                'bg-gray-700 text-gray-300': darkMode 
              }"
            >
              #{{ theme }}
            </span>
          </div>

          <!-- Reflective questions preview -->
          <div v-if="session.summary?.reflectiveQuestions?.length">
            <div class="text-sm font-medium mb-1.5" :class="{ 'text-gray-700': !darkMode, 'text-gray-300': darkMode }">
              Reflectieve vraag:
            </div>
            <p class="text-sm italic line-clamp-2" :class="{ 'text-gray-600': !darkMode, 'text-gray-400': darkMode }">
              "{{ session.summary.reflectiveQuestions[0] }}"
            </p>
          </div>
        </div>

        <!-- Card footer -->
        <div class="p-4 flex justify-between items-center border-t" 
             :class="{ 'border-gray-200 bg-gray-50': !darkMode, 'border-gray-700 bg-gray-900': darkMode }">
          <button 
            @click.stop="continueSession(session.id)" 
            class="text-xs font-medium px-3.5 py-2 rounded transition-colors"
            :class="{ 
              'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': !darkMode, 
              'bg-emerald-900 text-emerald-200 hover:bg-emerald-800': darkMode 
            }"
          >
            <font-awesome-icon icon="play" class="mr-1.5" />
            Voortzetten
          </button>
          <button 
            @click.stop="deleteSession(session.id)" 
            class="text-xs px-2.5 py-2 rounded transition-colors"
            :class="{ 
              'text-gray-500 hover:text-red-500 hover:bg-red-50': !darkMode, 
              'text-gray-400 hover:text-red-400 hover:bg-gray-800': darkMode 
            }"
          >
            <font-awesome-icon icon="trash-alt" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionManagement, TherapySession } from '@/composables/useSessionManagement'

// Inject dark mode
const darkMode = inject('darkMode', ref(false))

const router = useRouter()
const { 
  savedSessions, 
  isLoading, 
  loadSavedSessions, 
  deleteSession: removeSession,
  currentSession,
  generateSessionSummary,
  saveCurrentSession,
  deleteAllSessions,
  testSupabaseConnection
} = useSessionManagement()

// Local state
const searchQuery = ref('')
const sortOption = ref('date-desc')
const isInitialLoading = ref(true)

// Load sessions when component mounts
onMounted(async () => {
  console.log("SessionBrowser mounted, loading sessions...")
  await loadSavedSessions()
  
  // Update all sessions with recalculated durations and regenerate summaries if needed
  if (savedSessions.value && savedSessions.value.length > 0) {
    console.log("Updating session information...")
    for (const session of savedSessions.value) {
      await updateSessionInfo(session)
    }
    console.log("Session information updated")
  }
  isInitialLoading.value = false
})

// Function to update session info
async function updateSessionInfo(session: TherapySession) {
  if (!session) return;
  
  // Calculate the real duration based on start and current time
  const startDate = new Date(session.date);
  
  // Find last message timestamp or use session date
  let endDate = new Date();
  if (session.messages && session.messages.length > 0) {
    const lastMessage = session.messages[session.messages.length - 1];
    if (lastMessage.timestamp) {
      endDate = new Date(lastMessage.timestamp);
    }
  }
  
  // Duration in minutes
  const durationInMinutes = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
  
  // Update if there's a significant difference (more than 1 minute)
  if (Math.abs(durationInMinutes - session.duration) > 1) {
    session.duration = durationInMinutes;
    
    // We need to save this update
    const originalSession = currentSession.value;
    currentSession.value = session;
    await saveCurrentSession();
    currentSession.value = originalSession;
  }
  
  // Generate session summary if missing and we have messages
  if (!session.summary && session.messages && session.messages.length >= 2) {
    console.log(`Generating summary for session ${session.id}`)
    const originalSession = currentSession.value;
    currentSession.value = session;
    await generateSessionSummary();
    await saveCurrentSession();
    currentSession.value = originalSession;
    console.log(`Summary generated for session ${session.id}`)
  }
}

// Computed filtered and sorted sessions
const filteredSessions = computed(() => {
  // First ensure unique sessions by ID
  const uniqueSessions = [...new Map(savedSessions.value.map(session => [session.id, session])).values()];
  
  // Then filter by search query
  let filtered = [...uniqueSessions];
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(session => 
      session.title.toLowerCase().includes(query) || 
      session.summary?.summary.toLowerCase().includes(query) ||
      session.summary?.keyThemes.some(theme => theme.toLowerCase().includes(query))
    )
  }
  
  // Then sort by selected option
  return filtered.sort((a, b) => {
    switch (sortOption.value) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'duration-desc':
        return b.duration - a.duration
      case 'duration-asc':
        return a.duration - b.duration
      default:
        return 0
    }
  })
})

// Navigate to chat page to start a new session
function goToChat() {
  router.push('/chat')
}

// View a specific session
function viewSession(sessionId: string) {
  router.push(`/sessions/${sessionId}`)
}

// Continue a session
function continueSession(sessionId: string) {
  router.push(`/chat?sessionId=${sessionId}`)
}

// Delete a session
async function deleteSession(sessionId: string) {
  if (confirm('Weet je zeker dat je deze sessie wilt verwijderen?')) {
    await removeSession(sessionId)
    // Reload sessions after deletion
    await loadSavedSessions()
  }
}

// Format date for display
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format duration for display
function formatDuration(minutes: number) {
  if (minutes < 1) return 'Minder dan 1 min'
  if (minutes < 60) return `${minutes} min`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) return `${hours} uur`
  return `${hours} uur ${remainingMinutes} min`
}

// Add function to confirm and delete all sessions
async function confirmDeleteAll() {
  if (confirm('Weet je zeker dat je ALLE sessies wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
    if (await deleteAllSessions()) {
      // Reload sessions after deletion
      await loadSavedSessions()
    }
  }
}

// Add the test function
async function testConnection() {
  const result = await testSupabaseConnection()
  if (result) {
    alert('Successfully connected to Supabase! Check console for details.')
  } else {
    alert('Failed to connect to Supabase. Check console for errors.')
  }
}
</script>

<style>
.session-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.session-card:hover {
  transform: translateY(-3px);
}

/* Line clamp for multi-line text truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 