<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyAnGkMmVSqjXtA-glr372uaO_JZFobkSo0'
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

const mainTopics = {
  "Waarden": "Waarden verkenning",
  "Defusie": "Defusie techniek",
  "Mindfulness": "Het huidige moment"
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
  showOnboarding.value = true
}

function dismissOnboarding() {
  showOnboarding.value = false
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
</script>

<template>
  <div class="flex min-h-screen max-h-screen p-5 justify-center items-start gap-5 bg-gray-100">
    <!-- Themes panel (new left sidebar) -->
    <div class="w-60 h-[calc(100vh-40px)] bg-white border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden order-first">
      <div class="flex justify-between items-center bg-white border-b-2 border-gray-800 p-2">
        <div class="font-bold">{{ !selectedMainTopic ? 'ACT Thema\'s' : 'Specifieke Oefeningen' }}</div>
        <div class="flex">
          <button class="w-5 h-5 leading-none text-center border border-gray-800 font-bold cursor-pointer transition-all hover:bg-emerald-600 hover:text-white hover:scale-110">_</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 bg-white scrollbar-thin scrollbar-thumb-emerald-600 scrollbar-track-white">
        <!-- Main topics -->
        <div v-if="!selectedMainTopic" class="flex flex-col gap-2.5">
          <div class="font-bold border border-gray-800 p-1 mb-2.5 text-center bg-white">Kies een ACT thema:</div>
          <button 
            v-for="(description, topic) in mainTopics" 
            :key="topic"
            @click="selectMainTopic(topic)"
            :disabled="isLoading"
            class="w-full text-left p-2 mb-1 bg-white border-2 border-gray-800 cursor-pointer font-normal transition-all shadow-sm hover:bg-emerald-600 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            {{ topic }}
          </button>
        </div>
        
        <!-- Subtopics after main topic selection -->
        <div v-else class="flex flex-col gap-2.5">
          <div class="font-bold border border-gray-800 p-1 mb-2.5 text-center bg-white">Kies een oefening:</div>
          <button 
            v-for="(subtopic, index) in subTopics[selectedMainTopic as keyof typeof subTopics]" 
            :key="index"
            @click="sendSubTopic(subtopic)"
            :disabled="isLoading"
            class="w-full text-left p-2 mb-1 bg-white border-2 border-gray-800 cursor-pointer font-normal transition-all shadow-sm hover:bg-emerald-600 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            {{ subtopic }}
          </button>
          
          <button 
            @click="selectedMainTopic = ''" 
            class="w-full mt-4 text-left p-2 bg-white border-2 border-gray-800 cursor-pointer font-normal transition-all shadow-sm hover:bg-emerald-600 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
          >
            ← Terug naar thema's
          </button>
        </div>
      </div>
    </div>
    
    <div class="w-[600px] h-[calc(100vh-40px)] bg-white border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative">
      <div class="flex justify-between items-center bg-white border-b-2 border-gray-800 p-2">
        <div class="font-bold">ACT therapie</div>
        <div class="flex">
          <button class="w-5 h-5 leading-none text-center border border-gray-800 mr-1 font-bold cursor-pointer transition-all hover:bg-emerald-600 hover:text-white hover:scale-110" @click="startOnboarding" title="Help">?</button>
          <button class="w-5 h-5 leading-none text-center border border-gray-800 font-bold cursor-pointer transition-all hover:bg-emerald-600 hover:text-white hover:scale-110" @click="resetSession" title="Reset gesprek">×</button>
        </div>
      </div>
      
      <!-- End session overlay -->
      <div v-if="showEndSession" class="absolute inset-0 bg-white/95 z-10 flex items-center justify-center p-5">
        <div class="bg-white border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono text-center">
          <h2 class="text-center border-b-2 border-gray-800 pb-2.5 mt-0">Einde Sessie</h2>
          
          <div class="bg-gray-100 border border-dashed border-gray-800 p-4 my-4 text-left rounded">
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
              class="p-2 px-4 bg-white border-2 border-gray-800 cursor-pointer transition-all shadow-sm hover:bg-emerald-600 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
            >
              Doorgaan met sessie
            </button>
            <button 
              @click="resetSession" 
              class="p-2 px-4 bg-white border-2 border-gray-800 cursor-pointer transition-all shadow-sm hover:bg-emerald-600 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
            >
              Nieuwe sessie starten
            </button>
          </div>
        </div>
      </div>
      
      <!-- Onboarding overlay -->
      <div v-if="showOnboarding" class="absolute inset-0 bg-white/95 z-10 flex items-center justify-center p-5">
        <div class="bg-white border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] p-5 max-w-[90%] max-h-[90%] overflow-y-auto font-mono onboarding-content relative" @scroll="checkOnboardingScroll">
          <h2 class="text-center border-b-2 border-gray-800 pb-2.5 mt-0">Welkom bij de ACT Therapie App</h2>
          
          <div class="mb-4 p-2.5 border border-dashed border-gray-800">
            <h3 class="mt-0 border-b border-gray-800 inline-block">1. Wat is ACT?</h3>
            <p>Acceptance and Commitment Therapy (ACT) helpt je om lastige gedachten en gevoelens te accepteren terwijl je stappen zet richting een waardevol leven.</p>
          </div>
          
          <div class="mb-4 p-2.5 border border-dashed border-gray-800">
            <h3 class="mt-0 border-b border-gray-800 inline-block">2. Hoe gebruik je deze app?</h3>
            <ul class="pl-5">
              <li class="mb-2"><strong>Kies een onderwerp</strong> - Begin met een van de hoofdthema's: Waarden, Defusie of Mindfulness</li>
              <li class="mb-2"><strong>Verken subthema's</strong> - Verdiep je in specifieke oefeningen of concepten</li>
              <li class="mb-2"><strong>Stel vragen</strong> - Type je eigen vragen in het invoerveld onderaan</li>
              <li class="mb-2"><strong>Vervolg het gesprek</strong> - Klik op de kernbegrippen rechts om het gesprek verder te verdiepen</li>
            </ul>
          </div>
          
          <div class="mb-4 p-2.5 border border-dashed border-gray-800">
            <h3 class="mt-0 border-b border-gray-800 inline-block">3. Kernbegrippen paneel</h3>
            <p>Na elk antwoord van de assistent verschijnen er drie kernbegrippen in het rechterpaneel. <strong>Je kunt hierop klikken om direct een vervolgvraag te stellen</strong> over dat specifieke onderwerp en zo het gesprek te verdiepen.</p>
          </div>
          
          <div class="text-center mt-5">
            <button 
              @click="dismissOnboarding" 
              class="p-2 px-4 text-lg bg-white border-2 border-gray-800 cursor-pointer transition-all shadow-sm hover:bg-gray-800 hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md"
            >
              Begin met ACT therapie
            </button>
          </div>
          
          <!-- Scroll indicator as fixed element at bottom right -->
          <div v-if="showScrollIndicator" 
               @click="scrollDown"
               class="absolute bottom-8 right-8 p-2 bg-white/90 rounded-full border-2 border-gray-800 cursor-pointer hover:bg-gray-200 shadow-md animate-pulse transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                 stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                 class="animate-bounce">
              <path d="M7 13l5 5 5-5"></path>
            </svg>
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-2.5 bg-white scrollbar-thin scrollbar-thumb-emerald-600 scrollbar-track-white">
        <div v-for="(message, index) in chatHistory" :key="index" class="mb-4 flex items-start" :class="{'flex-row-reverse': message.role === 'user', 'flex-row': message.role === 'assistant'}">
          <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0 border border-gray-800" 
               :class="{'bg-white ml-2.5': message.role === 'user', 'bg-emerald-600 text-white mr-2.5': message.role === 'assistant'}">
            {{ message.role === 'user' ? 'J' : 'A' }}
          </div>
          <div class="p-2.5 px-4 rounded-2xl max-w-[70%] break-words relative" 
               :class="{
                 'bg-white border border-gray-800 rounded-tr-sm text-left': message.role === 'user', 
                 'bg-emerald-600 text-white rounded-tl-sm text-left': message.role === 'assistant'
               }">
            {{ message.content }}
          </div>
        </div>
        
        <div v-if="isLoading" class="text-center p-2.5 italic">Laden...</div>
      </div>
      
      <div class="flex p-2.5 border-t border-gray-800">
        <input 
          v-model="userMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Stel hier je vraag over ACT therapie..."
          class="flex-1 p-1 border-2 border-gray-800 bg-white font-mono"
        />
        <button 
          @click="sendMessage"
          :disabled="isLoading"
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 bg-white border-2 border-gray-800 cursor-pointer font-mono font-normal transition-all hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
        >
          {{ chatHistory.length > 0 ? 'Versturen' : 'Start gesprek' }}
        </button>
        <button
          @click="endSession"
          :disabled="isLoading" 
          class="whitespace-nowrap p-1 px-2.5 ml-2.5 bg-gray-100 border-2 border-gray-800 cursor-pointer font-mono font-normal transition-all hover:bg-gray-800 hover:text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
          title="Beëindig deze sessie"
        >
          Afronden
        </button>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="w-60 h-[calc(100vh-40px)] bg-white border-2 border-gray-800 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
      <div class="flex justify-between items-center bg-white border-b-2 border-gray-800 p-2">
        <div class="font-bold">Kernbegrippen</div>
        <div class="flex">
          <button class="w-5 h-5 leading-none text-center border border-gray-800 font-bold cursor-pointer transition-all hover:bg-emerald-600 hover:text-white hover:scale-110">_</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 bg-white scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-white">
        <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" class="mb-2.5 pb-2.5 border-b border-gray-800 last:border-b-0">
          <div class="flex flex-wrap">
            <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                 @click="useEssenceWord(word)"
                 class="inline-block mr-2.5 mb-2.5 p-1 px-2.5 bg-white border-2 border-gray-800 cursor-pointer font-mono font-normal transition-all drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-gray-800 hover:text-white hover:drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              {{ word }}
            </div>
          </div>
        </div>
        
        <div v-if="isEssenceLoading" class="essence-loading">
          <div class="w-full h-5 border border-gray-800 relative overflow-hidden mt-2.5">
            <span class="block h-full w-1/2 bg-gradient-to-r from-emerald-600 to-emerald-600 via-white bg-[length:20px_20px] animate-progress"></span>
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