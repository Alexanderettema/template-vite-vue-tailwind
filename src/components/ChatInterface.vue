<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch, inject } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
- VERMIJD het eindigen met "laat me weten of je vragen hebt" of gelijksoortige expliciete uitnodigingen.`

const userMessage = ref('')
const chatHistory = ref<{ role: 'user' | 'assistant', content: string, essence?: string }[]>([])
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

onMounted(() => {
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
  
  // Add event listeners for help panel
  window.addEventListener('keydown', handleHelpKeyDown)
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  if (chatObserver) {
    chatObserver.disconnect()
  }
  
  // Remove event listeners
  window.removeEventListener('keydown', handleHelpKeyDown)
  window.removeEventListener('mousedown', handleClickOutside)
})

async function sendMessage() {
  if (!userMessage.value.trim()) return
  
  const message = userMessage.value
  chatHistory.value.push({ role: 'user', content: message })
  userMessage.value = ''
  isLoading.value = true
  
  scrollToBottom()

  try {
    const fullPrompt = `${systemInstructions}\n\nUser: ${message}`
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    const messageIndex = chatHistory.value.length
    chatHistory.value.push({ role: 'assistant', content: text })
    
    getEssence(text, messageIndex)
    
    scrollToBottom()
  } catch (error) {
    console.error('Error:', error)
    chatHistory.value.push({ role: 'assistant', content: 'Sorry, er was een fout bij het verwerken van je verzoek.' })
    
    scrollToBottom()
  } finally {
    isLoading.value = false
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
    const essencePanel = document.querySelector('.w-60 .flex-1.overflow-y-auto')
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

function resetSession() {
  chatHistory.value = []
  selectedMainTopic.value = ''
  showEndSession.value = false
  sessionSummary.value = ''
}

// Add separate show states for help panel
const showHelpPanel = ref(false)

// Update function to handle showing the help panel
function showHelp() {
  showHelpPanel.value = true
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

async function endSession() {
  if (chatHistory.value.length < 2) {
    showEndSession.value = true
    return
  }
  
  isLoading.value = true
  try {
    // Alle berichten extraheren voor samenvatting
    const conversation = chatHistory.value.map(msg => 
      `${msg.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${msg.content}`
    ).join('\n\n');
    
    const summaryPrompt = `Hier is een ACT therapie gesprek. Maak een zeer korte samenvatting (max 50 woorden) 
    met de belangrijkste inzichten en voeg een korte reflectievraag toe die de gebruiker thuis kan overdenken.
    
    Gesprek:
    ${conversation}
    
    Format: Geef alleen de samenvatting en reflectievraag. Geen extra tekst of uitleg.`
    
    const result = await model.generateContent(summaryPrompt)
    const response = await result.response
    sessionSummary.value = response.text().trim()
  } catch (error) {
    console.error('Error generating summary:', error)
    sessionSummary.value = 'Dank voor je tijd. Neem even rust om te reflecteren op wat je hebt geleerd en hoe je dit kunt toepassen in je dagelijks leven.'
  } finally {
    isLoading.value = false
    showEndSession.value = true
  }
}

function continueSession() {
  showEndSession.value = false
}

// Add function to go to home
function goToHome() {
  emit('go-to-home')
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
</script>

<template>
  <div class="flex min-h-screen max-h-screen p-5 justify-center items-start gap-5" 
       :class="[darkMode ? 'bg-gray-900' : 'bg-gray-100']">
    <!-- Themes panel (new left sidebar) -->
    <div class="w-60 h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden order-first"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold flex items-center" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="list" class="mr-1" />
          {{ !selectedMainTopic ? (showDailyChallenges ? 'Dagelijkse Uitdagingen' : 'ACT Thema\'s') : 'Specifieke Oefeningen' }}
        </div>
        <!-- Add toggle button for switching between themes and challenges -->
        <button @click="toggleChallengeMode" class="text-xs p-1 border rounded transition-all"
                :class="[darkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-gray-300 hover:bg-gray-50']"
                :title="showDailyChallenges ? 'Toon ACT thema\'s' : 'Toon dagelijkse uitdagingen'">
          <font-awesome-icon :icon="showDailyChallenges ? 'book' : 'tasks'" class="mr-1" />
          {{ showDailyChallenges ? 'ACT' : 'Uitdagingen' }}
        </button>
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
              <font-awesome-icon icon="star" class="mr-2" />
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
              <font-awesome-icon icon="tasks" class="mr-2" />
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
    </div>
    
    <div class="w-[600px] h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="message" class="mr-1" /> ACT therapie
        </div>
        <div class="flex">
          <button @click="toggleDarkMode" class="w-auto h-5 px-1 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']" 
                  :title="darkMode ? 'Licht modus' : 'Donker modus'">
            <font-awesome-icon :icon="darkMode ? 'sun' : 'moon'" />
          </button>
          <button class="w-5 h-5 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="showHelp" title="Help informatie"
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
      <div v-if="showEndSession" class="absolute inset-0 z-10 flex items-center justify-center p-5"
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
              @click="continueSession" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon icon="reply" class="mr-2" />
              Doorgaan met sessie
            </button>
            <button 
              @click="resetSession" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              <font-awesome-icon icon="redo" class="mr-2" />
              Nieuwe sessie starten
            </button>
            <button 
              @click="goToHome" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center"
              :class="[darkMode ? 'bg-gray-600 border-gray-600 text-white hover:bg-gray-500' : 'bg-gray-100 border-gray-800 hover:bg-gray-800 hover:text-white']"
            >
              <font-awesome-icon icon="home" class="mr-2" />
              Naar startpagina
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
          <div class="p-2.5 px-4 rounded-2xl max-w-[70%] break-words relative shadow-sm" 
               :class="{
                 'bg-white border border-gray-800 rounded-tr-sm text-left': message.role === 'user' && !darkMode, 
                 'bg-gray-700 border border-gray-600 rounded-tr-sm text-left text-white': message.role === 'user' && darkMode,
                 'bg-emerald-600 text-white rounded-tl-sm text-left': message.role === 'assistant' && !darkMode,
                 'bg-emerald-700 text-white rounded-tl-sm text-left': message.role === 'assistant' && darkMode
               }">
            {{ message.content }}
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
        <button
          @click="endSession"
          :disabled="isLoading" 
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 border-2 cursor-pointer font-mono font-normal transition-all disabled:opacity-50 flex items-center shadow-sm hover:shadow-md"
          :class="[
            darkMode ? 
              'bg-gray-600 border-gray-600 text-white hover:bg-gray-500' : 
              'bg-gray-100 border-gray-800 hover:bg-gray-800 hover:text-white'
          ]"
          title="Beëindig deze sessie"
        >
          <font-awesome-icon icon="check-circle" class="mr-1" />
          Afronden
        </button>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="w-60 h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold flex items-center" :class="[darkMode ? 'text-white' : '']">
          <font-awesome-icon icon="tag" class="mr-1" />
          Kernbegrippen
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 scrollbar-thin"
           :class="[darkMode ? 'bg-gray-800 scrollbar-thumb-gray-600 scrollbar-track-gray-800' : 'bg-white scrollbar-thumb-gray-800 scrollbar-track-white']">
        <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" 
             class="mb-2.5 pb-2.5 last:border-b-0"
             :class="[darkMode ? 'border-b border-gray-600' : 'border-b border-gray-800']">
          <div class="flex flex-wrap">
            <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                 @click="useEssenceWord(word)"
                 class="inline-block mr-2.5 mb-2.5 p-1 px-2.5 border-2 cursor-pointer font-mono font-normal transition-all hover:shadow-md flex items-center"
                 :class="[
                   darkMode ? 
                     'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]' : 
                     'bg-white border-gray-800 hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                 ]"
            >
              <font-awesome-icon icon="tag" class="mr-1" />
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
</style> 