<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Define emits
const emit = defineEmits(['go-to-home'])

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
const showOnboarding = ref(true)
const showEndSession = ref(false)
const sessionSummary = ref('')
const showScrollIndicator = ref(true)
const darkMode = ref(false)
const onboardingStep = ref(0)
const showOverlay = ref(false)

const mainTopics = {
  "Waarden": "Waarden verkenning",
  "Defusie": "Defusie techniek",
  "Mindfulness": "Het huidige moment",
  "Acceptatie": "Acceptatie oefening",
  "Zelf": "Observerend zelf",
  "Toewijding": "Toegewijde actie",
  "Compassie": "Zelfcompassie"
}

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

// Add a MutationObserver to automatically scroll when new messages are added
let chatObserver: MutationObserver | null = null

// Add a watch on chatHistory to ensure we scroll when messages change
watch(() => chatHistory.value.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

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
})

onUnmounted(() => {
  if (chatObserver) {
    chatObserver.disconnect()
  }
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

function splitEssence(essence: string): string[] {
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

function startOnboarding() {
  // Reset onboarding state
  onboardingStep.value = 0
  showOverlay.value = false
  // Show the initial onboarding screen
  showOnboarding.value = true
}

function dismissOnboarding() {
  showOnboarding.value = false
  // Show the UI overlay immediately after closing the initial onboarding
  nextTick(() => {
    showOverlay.value = true
    onboardingStep.value = 0
  })
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
function checkOnboardingScroll() {
  const onboardingContent = document.querySelector('.onboarding-content')
  if (onboardingContent) {
    // If we're near the bottom, hide the scroll indicator
    const isAtBottom = onboardingContent.scrollHeight - onboardingContent.scrollTop - onboardingContent.clientHeight < 50
    showScrollIndicator.value = !isAtBottom
  }
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

// Toggle dark mode
function toggleDarkMode() {
  darkMode.value = !darkMode.value
  // Store preference in localStorage
  localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
}

// Add function to go to home
function goToHome() {
  emit('go-to-home')
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
        <div class="font-bold" :class="[darkMode ? 'text-white' : '']">
          {{ !selectedMainTopic ? 'ACT Thema\'s' : 'Specifieke Oefeningen' }}
        </div>
        <div class="flex">
          <button class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110"
                  :class="[darkMode ? 'border-gray-600 hover:bg-emerald-700 hover:text-white' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">_</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 scrollbar-thin scrollbar-track-white"
           :class="[darkMode ? 'bg-gray-800 scrollbar-thumb-emerald-700 scrollbar-track-gray-800' : 'bg-white scrollbar-thumb-emerald-600']">
        <!-- Main topics -->
        <div v-if="!selectedMainTopic" class="flex flex-col gap-2.5">
          <div class="font-bold border p-1 mb-2.5 text-center"
               :class="[darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-800 bg-white']">Kies een ACT thema:</div>
          <button 
            v-for="(description, topic) in mainTopics" 
            :key="topic"
            @click="selectMainTopic(topic)"
            :disabled="isLoading"
            class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            {{ topic }}
          </button>
        </div>
        
        <!-- Subtopics after main topic selection -->
        <div v-else class="flex flex-col gap-2.5">
          <div class="font-bold border p-1 mb-2.5 text-center"
               :class="[darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-800 bg-white']">Kies een oefening:</div>
          <button 
            v-for="(subtopic, index) in subTopics[selectedMainTopic as keyof typeof subTopics]" 
            :key="index"
            @click="sendSubTopic(subtopic)"
            :disabled="isLoading"
            class="w-full text-left p-2 mb-1 border-2 cursor-pointer font-normal transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            {{ subtopic }}
          </button>
          
          <button 
            @click="selectedMainTopic = ''" 
            class="w-full mt-4 text-left p-2 border-2 cursor-pointer font-normal transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
            :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
          >
            ← Terug naar thema's
          </button>
        </div>
      </div>
    </div>
    
    <div class="w-[600px] h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold" :class="[darkMode ? 'text-white' : '']">ACT therapie</div>
        <div class="flex">
          <button @click="toggleDarkMode" class="w-auto h-5 px-1 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']" 
                  :title="darkMode ? 'Licht modus' : 'Donker modus'">
            {{ darkMode ? '☀️' : '🌙' }}
          </button>
          <button class="w-5 h-5 leading-none text-center border mr-1 font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="startOnboarding" title="Help"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">?</button>
          <button class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110" 
                  @click="resetSession" title="Reset gesprek"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">×</button>
        </div>
      </div>
      
      <!-- End session overlay -->
      <div v-if="showEndSession" class="absolute inset-0 z-10 flex items-center justify-center p-5"
           :class="[darkMode ? 'bg-gray-900/95' : 'bg-white/95']">
        <div class="border-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono text-center"
             :class="[darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-800']">
          <h2 class="text-center pb-2.5 mt-0 border-b-2"
              :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">Einde Sessie</h2>
          
          <div class="border border-dashed p-4 my-4 text-left rounded"
               :class="[darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-800']">
            <p>{{ sessionSummary }}</p>
          </div>
          
          <div class="text-5xl my-5">
            <span>🧘</span>
          </div>
          
          <div class="mb-5 italic">
            <p>Bedankt voor je deelname aan deze ACT sessie. Neem even de tijd om te reflecteren.</p>
          </div>
          
          <div class="flex justify-center gap-5 mt-5">
            <button 
              @click="continueSession" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              Doorgaan met sessie
            </button>
            <button 
              @click="resetSession" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
              :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-emerald-700' : 'bg-white border-gray-800 hover:bg-emerald-600 hover:text-white']"
            >
              Nieuwe sessie starten
            </button>
            <button 
              @click="goToHome" 
              class="p-2 px-4 border-2 cursor-pointer transition-all shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
              :class="[darkMode ? 'bg-gray-600 border-gray-600 text-white hover:bg-gray-500' : 'bg-gray-100 border-gray-800 hover:bg-gray-800 hover:text-white']"
            >
              Naar startpagina
            </button>
          </div>
        </div>
      </div>
      
      <!-- Onboarding overlay - moved outside the chat container to cover entire screen -->
      <div v-if="showOnboarding" class="fixed inset-0 z-30 flex items-center justify-center p-5"
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
      
      <!-- UI Overlay for guided onboarding - positioned over the entire screen -->
      <div v-if="showOverlay" class="fixed inset-0 z-40 pointer-events-none">
        <!-- Dims the entire screen except for highlighted areas -->
        <div class="absolute inset-0 bg-black/70"></div>
        
        <!-- Step 1: Highlight themes panel -->
        <div v-if="onboardingStep === 0" 
             class="absolute left-[15%] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl"
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
                  class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">
              Volgende
            </button>
          </div>
        </div>
        
        <!-- Step 2: Highlight chat area -->
        <div v-if="onboardingStep === 1" 
             class="absolute left-1/2 top-[30%] -translate-x-1/2 w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl"
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
                  class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">
              Volgende
            </button>
          </div>
        </div>
        
        <!-- Step 3: Highlight keywords panel -->
        <div v-if="onboardingStep === 2" 
             class="absolute right-[15%] top-[30%] w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl"
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
                  class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">
              Volgende
            </button>
          </div>
        </div>
        
        <!-- Step 4: Highlight input area -->
        <div v-if="onboardingStep === 3" 
             class="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-72 p-4 rounded-lg border-2 pointer-events-auto shadow-xl"
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
                  class="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">
              Beginnen
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
            {{ message.role === 'user' ? 'J' : 'A' }}
          </div>
          <div class="p-2.5 px-4 rounded-2xl max-w-[70%] break-words relative" 
               :class="{
                 'bg-white border border-gray-800 rounded-tr-sm text-left': message.role === 'user' && !darkMode, 
                 'bg-gray-700 border border-gray-600 rounded-tr-sm text-left text-white': message.role === 'user' && darkMode,
                 'bg-emerald-600 text-white rounded-tl-sm text-left': message.role === 'assistant' && !darkMode,
                 'bg-emerald-700 text-white rounded-tl-sm text-left': message.role === 'assistant' && darkMode
               }">
            {{ message.content }}
          </div>
        </div>
        
        <div v-if="isLoading" class="text-center p-2.5 italic" :class="[darkMode ? 'text-white' : '']">Laden...</div>
      </div>
      
      <div class="flex p-2.5 border-t"
           :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
        <input 
          v-model="userMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Deel je gedachten..."
          class="flex-1 p-1 border-2 font-mono"
          :class="[darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-800']"
        />
        <button 
          @click="sendMessage"
          :disabled="isLoading"
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 border-2 cursor-pointer font-mono font-normal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
          :class="[
            darkMode ? 
              'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)]' : 
              'bg-white border-gray-800 hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]'
          ]"
        >
          {{ chatHistory.length > 0 ? 'Versturen' : 'Start gesprek' }}
        </button>
        <button
          @click="endSession"
          :disabled="isLoading" 
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 border-2 cursor-pointer font-mono font-normal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
          :class="[
            darkMode ? 
              'bg-gray-600 border-gray-600 text-white hover:bg-gray-500 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)]' : 
              'bg-gray-100 border-gray-800 hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]'
          ]"
          title="Beëindig deze sessie"
        >
          Afronden
        </button>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="w-60 h-[calc(100vh-40px)] border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
         :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
      <div class="flex justify-between items-center border-b-2 border-gray-800 p-2"
           :class="[darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white']">
        <div class="font-bold" :class="[darkMode ? 'text-white' : '']">Kernbegrippen</div>
        <div class="flex">
          <button class="w-5 h-5 leading-none text-center border font-bold cursor-pointer transition-all hover:scale-110"
                  :class="[darkMode ? 'border-gray-600 text-white hover:bg-emerald-700' : 'border-gray-800 hover:bg-emerald-600 hover:text-white']">_</button>
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
                 class="inline-block mr-2.5 mb-2.5 p-1 px-2.5 border-2 cursor-pointer font-mono font-normal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                 :class="[
                   darkMode ? 
                     'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)]' : 
                     'bg-white border-gray-800 hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                 ]"
            >
              {{ word }}
            </div>
          </div>
        </div>
        
        <div v-if="isEssenceLoading" class="essence-loading">
          <div class="w-full h-5 border relative overflow-hidden mt-2.5"
               :class="[darkMode ? 'border-gray-600' : 'border-gray-800']">
            <span class="block h-full w-1/2 bg-gradient-to-r via-white animate-progress"
                  :class="[darkMode ? 'from-emerald-700 to-emerald-700 via-gray-700' : 'from-emerald-600 to-emerald-600']"></span>
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