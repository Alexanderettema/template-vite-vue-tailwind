<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch, inject } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSessionManagement } from '@/composables/useSessionManagement'

const router = useRouter()
const route = useRoute()
const { signOut } = useAuth()
const { currentSession, startNewSession, saveCurrentSession, loadSession, updateSessionMessages, addSessionInsight, generateSessionSummary, loadSavedSessions } = useSessionManagement()

// Define emits
const emit = defineEmits(['go-to-home'])

// Inject shared state from App.vue
const darkMode = inject('darkMode', ref(false))
const showOverlay = inject('showOverlay', ref(false))
const onboardingStep = inject('onboardingStep', ref(0))

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const systemInstructions = `Je bent een ACT (Acceptance and Commitment Therapy) expert en gids. Je rol is om:
1. Op bewijs gebaseerde ACT-technieken en principes te bieden
2. Duidelijke, meelevende en praktische taal te gebruiken
3. Te focussen op ervaringsgerichte oefeningen en mindfulness-praktijken
4. De nadruk te leggen op acceptatie van moeilijke gedachten en gevoelens terwijl je je richt op waarde-gerichte acties
5. Antwoorden onder 50 woorden te houden - wees uiterst beknopt
6. Voorbeelden en metaforen te gebruiken wanneer nuttig, maar houd ze kort
7. Het geven van medisch advies of diagnoses te vermijden
8. Zelfcompassie en persoonlijke groei aan te moedigen

BELANGRIJK: 
- Je antwoorden MOETEN onder 50 woorden blijven. Prioriteer duidelijkheid en beknoptheid boven volledigheid.
- Eindigen ALTIJD op een manier die het gesprek open houdt voor vervolgvragen of verdieping.
- Stel een subtiele vervolgvraag of geef een impliciete uitnodiging in je laatste zin.
- VERMIJD het eindigen met "laat me weten of je vragen hebt" of gelijksoortige expliciete uitnodigingen.
- Verwijs ALTIJD specifiek naar wat de gebruiker zojuist heeft gedeeld, toon dat je echt luistert.
- Bouw voort op eerdere uitwisselingen en verdiep het gesprek, in plaats van alleen generieke ACT principes te delen.
- Personaliseer je antwoorden door elementen uit het verhaal van de gebruiker te integreren.
- Leg een duidelijk verband tussen jouw ACT-gerelateerde inzichten en de specifieke situatie van de gebruiker.`

const userMessage = ref('')
const chatHistory = ref<{ role: 'user' | 'assistant', content: string, essence?: string, displayFull: boolean, timestamp?: string }[]>([])
const isLoading = ref(false)
const isEssenceLoading = ref(false)
const selectedMainTopic = ref('')
const showEndSession = ref(false)
const sessionSummary = ref('')

const mainTopics = {
  "Waarden": "Waarden verkenning",
  "Defusie": "Defusie techniek",
  "Mindfulness": "Het huidige moment",
  "Acceptatie": "Acceptatie oefening",
  "Zelf": "Observerend zelf",
  "Toewijding": "Toegewijde actie",
  "Compassie": "Zelfcompassie"
}

// Add new dailyChallenges object
const dailyChallenges = {
  "Uitstelgedrag": "Uitstelgedrag aanpakken",
  "Piekeren": "Piekeren doorbreken",
  "Negatief denken": "Negatieve gedachten",
  "Vastzitten": "Doorbreken van blokkades",
  "Frustratie": "Omgaan met frustratie",
  "Stress": "Stress verminderen",
  "Zelfkritiek": "Minder zelfkritisch zijn"
}

// Add reference value to track the current list mode
const showDailyChallenges = ref(false)

const subTopics = {
  "Waarden": [
    "Levensrichting",
    "Kernwaarden",
    "Waarden vs doelen"
  ],
  "Defusie": [
    "Gedachten observeren",
    "Bladeren op de stroom",
    "Je geest bedanken"
  ],
  "Mindfulness": [
    "Lichaamsscan",
    "Vijf zintuigen",
    "Bewust ademhalen"
  ],
  "Acceptatie": [
    "Pijn vs lijden",
    "Ruimte maken",
    "De strijd staken"
  ],
  "Zelf": [
    "Observerende zelf",
    "Denkende zelf",
    "Contextueel zelf"
  ],
  "Toewijding": [
    "Waardegericht handelen",
    "Barrières overwinnen",
    "Kleine stappen zetten"
  ],
  "Compassie": [
    "Zelfvriendelijkheid",
    "Gemeenschappelijkheid",
    "Mindful aanvaarden"
  ]
}

// Add subTopics for daily challenges
const challengeSubTopics = {
  "Uitstelgedrag": [
    "Uitstel herkennen",
    "Kleine stappen zetten",
    "Motivatie vinden"
  ],
  "Piekeren": [
    "Piekerpatronen",
    "Gedachten loslaten",
    "Zorgtijd inplannen"
  ],
  "Negatief denken": [
    "Gedachten uitdagen",
    "Helpende gedachten",
    "Distantie creëren"
  ],
  "Vastzitten": [
    "Patronen herkennen",
    "Nieuwe perspectieven",
    "Actie ondernemen"
  ],
  "Frustratie": [
    "Triggers herkennen",
    "Acceptatie oefenen",
    "Emotieregulatie"
  ],
  "Stress": [
    "Stresssignalen",
    "Grenzen stellen",
    "Ontspanningsoefeningen"
  ],
  "Zelfkritiek": [
    "Innerlijke criticus",
    "Zelfcompassie",
    "Helpende gedachten"
  ]
}

// Add a MutationObserver to automatically scroll when new messages are added
let chatObserver: MutationObserver | null = null

// Add a watch on chatHistory to ensure we scroll when messages change
watch(() => chatHistory.value.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

// Add a watch on chatHistory to manage session data
watch(() => chatHistory.value, (newChatHistory) => {
  if (currentSession.value) {
    // Update the session with new messages
    updateSessionMessages(newChatHistory.map((msg: { role: 'user' | 'assistant', content: string, essence?: string, displayFull: boolean, timestamp?: string }) => ({
      role: msg.role,
      content: msg.content,
      essence: msg.essence,
      timestamp: msg.timestamp
    })))
    
    // Auto-save session after each message
    saveCurrentSession()
  }
}, { deep: true })

// Add session state refs
const showSessionEndModal = ref(false)
const isGeneratingSummary = ref(false)

// Add methods for the help panel keyboard and click outside functionality
function handleHelpKeyDown(event: KeyboardEvent) {
  if (showHelpPanel.value && event.key === 'Escape') {
    closeHelp()
  }
}

// Check if click is outside the help panel
function handleClickOutside(event: MouseEvent) {
  if (showHelpPanel.value) {
    const helpPanel = document.querySelector('.help-panel-container')
    if (helpPanel && !helpPanel.contains(event.target as Node)) {
      closeHelp()
    }
  }
}

// Add font size settings reference
const fontSize = ref('medium') // Options: small, medium, large

// Function to handle font size changes
function changeFontSize(size: string) {
  fontSize.value = size
  // Store preference in localStorage
  localStorage.setItem('fontSize', size)
}

// Add settings panel state
const showSettingsPanel = ref(false)

// Function to toggle settings panel
function toggleSettings() {
  showSettingsPanel.value = !showSettingsPanel.value
}

// Add welcome message when component is first loaded
function showWelcomeMessage() {
  const welcomeText = "Welkom bij je ACT therapie sessie. Ik ben je interactieve ACT Specialist, gespecialiseerd in Acceptance and Commitment Therapy. Wat zou je vandaag willen verkennen? Je kunt een thema kiezen of gewoon je gedachten delen."
  
  chatHistory.value.push({ 
    role: 'assistant', 
    content: welcomeText, 
    displayFull: false,
    timestamp: new Date().toISOString() 
  })
  scrollToBottom()
  
  // Start animating the welcome message
  animateTextDisplay(welcomeText)
  
  // Generate essence words for the welcome message
  getEssence(welcomeText, 0)
}

// Add state for animated text display
const animatingMessage = ref(false)
const displayedText = ref('')
const fullText = ref('')
const currentCharIndex = ref(0)
const typingSpeed = ref(30) // ms per character
const messageFadeIn = ref(true)

// Function to animate text display with breathing effect
function animateTextDisplay(text: string) {
  animatingMessage.value = true
  fullText.value = text
  displayedText.value = text
  messageFadeIn.value = true
  
  // Set timeout to end animation after 1.5 seconds
  setTimeout(() => {
    animatingMessage.value = false
  }, 1500)
}

onMounted(async () => {
  // Use a more specific selector for the chat container
  const chatContainer = document.querySelector('.w-\\[600px\\] .flex-1.overflow-y-auto')
  if (chatContainer) {
    chatObserver = new MutationObserver(() => {
      scrollToBottom()
    })
    
    chatObserver.observe(chatContainer, {
      childList: true,
      subtree: true
    })
  }
  
  // Initial scroll to bottom when component mounts
  scrollToBottom()
  
  // Check for saved dark mode preference
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode === 'true') {
    darkMode.value = true
  }
  
  // Load font size preference
  const savedFontSize = localStorage.getItem('fontSize')
  if (savedFontSize) {
    fontSize.value = savedFontSize
  }
  
  // Load existing sessions first to prevent duplicates
  loadSavedSessions()
  
  // Check if we're continuing an existing session
  const sessionId = route.query.sessionId as string
  if (sessionId) {
    const session = loadSession(sessionId)
    if (session && session.messages.length > 0) {
      // Load messages from the session
      chatHistory.value = session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        essence: msg.essence,
        displayFull: true,
        timestamp: msg.timestamp
      }))
    } else {
      // Start new session if not found
      startNewSession()
      showWelcomeMessage()
    }
  } else if (!currentSession.value) {
    // Only start a new session if we don't have one already
    startNewSession()
    showWelcomeMessage()
  } else if (chatHistory.value.length === 0) {
    // If we have a session but no chat history, show welcome message
    showWelcomeMessage()
  }
  
  // Add event listeners for help panel
  window.addEventListener('keydown', handleHelpKeyDown)
  window.addEventListener('mousedown', handleClickOutside)
  
  // Add event listener for settings panel
  window.addEventListener('keydown', handleSettingsKeyDown)
})

onUnmounted(() => {
  if (chatObserver) {
    chatObserver.disconnect()
  }
  
  // Remove event listeners
  window.removeEventListener('keydown', handleHelpKeyDown)
  window.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('keydown', handleSettingsKeyDown)
})

// Update sendMessage to use the animation
async function sendMessage() {
  if (!userMessage.value.trim()) return
  
  const message = userMessage.value
  chatHistory.value.push({ 
    role: 'user', 
    content: message, 
    displayFull: false,
    timestamp: new Date().toISOString() 
  })
  userMessage.value = ''
  isLoading.value = true
  
  scrollToBottom()

  try {
    // Get up to 5 previous messages for context
    const previousMessages = chatHistory.value
      .slice(-10)  // Take the last 10 messages (or fewer if there aren't 10)
      .map(msg => `${msg.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${msg.content}`)
      .join('\n\n');
    
    // Include previous messages in the prompt for context
    const fullPrompt = `${systemInstructions}

Vorige berichten (gebruik dit voor context):
${previousMessages}

Denk eraan om direct te verwijzen naar wat de gebruiker deelt, dus niet alleen ACT-principes vertellen, maar ook personaliseren en voortbouwen op eerdere uitwisselingen.

Antwoord op het nieuwste bericht van de gebruiker.`
    
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    const messageIndex = chatHistory.value.length
    chatHistory.value.push({ 
      role: 'assistant', 
      content: text, 
      displayFull: false,
      timestamp: new Date().toISOString() 
    })
    
    // Start animating the message with the breathing effect
    animateTextDisplay(text)
    
    getEssence(text, messageIndex)
    
    scrollToBottom()
  } catch (error) {
    console.error('Error:', error)
    chatHistory.value.push({ 
      role: 'assistant', 
      content: 'Sorry, er was een fout bij het verwerken van je verzoek.', 
      displayFull: true,
      timestamp: new Date().toISOString() 
    })
    
    scrollToBottom()
  } finally {
    isLoading.value = false
  }
}

// Add function to show full message immediately (for skipping animation)
function skipAnimation() {
  if (animatingMessage.value) {
    animatingMessage.value = false
  }
}

async function getEssence(text: string, messageIndex: number) {
  isEssenceLoading.value = true
  try {
    const essencePrompt = `Uit dit ACT therapie antwoord, extract EXACT 3 belangrijke sleutelwoorden die als conversatie-voortzettingen kunnen dienen.
      
      Belangrijke regels:
      1. Kies woorden die ECHT in de tekst voorkomen
      2. Kies woorden die tot verdieping of verdere verkenning uitnodigen
      3. Selecteer woorden die verschillende aspecten van ACT therapy vertegenwoordigen
      4. Houd de woorden kort en krachtig (1-2 woorden per concept)
      5. Gebruik zelfstandige naamwoorden of kernbegrippen (geen werkwoorden/bijvoeglijke naamwoorden)
      
      Format: antwoord met ALLEEN 3 geëxtraheerde woorden gescheiden door spaties. Geen uitleg of extra tekst.
      
      Text: "${text}"`
    
    const result = await model.generateContent(essencePrompt)
    const response = await result.response
    const essence = response.text().trim()
    
    if (chatHistory.value[messageIndex]) {
      chatHistory.value[messageIndex].essence = essence
    }
    
    scrollEssencePanelToBottom()
  } catch (error) {
    console.error('Error generating essence:', error)
  } finally {
    isEssenceLoading.value = false
  }
}

function splitEssence(essence: string | undefined): string[] {
  if (!essence) return []
  return essence.split(/\s+/).filter(word => word.trim().length > 0).slice(0, 3)
}

function useEssenceWord(word: string) {
  userMessage.value = `Kun je meer vertellen over ${word} in de context van ACT therapie?`
  sendMessage()
}

function scrollToBottom() {
  nextTick(() => {
    // More specific selector for the chat panel only
    const chatContainer = document.querySelector('.w-\\[600px\\] .flex-1.overflow-y-auto')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  })
}

function scrollEssencePanelToBottom() {
  nextTick(() => {
    const essencePanel = document.querySelector('.w-72 .flex-1.overflow-y-auto')
    if (essencePanel && essencePanel !== document.querySelector('.w-\\[600px\\] .flex-1.overflow-y-auto')) {
      essencePanel.scrollTop = essencePanel.scrollHeight
    }
  })
}

function selectMainTopic(topic: string) {
  selectedMainTopic.value = topic
}

function sendSubTopic(subtopic: string) {
  const fullTopic = `${mainTopics[selectedMainTopic.value as keyof typeof mainTopics]}: ${subtopic}`
  userMessage.value = fullTopic
  sendMessage()
  selectedMainTopic.value = ''
}

// Add confirmation state for reset
const showResetConfirm = ref(false)

// Update resetSession function to clear chat and show welcome message
function resetSession() {
  // Show confirmation dialog instead of immediate reset
  showResetConfirm.value = true
}

// Confirm reset function
function confirmReset() {
  chatHistory.value = []
  selectedMainTopic.value = ''
  showEndSession.value = false
  sessionSummary.value = ''
  showResetConfirm.value = false
  
  // Show welcome message again
  showWelcomeMessage()
}

// Cancel reset function
function cancelReset() {
  showResetConfirm.value = false
}

// Add separate show states for help panel
const showHelpPanel = ref(false)

// Function to toggle help panel
function toggleHelp() {
  showHelpPanel.value = !showHelpPanel.value
}

// Update function to handle showing the guided tour
function startGuidedTour() {
  // Reset state and show only the guided tour steps
  onboardingStep.value = 1 // Start with first step
  showOverlay.value = true // Show the steps overlay
  
  // This extra nextTick ensures DOM is updated before we try to focus
  nextTick(() => {
    const firstStep = document.querySelector('.tour-step-1')
    if (firstStep && 'focus' in firstStep) {
      (firstStep as HTMLElement).focus()
    }
  })
}

// Function to close help panel
function closeHelp() {
  showHelpPanel.value = false
}

// Rename startOnboarding to reflect it's now specifically for guided tour
function startOnboarding() {
  startGuidedTour()
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  // Store preference in localStorage
  localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
}

// Add function to show sessions page
function viewSessions() {
  router.push('/sessions')
}

// Add function to end session and view summary
async function endSession() {
  isGeneratingSummary.value = true
  
  try {
    // Always generate a summary when ending a session
    if (currentSession.value) {
      await generateSessionSummary()
      
      if (currentSession.value?.summary) {
        sessionSummary.value = currentSession.value.summary.summary
        
        // Ensure we update the current session with the final summary
        await saveCurrentSession()
        
        // Show the end session modal
        showSessionEndModal.value = true
      } else {
        console.error('Failed to generate session summary')
      }
    }
  } catch (error) {
    console.error('Error ending session:', error)
  } finally {
    isGeneratingSummary.value = false
  }
}

// Function to reset chat and start a new session
function startNewChat() {
  // Close the modal
  showSessionEndModal.value = false
  
  // Start a new session
  startNewSession()
  
  // Clear chat history
  chatHistory.value = []
  
  // Show welcome message
  showWelcomeMessage()
}

// Custom icon mapping for ACT themes
const themeIcons = {
  "Waarden": "heart",
  "Defusie": "paperclip", 
  "Mindfulness": "eye",
  "Acceptatie": "hand",
  "Zelf": "user",
  "Toewijding": "compass",
  "Compassie": "smile"
}

// Add custom icon mapping for daily challenges
const challengeIcons = {
  "Uitstelgedrag": "clock",
  "Piekeren": "brain", 
  "Negatief denken": "cloud-rain",
  "Vastzitten": "lock",
  "Frustratie": "bolt",
  "Stress": "exclamation-circle",
  "Zelfkritiek": "comment-slash"
}

// Add function to send a challenge subtopic
function sendChallengeSubTopic(subtopic: string) {
  const challenge = selectedMainTopic.value;
  const fullTopic = `${dailyChallenges[challenge as keyof typeof dailyChallenges]}: ${subtopic}`;
  userMessage.value = fullTopic;
  sendMessage();
  selectedMainTopic.value = '';
}

// To toggle between showing ACT themes and daily challenges
function toggleChallengeMode() {
  showDailyChallenges.value = !showDailyChallenges.value;
  // Reset selected topic when switching modes
  selectedMainTopic.value = '';
}

// Add method to close settings panel with escape key
function handleSettingsKeyDown(event: KeyboardEvent) {
  if (showSettingsPanel.value && event.key === 'Escape') {
    toggleSettings()
  }
}

const getSubTopicIcon = (subtopic: string) => {
  const icons: { [key: string]: string } = {
    'Acceptance': 'heart',
    'Commitment': 'flag',
    'Values': 'star',
    'Mindfulness': 'brain',
    'Self-as-Context': 'user',
    'Defusion': 'cloud',
    'Present Moment': 'clock',
    'Psychological Flexibility': 'route',
    'Values Clarification': 'compass',
    'Committed Action': 'walking',
    'Mindful Breathing': 'wind',
    'Body Scan': 'spa',
    'Thought Defusion': 'cloud-rain',
    'Values-Based Goals': 'target',
    'Self-Compassion': 'hands-helping',
    'Mindful Walking': 'shoe-prints',
    'Acceptance Exercise': 'hands',
    'Values Visualization': 'eye',
    'Mindful Eating': 'apple-alt',
    'Gratitude Practice': 'heart',
    'Mindful Movement': 'running',
    'Stress Management': 'shield-alt',
    'Emotional Awareness': 'smile',
    'Mindful Communication': 'comments',
    'Personal Growth': 'seedling',
    'Life Balance': 'balance-scale',
    'Resilience': 'umbrella',
    'Self-Care': 'spa',
    'Positive Psychology': 'sun',
    'Well-being': 'heartbeat'
  }
  return icons[subtopic] || 'star'
}

const getChallengeIcon = (subtopic: string) => {
  const icons: { [key: string]: string } = {
    'Daily Meditation': 'spa',
    'Gratitude Journal': 'book',
    'Mindful Walking': 'shoe-prints',
    'Values Check-in': 'compass',
    'Stress Management': 'shield-alt',
    'Emotional Awareness': 'smile',
    'Mindful Communication': 'comments',
    'Personal Growth': 'seedling',
    'Life Balance': 'balance-scale',
    'Resilience': 'umbrella',
    'Self-Care': 'spa',
    'Positive Psychology': 'sun',
    'Well-being': 'heartbeat'
  }
  return icons[subtopic] || 'tasks'
}

const getKeywordIcon = (word: string) => {
  const icons: { [key: string]: string } = {
    'Acceptance': 'heart',
    'Commitment': 'flag',
    'Values': 'star',
    'Mindfulness': 'brain',
    'Present': 'clock',
    'Awareness': 'eye',
    'Flexibility': 'route',
    'Growth': 'seedling',
    'Balance': 'balance-scale',
    'Resilience': 'umbrella',
    'Well-being': 'heartbeat',
    'Peace': 'dove',
    'Joy': 'smile',
    'Love': 'heart',
    'Gratitude': 'hands-helping',
    'Compassion': 'hands',
    'Wisdom': 'lightbulb',
    'Strength': 'fist-raised',
    'Courage': 'shield-alt',
    'Hope': 'sun',
    'Purpose': 'compass',
    'Meaning': 'star',
    'Connection': 'users',
    'Change': 'sync',
    'Freedom': 'dove',
    'Truth': 'check-circle',
    'Beauty': 'flower',
    'Harmony': 'music'
  }
  return icons[word] || 'tag'
}

// Add the exploreKeyword method
const exploreKeyword = (word: string) => {
  userMessage.value = `Tell me more about ${word} in the context of ACT therapy.`
  sendMessage()
}

async function handleLogout() {
  console.log('Attempting to logout...')
  try {
    await signOut()
    console.log('Logout successful')
    // Save the current session before navigating away
    if (currentSession.value) {
      await saveCurrentSession()
    }
    // Navigate to the landing page
    router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Calculate session duration in minutes
function calculateSessionDuration() {
  if (!currentSession.value) return 0
  
  const startDate = new Date(currentSession.value.date)
  const now = new Date()
  
  return Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60))
}
</script>

<template>
  <div class="flex min-h-screen max-h-screen p-5 justify-center items-start gap-5" 
       :class="[darkMode ? 'bg-gray-900' : 'bg-gray-100']">
    <!-- Themes panel (new left sidebar) -->
    <div class="w-72 h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden order-first"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold flex items-center" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="list" class="mr-1" />
          {{ !selectedMainTopic ? (showDailyChallenges ? 'Dagelijkse Uitdagingen' : 'ACT Thema\'s') : 'Specifieke Oefeningen' }}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 scrollbar-thin scrollbar-track-white"
           :class="[darkMode ? 'bg-gray-800 scrollbar-thumb-emerald-700 scrollbar-track-gray-800' : 'bg-white scrollbar-thumb-emerald-600']">
        <!-- Main topics -->
        <div v-if="!selectedMainTopic" class="flex flex-col gap-2.5">
          <div class="font-bold border p-1 mb-2.5 text-center flex items-center justify-center"
               :class="[darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-800 bg-white']">
            <font-awesome-icon :icon="showDailyChallenges ? 'tasks' : 'star'" class="mr-1" />
            {{ showDailyChallenges ? 'Kies een uitdaging:' : 'Kies een ACT thema:' }}
          </div>
          
          <!-- ACT Themes list -->
          <template v-if="!showDailyChallenges">
            <button 
              v-for="(description, topic) in mainTopics" 
              :key="topic"
              @click="selectMainTopic(topic)"
              :disabled="isLoading"
              class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon :icon="themeIcons[topic as keyof typeof themeIcons] || 'bookmark'" class="mr-2" />
              {{ topic }}
              <span class="ml-auto text-xs opacity-70">
                <font-awesome-icon icon="chevron-right" />
              </span>
            </button>
          </template>
          
          <!-- Daily Challenges list -->
          <template v-else>
            <button 
              v-for="(description, challenge) in dailyChallenges" 
              :key="challenge"
              @click="selectMainTopic(challenge)"
              :disabled="isLoading"
              class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon :icon="challengeIcons[challenge as keyof typeof challengeIcons] || 'tasks'" class="mr-2" />
              {{ challenge }}
              <span class="ml-auto text-xs opacity-70">
                <font-awesome-icon icon="chevron-right" />
              </span>
            </button>
          </template>
        </div>
        
        <!-- Subtopics after main topic selection -->
        <div v-else class="flex flex-col gap-2.5">
          <div class="font-bold border p-1 mb-2.5 text-center flex items-center justify-center"
               :class="[darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-800 bg-white']">
            <font-awesome-icon icon="star" class="mr-1" />
            Kies een oefening:
          </div>
          
          <!-- Display ACT theme subtopics -->
          <template v-if="!showDailyChallenges && subTopics[selectedMainTopic as keyof typeof subTopics]">
            <button 
              v-for="(subtopic, index) in subTopics[selectedMainTopic as keyof typeof subTopics]" 
              :key="index"
              @click="sendSubTopic(subtopic)"
              :disabled="isLoading"
              class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon :icon="getSubTopicIcon(subtopic)" class="mr-2" />
              {{ subtopic }}
            </button>
          </template>
          
          <!-- Display challenge subtopics -->
          <template v-if="showDailyChallenges && challengeSubTopics[selectedMainTopic as keyof typeof challengeSubTopics]">
            <button 
              v-for="(subtopic, index) in challengeSubTopics[selectedMainTopic as keyof typeof challengeSubTopics]" 
              :key="index"
              @click="sendChallengeSubTopic(subtopic)"
              :disabled="isLoading"
              class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon :icon="getChallengeIcon(subtopic)" class="mr-2" />
              {{ subtopic }}
            </button>
          </template>
          
          <button 
            @click="selectedMainTopic = ''" 
            class="w-full mt-4 text-left p-2 border-2 cursor-pointer font-normal transition-all shadow-sm hover:shadow-md flex items-center"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            <font-awesome-icon icon="chevron-left" class="mr-2" />
            Terug naar {{ showDailyChallenges ? 'uitdagingen' : 'thema\'s' }}
          </button>
        </div>
      </div>
      
      <!-- Retro toggle switch at the bottom -->
      <div class="p-3 border-t-2 flex items-center justify-center"
           :class="[darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-800 bg-white']">
        <div class="flex flex-col items-center">
          <div class="flex items-center space-x-5 mb-2">
            <span class="font-mono flex flex-col items-center" 
                  :class="[showDailyChallenges ? 'opacity-60' : 'opacity-100', darkMode ? 'text-emerald-400' : 'text-emerald-600']">
              <font-awesome-icon icon="book" class="text-lg" />
              <span class="text-sm font-medium mt-1">ACT</span>
            </span>
            
            <!-- Retro toggle switch -->
            <div @click="toggleChallengeMode" 
                 class="relative inline-block w-16 h-8 border-2 rounded-full cursor-pointer transition-colors shadow-inner"
                 :class="[darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-800 bg-gray-200']">
              <!-- Track marks/etchings -->
              <div class="absolute top-[12px] left-2 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              <div class="absolute top-[12px] left-4 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              <div class="absolute top-[12px] left-6 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              <div class="absolute top-[12px] right-2 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              <div class="absolute top-[12px] right-4 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              <div class="absolute top-[12px] right-6 w-0.5 h-1 rounded bg-gray-500 opacity-30"></div>
              
              <!-- Toggle knob -->
              <div class="absolute top-0.5 left-0.5 transition-transform duration-300 w-6 h-6 border-2 rounded-full shadow-md flex items-center justify-center"
                   :class="[
                     showDailyChallenges ? 'transform translate-x-8' : '',
                     darkMode ? 
                       'border-gray-600 bg-emerald-500' : 
                       'border-gray-800 bg-emerald-600'
                   ]">
                <!-- Highlight reflection on knob -->
                <div class="absolute top-0.5 left-1 w-2 h-0.5 bg-white opacity-60 rounded-full transform -rotate-45"></div>
              </div>
            </div>
            
            <span class="font-mono flex flex-col items-center" 
                  :class="[!showDailyChallenges ? 'opacity-60' : 'opacity-100', darkMode ? 'text-emerald-400' : 'text-emerald-600']">
              <font-awesome-icon icon="tasks" class="text-lg" />
              <span class="text-sm font-medium mt-1">Uitdagingen</span>
            </span>
          </div>
          <div class="text-xs opacity-70 font-mono font-medium" :class="[darkMode ? 'text-gray-400' : 'text-gray-600']">
            Klik om te wisselen
          </div>
        </div>
      </div>
    </div>
    
    <div class="w-[600px] h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <!-- Middle panel header -->
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2 relative overflow-hidden"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <!-- Scanline effect -->
        <div class="absolute inset-0 pointer-events-none opacity-5">
          <div class="h-full w-full" :class="[darkMode ? 'bg-scanlines-dark' : 'bg-scanlines-light']"></div>
        </div>

        <div class="font-bold relative z-10" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="message" class="mr-1" /> 
          ACT therapie
        </div>
        <div class="flex relative z-10">
          <button @click="toggleDarkMode" class="w-auto h-5 px-1 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']" 
                  :title="darkMode ? 'Licht modus' : 'Donker modus'">
            <font-awesome-icon :icon="darkMode ? 'sun' : 'moon'" />
          </button>
          <button class="w-5 h-5 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="toggleSettings" title="Instellingen"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
            <font-awesome-icon icon="cog" />
          </button>
          <button class="w-5 h-5 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="toggleHelp" title="Help informatie"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
            <font-awesome-icon icon="info-circle" />
          </button>
          <button class="w-5 h-5 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="startGuidedTour" title="Rondleiding"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
            <font-awesome-icon icon="route" />
          </button>
          <button class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="resetSession" title="Reset gesprek"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
            <font-awesome-icon icon="trash" />
          </button>
        </div>
      </div>
      
      <!-- End session overlay -->
      <div v-if="showSessionEndModal" class="absolute inset-0 z-10 flex items-center justify-center p-5"
           :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
        <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono text-center"
             :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']">
          <h2 class="text-center pb-2.5 mt-0 border-b-2 flex items-center justify-center"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
            <font-awesome-icon icon="check-circle" class="mr-2" />
            Einde Sessie
          </h2>
          
          <!-- Enhanced end session summary -->
          <div class="border border-dashed p-4 my-4 text-left rounded shadow-inner"
               :class="[darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-800']">
            <div class="flex items-start mb-2">
              <font-awesome-icon icon="file-alt" class="mr-2 mt-1" />
              <div>
                <div class="font-bold mb-1">Samenvatting</div>
                <p>{{ sessionSummary }}</p>
              </div>
            </div>
          </div>
          
          <div class="flex flex-col items-center my-5">
            <div class="text-5xl mb-3">
              <span>🧘</span>
            </div>
            
            <div class="italic flex items-center">
              <font-awesome-icon icon="smile" class="mr-2" />
              <p>Bedankt voor je deelname aan deze ACT sessie. Neem even de tijd om te reflecteren.</p>
            </div>
            
            <div class="w-full max-w-xs border-t mt-3 pt-3"
                 :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
              <div class="text-sm text-center mb-2"
                   :class="[darkMode ? 'text-gray-400' : 'text-gray-600']">
                <font-awesome-icon icon="info-circle" class="mr-1" />
                Wat wil je nu doen?
              </div>
            </div>
          </div>
          
          <div class="flex justify-center gap-5 mt-5">
            <button 
              @click="startNewChat" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon icon="reply" class="mr-2" />
              Nieuwe sessie starten
            </button>
            <button 
              @click="viewSessions" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon icon="eye" class="mr-2" />
              Sessies bekijken
            </button>
          </div>
        </div>
      </div>
      
      <!-- Reset confirmation dialog -->
      <div v-if="showResetConfirm" class="absolute inset-0 z-10 flex items-center justify-center p-5"
           :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
        <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-md overflow-y-auto font-mono text-center"
             :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']">
          <h2 class="text-center pb-2.5 mt-0 border-b-2 flex items-center justify-center"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
            <font-awesome-icon icon="exclamation-triangle" class="mr-2 text-yellow-500" />
            Gesprek opnieuw beginnen?
          </h2>
          
          <div class="my-4 text-left">
            <p>Weet je zeker dat je het huidige gesprek wilt wissen en opnieuw wilt beginnen?</p>
            <p class="text-sm opacity-70 mt-2">Alle berichten in dit gesprek zullen verloren gaan.</p>
          </div>
          
          <div class="flex justify-center gap-5 mt-5">
            <button 
              @click="confirmReset" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-red-700 border-red-600 text-white hover:bg-red-600' : 'bg-red-600 border-red-700 text-white hover:bg-red-500']"
            >
              <font-awesome-icon icon="trash" class="mr-2" />
              Ja, begin opnieuw
            </button>
            <button 
              @click="cancelReset" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-800 hover:bg-gray-100']"
            >
              <font-awesome-icon icon="times" class="mr-2" />
              Annuleren
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-2.5 scrollbar-thin"
           :class="[darkMode ? 'bg-gray-800 scrollbar-thumb-emerald-700 scrollbar-track-gray-800' : 'bg-white scrollbar-thumb-emerald-600 scrollbar-track-white']">
        <div v-for="(message, index) in chatHistory" :key="index" class="mb-4 flex items-start" :class="{'flex-row-reverse': message.role === 'user', 'flex-row': message.role === 'assistant'}">
          <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0 border" 
               :class="{
                  'bg-white ml-2.5 border-gray-800': message.role === 'user' && !darkMode,
                  'bg-gray-700 ml-2.5 border-gray-600 text-white': message.role === 'user' && darkMode,
                  'bg-emerald-600 text-white mr-2.5 border-gray-800': message.role === 'assistant' && !darkMode,
                  'bg-emerald-700 text-white mr-2.5 border-gray-600': message.role === 'assistant' && darkMode
               }">
            <font-awesome-icon :icon="message.role === 'user' ? 'user' : 'robot'" />
          </div>
          <div class="p-2.5 px-4 rounded-2xl max-w-[70%] break-words relative shadow-sm cursor-pointer"
               @click="skipAnimation"
               :class="[
                 fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base',
                 message.role === 'user' && !darkMode ? 'bg-white border border-gray-800 rounded-tr-sm text-left' : 
                 message.role === 'user' && darkMode ? 'bg-gray-700 border border-gray-600 rounded-tr-sm text-left text-white' :
                 message.role === 'assistant' && !darkMode ? 'bg-emerald-600 text-white rounded-tl-sm text-left' :
                 'bg-emerald-700 text-white rounded-tl-sm text-left'
               ]">
            <!-- Show animated text for latest assistant message, or full text for all other messages -->
            <template v-if="message.role === 'assistant' && index === chatHistory.length - 1 && animatingMessage">
              <div class="message-fade-in">
                {{ displayedText }}
              </div>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
            
            <div v-if="message.role === 'assistant'" class="text-xs opacity-70 mt-1 text-right">
              <font-awesome-icon icon="clock" /> 
              {{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
            </div>
          </div>
        </div>
        
        <div v-if="isLoading" class="text-center p-2.5">
          <div class="animate-spin mx-auto h-5 w-5 text-emerald-600" :class="{ 'text-emerald-400': darkMode }">
            <font-awesome-icon icon="spinner" class="animate-spin" />
          </div>
          <div class="mt-1 italic" :class="[darkMode ? 'text-white' : '']">Even denken...</div>
        </div>
      </div>
      
      <!-- User input section with enhanced style -->
      <div class="flex p-2.5 border-t"
           :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
        <div class="relative flex-1">
          <input 
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Deel je gedachten..."
            class="flex-1 p-1 pl-8 w-full border-2 font-mono"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-800']"
          />
          <div class="absolute left-2 top-1/2 transform -translate-y-1/2">
            <font-awesome-icon icon="message" :class="[darkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
        </div>
        <button 
          @click="sendMessage"
          :disabled="isLoading"
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 border-2 cursor-pointer font-mono font-normal transition-all disabled:opacity-50 flex items-center shadow-sm hover:shadow-md"
          :class="[
            darkMode ? 
              'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 
              'bg-white border-gray-800 hover:bg-gray-800 hover:text-white'
          ]"
        >
          <font-awesome-icon icon="paper-plane" class="mr-1" />
          {{ chatHistory.length > 0 ? 'Versturen' : 'Start gesprek' }}
        </button>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="w-72 h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold flex items-center" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="tag" class="mr-1" />
          Kernbegrippen
        </div>
        <!-- Logout button in the top right of the right panel -->
        <button @click="handleLogout" 
                class="px-2 py-1 text-xs border-2 font-mono transition-all"
                :class="[darkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-white hover:text-black' : 'border-black bg-white hover:bg-black hover:text-white']">
          Uitloggen
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 scrollbar-thin"
           :class="[darkMode ? 'bg-gray-800 scrollbar-thumb-gray-600 scrollbar-track-gray-800' : 'bg-white scrollbar-thumb-gray-800 scrollbar-track-white']">
        <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" 
             class="mb-2.5 pb-2.5 last:border-b-0"
             :class="[darkMode ? 'border-b border-gray-600' : 'border-b border-gray-800']">
          <div class="flex flex-wrap">
            <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                 class="inline-flex items-center px-2 py-1 m-1 rounded-full text-sm cursor-pointer transition-all"
                 :class="[darkMode ? 'bg-gray-700 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-800 hover:bg-emerald-600 hover:text-white']"
                 @click="exploreKeyword(word)">
              <font-awesome-icon :icon="getKeywordIcon(word)" class="mr-1" />
              {{ word }}
            </div>
          </div>
        </div>
        
        <div v-if="isEssenceLoading" class="essence-loading">
          <div class="flex items-center justify-center mt-2.5">
            <div class="animate-spin mx-auto h-5 w-5 text-emerald-600" :class="{ 'text-emerald-400': darkMode }">
              <font-awesome-icon icon="spinner" class="animate-spin" />
            </div>
            <span class="text-xs ml-2" :class="[darkMode ? 'text-white' : '']">Kernbegrippen laden...</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Help panel overlay -->
    <div v-if="showHelpPanel" class="absolute inset-0 z-10 flex items-center justify-center p-5"
         :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
      <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono help-panel-container"
           :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']">
        <div class="flex justify-between items-center border-b-2 pb-2 mb-4"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <h2 class="text-xl flex items-center m-0">
            <font-awesome-icon icon="info-circle" class="mr-2" />
            ACT Therapie Help
          </h2>
          <!-- Close help button with ESC hint -->
          <div class="flex items-center">
            <span class="text-xs mr-2 opacity-70">ESC</span>
            <button @click="closeHelp" class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110"
                    :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
              <font-awesome-icon icon="times" />
            </button>
          </div>
        </div>
        
        <div class="space-y-4">
          <section>
            <h3 class="text-lg font-bold flex items-center">
              <font-awesome-icon icon="comment" class="mr-2 text-emerald-600" />
              Over ACT Therapie
            </h3>
            <p class="mt-2">
              Acceptance and Commitment Therapy (ACT) is een vorm van psychotherapie die je helpt om bewuster 
              en flexibeler om te gaan met moeilijke gedachten en gevoelens, zodat je meer kunt leven volgens 
              jouw persoonlijke waarden.
            </p>
          </section>
          
          <section>
            <h3 class="text-lg font-bold flex items-center">
              <font-awesome-icon icon="list" class="mr-2 text-emerald-600" />
              Beschikbare thema's
            </h3>
            <ul class="list-disc ml-5 mt-2">
              <li><strong>Waarden:</strong> Ontdek wat écht belangrijk voor je is</li>
              <li><strong>Defusie:</strong> Leer afstand nemen van belemmerende gedachten</li>
              <li><strong>Mindfulness:</strong> Oefen met aandacht in het hier en nu</li>
              <li><strong>Acceptatie:</strong> Maak ruimte voor moeilijke gevoelens</li>
              <li><strong>Zelf:</strong> Ontwikkel een flexibeler zelfbeeld</li>
              <li><strong>Toewijding:</strong> Onderneem acties die bij je waarden passen</li>
              <li><strong>Compassie:</strong> Ontwikkel meer zelfcompassie</li>
            </ul>
          </section>
          
          <section>
            <h3 class="text-lg font-bold flex items-center">
              <font-awesome-icon icon="lightbulb" class="mr-2 text-emerald-600" />
              Tips voor gebruik
            </h3>
            <ul class="list-disc ml-5 mt-2">
              <li>Kies een thema dat momenteel relevant voor je is</li>
              <li>Neem de tijd om de oefeningen rustig door te werken</li>
              <li>Probeer oefeningen ook in je dagelijks leven toe te passen</li>
              <li>De kernbegrippen rechts kun je aanklikken voor meer verdieping</li>
              <li>Sla belangrijke inzichten op om later te raadplegen</li>
            </ul>
          </section>
        </div>
        
        <div class="mt-6 pt-4 border-t text-center"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <button 
            @click="closeHelp" 
            class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center mx-auto"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            <font-awesome-icon icon="arrow-left" class="mr-2" />
            Terug naar gesprek
          </button>
        </div>
      </div>
    </div>
    
    <!-- Settings panel overlay -->
    <div v-if="showSettingsPanel" class="absolute inset-0 z-10 flex items-center justify-center p-5"
         :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
      <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono settings-panel-container"
           :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']">
        <div class="flex justify-between items-center border-b-2 pb-2 mb-4 relative"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <!-- Retro decorative scanlines -->
          <div class="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
            <div class="h-full w-full" :class="[darkMode ? 'bg-scanlines-dark' : 'bg-scanlines-light']"></div>
          </div>
          
          <h2 class="text-xl flex items-center m-0 relative z-10">
            <font-awesome-icon icon="cog" class="mr-2 animate-slow-spin" />
            Instellingen
          </h2>
          <!-- Close settings button with ESC hint -->
          <div class="flex items-center relative z-10">
            <span class="text-xs mr-2 opacity-70">ESC</span>
            <button @click="toggleSettings" class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110"
                    :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">
              <font-awesome-icon icon="times" />
            </button>
          </div>
        </div>
        
        <div class="space-y-4">
          <section class="p-3 border border-dashed rounded relative"
                  :class="[darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-800 bg-gray-100/50']">
            <h3 class="text-lg font-bold flex items-center mb-2">
              <font-awesome-icon icon="text-height" class="mr-2 text-emerald-600" />
              Tekstgrootte
            </h3>
            
            <div class="flex flex-col gap-2">
              <div class="flex items-center mb-2">
                <div class="w-14 text-center">
                  <span class="text-xs">Klein</span>
                </div>
                <button
                  @click="changeFontSize('small')"
                  class="px-3 py-2 mx-1 border-2 text-sm font-small transition-all flex items-center"
                  :class="[
                    fontSize === 'small' ? 
                      (darkMode ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-emerald-600 text-white border-emerald-800') : 
                      (darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-800 hover:bg-gray-100'),
                  ]"
                >
                  <span class="block text-center">Aa</span>
                  <font-awesome-icon v-if="fontSize === 'small'" icon="check" class="ml-1.5 text-xs" />
                </button>
                
                <button
                  @click="changeFontSize('medium')"
                  class="px-3 py-2 mx-1 border-2 text-base transition-all flex items-center"
                  :class="[
                    fontSize === 'medium' ? 
                      (darkMode ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-emerald-600 text-white border-emerald-800') : 
                      (darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-800 hover:bg-gray-100'),
                  ]"
                >
                  <span class="block text-center">Aa</span>
                  <font-awesome-icon v-if="fontSize === 'medium'" icon="check" class="ml-1.5 text-xs" />
                </button>
                
                <button
                  @click="changeFontSize('large')"
                  class="px-3 py-2 mx-1 border-2 text-lg font-medium transition-all flex items-center"
                  :class="[
                    fontSize === 'large' ? 
                      (darkMode ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-emerald-600 text-white border-emerald-800') : 
                      (darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-800 hover:bg-gray-100'),
                  ]"
                >
                  <span class="block text-center">Aa</span>
                  <font-awesome-icon v-if="fontSize === 'large'" icon="check" class="ml-1.5 text-xs" />
                </button>
                <div class="w-14 text-center">
                  <span class="text-xs">Groot</span>
                </div>
              </div>
              
              <!-- Preview area -->
              <div class="mt-3 p-3 rounded-lg border-2 relative"
                  :class="[darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-800 bg-white']">
                <div class="absolute top-0 left-3 px-2 -translate-y-1/2 text-xs font-mono"
                     :class="[darkMode ? 'bg-gray-800 text-emerald-400' : 'bg-white text-emerald-600']">
                  <font-awesome-icon icon="eye" class="mr-1" /> Voorbeeld
                </div>
                <p :class="[
                    fontSize === 'small' ? 'text-sm' : 
                    fontSize === 'medium' ? 'text-base' : 
                    'text-lg'
                  ]"
                >
                  ACT therapie helpt je om bewust en flexibel om te gaan met moeilijke gedachten en gevoelens, zodat je meer kunt leven volgens jouw persoonlijke waarden.
                </p>
              </div>
            </div>
          </section>
        </div>
        
        <div class="mt-6 pt-4 border-t text-center"
             :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
          <button 
            @click="toggleSettings" 
            class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center mx-auto"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            <font-awesome-icon icon="check" class="mr-2" />
            Instellingen opslaan
          </button>
        </div>
      </div>
    </div>
    
    <!-- Right sidebar -->
    <div class="w-64 border-l hidden md:flex flex-col h-full"
         :class="[darkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-800']">
      <!-- User menu -->
      <div class="p-4 flex flex-col gap-2 justify-between border-b" 
           :class="[darkMode ? 'border-gray-700' : 'border-gray-200']">
        <div class="flex justify-between items-center">
          <h2 class="text-sm font-semibold">Mijn Account</h2>
          <button 
            @click="handleLogout" 
            class="text-xs px-3 py-1.5 rounded-full transition-colors"
            :class="[
              darkMode ? 
                'bg-gray-800 hover:bg-red-800 text-gray-300' : 
                'bg-gray-100 hover:bg-red-100 text-gray-700'
            ]"
          >
            <font-awesome-icon icon="sign-out-alt" class="mr-1" />
            Uitloggen
          </button>
        </div>
        
        <div class="flex items-center mt-2">
          <button 
            @click="toggleSettings" 
            class="text-xs px-3 py-1.5 rounded-full mr-2 transition-colors flex-1 flex items-center justify-center"
            :class="[
              darkMode ? 
                'bg-gray-800 hover:bg-gray-700 text-gray-300' : 
                'bg-gray-100 hover:bg-gray-200 text-gray-700'
            ]"
          >
            <font-awesome-icon icon="cog" class="mr-1" />
            Instellingen
          </button>
          <button 
            @click="toggleHelp" 
            class="text-xs px-3 py-1.5 rounded-full transition-colors flex-1 flex items-center justify-center"
            :class="[
              darkMode ? 
                'bg-gray-800 hover:bg-gray-700 text-gray-300' : 
                'bg-gray-100 hover:bg-gray-200 text-gray-700'
            ]"
          >
            <font-awesome-icon icon="question-circle" class="mr-1" />
            Help
          </button>
        </div>
      </div>
      
      <!-- Session management -->
      <div class="p-4 border-b" :class="[darkMode ? 'border-gray-700' : 'border-gray-200']">
        <h2 class="text-sm font-semibold mb-3">Sessie Beheer</h2>
        
        <div class="flex flex-col gap-2">
          <button
            @click="viewSessions"
            class="w-full p-2 rounded-lg text-xs font-medium flex items-center transition-colors"
            :class="[
              darkMode 
                ? 'hover:bg-gray-800 text-white' 
                : 'hover:bg-gray-100 text-gray-800'
            ]"
          >
            <font-awesome-icon icon="book" class="mr-2 w-4" />
            Mijn Sessies
          </button>
          
          <button
            @click="startNewChat"
            class="w-full p-2 rounded-lg text-xs font-medium flex items-center transition-colors"
            :class="[
              darkMode 
                ? 'hover:bg-gray-800 text-white' 
                : 'hover:bg-gray-100 text-gray-800'
            ]"
          >
            <font-awesome-icon icon="plus" class="mr-2 w-4" />
            Nieuwe Sessie
          </button>
          
          <button
            @click="endSession"
            class="w-full p-2 rounded-lg text-xs font-medium flex items-center transition-colors"
            :class="[
              darkMode 
                ? 'hover:bg-gray-800 text-white' 
                : 'hover:bg-gray-100 text-gray-800'
            ]"
            :disabled="isGeneratingSummary"
          >
            <font-awesome-icon :icon="isGeneratingSummary ? 'circle-notch' : 'check-circle'" 
              class="mr-2 w-4" :class="{ 'fa-spin': isGeneratingSummary }" />
            Sessie Afronden
          </button>
        </div>
        
        <div v-if="currentSession" class="mt-4 text-xs p-2 rounded"
             :class="[darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700']">
          <div class="font-medium mb-1">Huidige Sessie:</div>
          <div class="truncate">{{ currentSession.title }}</div>
          <div class="mt-1 flex items-center">
            <font-awesome-icon icon="clock" class="mr-1 opacity-70" />
            <span>{{ calculateSessionDuration() }} min</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes blink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}

@keyframes fadeBreath {
  0% { opacity: 0; filter: blur(2px); }
  30% { opacity: 0.7; filter: blur(1px); }
  70% { opacity: 0.9; filter: blur(0.5px); }
  100% { opacity: 1; filter: blur(0); }
}

/* This gives a subtle pulse after the message appears */
@keyframes subtlePulse {
  0% { opacity: 1; }
  50% { opacity: 0.95; }
  100% { opacity: 1; }
}

.message-fade-in {
  animation: fadeBreath 1.2s ease-in-out forwards, subtlePulse 2s ease-in-out 1.2s infinite;
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

/* Scrollbar styling for browsers that support it */
.scrollbar-thin::-webkit-scrollbar {
  width: 10px;
}

.scrollbar-track-white::-webkit-scrollbar-track {
  background: white;
  border-left: 1px solid #333;
}

.scrollbar-thumb-emerald-600::-webkit-scrollbar-thumb {
  background-color: #1f2937;
  border: 1px solid white;
}

/* Hide the fallback loading elements that use older CSS */
.message-content,
.user-message,
.assistant-message {
  display: none;
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

/* Animation for slow spinning cog */
@keyframes slow-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-slow-spin {
  animation: slow-spin 6s linear infinite;
}
</style> 