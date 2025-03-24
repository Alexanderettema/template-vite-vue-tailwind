<script setup lang="ts">
import { ref, nextTick } from 'vue'
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

async function sendMessage() {
  if (!userMessage.value.trim()) return
  
  const message = userMessage.value
  chatHistory.value.push({ role: 'user', content: message })
  userMessage.value = ''
  isLoading.value = true
  
  nextTick(() => scrollToBottom())

  try {
    const fullPrompt = `${systemInstructions}\n\nUser: ${message}`
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    const messageIndex = chatHistory.value.length
    chatHistory.value.push({ role: 'assistant', content: text })
    
    getEssence(text, messageIndex)
    
    nextTick(() => scrollToBottom())
  } catch (error) {
    console.error('Error:', error)
    chatHistory.value.push({ role: 'assistant', content: 'Sorry, er was een fout bij het verwerken van je verzoek.' })
    
    nextTick(() => scrollToBottom())
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
    
    nextTick(() => scrollEssencePanelToBottom())
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
  const chatContainer = document.querySelector('.chat-container')
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight
  }
}

function scrollEssencePanelToBottom() {
  const essencePanel = document.querySelector('.essence-panel')
  if (essencePanel) {
    essencePanel.scrollTop = essencePanel.scrollHeight
  }
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
</script>

<template>
  <div class="app-container">
    <!-- Themes panel (new left sidebar) -->
    <div class="retro-window sidebar themes-sidebar">
      <div class="window-header">
        <div class="window-title">{{ !selectedMainTopic ? 'ACT Thema\'s' : 'Specifieke Oefeningen' }}</div>
        <div class="window-controls">
          <button class="window-minimize">_</button>
        </div>
      </div>
      <div class="themes-panel">
        <!-- Main topics -->
        <div v-if="!selectedMainTopic" class="themes-container">
          <div class="theme-title">Kies een ACT thema:</div>
          <button 
            v-for="(description, topic) in mainTopics" 
            :key="topic"
            @click="selectMainTopic(topic)"
            :disabled="isLoading"
            class="retro-button theme-button"
          >
            {{ topic }}
          </button>
        </div>
        
        <!-- Subtopics after main topic selection -->
        <div v-else class="themes-container">
          <div class="theme-title">Kies een oefening:</div>
          <button 
            v-for="(subtopic, index) in subTopics[selectedMainTopic as keyof typeof subTopics]" 
            :key="index"
            @click="sendSubTopic(subtopic)"
            :disabled="isLoading"
            class="retro-button theme-button"
          >
            {{ subtopic }}
          </button>
          
          <button @click="selectedMainTopic = ''" class="retro-button back-button">← Terug naar thema's</button>
        </div>
      </div>
    </div>
    
    <div class="retro-window main-layout">
      <div class="window-header">
        <div class="window-title">ACT therapie</div>
        <div class="window-controls">
          <button class="window-help" @click="startOnboarding" title="Help">?</button>
          <button class="window-close" @click="resetSession" title="Reset gesprek">×</button>
        </div>
      </div>
      
      <!-- End session overlay -->
      <div v-if="showEndSession" class="end-session-overlay">
        <div class="end-session-content">
          <h2>Einde Sessie</h2>
          
          <div class="end-session-summary">
            <p>{{ sessionSummary }}</p>
          </div>
          
          <div class="meditation-icon">
            <span>🧘</span>
          </div>
          
          <div class="end-session-message">
            <p>Bedankt voor je deelname aan deze ACT sessie. Neem even de tijd om te reflecteren.</p>
          </div>
          
          <div class="end-session-buttons">
            <button @click="continueSession" class="retro-button continue-button">Doorgaan met sessie</button>
            <button @click="resetSession" class="retro-button new-session-button">Nieuwe sessie starten</button>
          </div>
        </div>
      </div>
      
      <!-- Onboarding overlay -->
      <div v-if="showOnboarding" class="onboarding-overlay">
        <div class="onboarding-content">
          <h2>Welkom bij de ACT Therapie App</h2>
          
          <div class="onboarding-section">
            <h3>1. Wat is ACT?</h3>
            <p>Acceptance and Commitment Therapy (ACT) helpt je om lastige gedachten en gevoelens te accepteren terwijl je stappen zet richting een waardevol leven.</p>
          </div>
          
          <div class="onboarding-section">
            <h3>2. Hoe gebruik je deze app?</h3>
            <ul>
              <li><strong>Kies een onderwerp</strong> - Begin met een van de hoofdthema's: Waarden, Defusie of Mindfulness</li>
              <li><strong>Verken subthema's</strong> - Verdiep je in specifieke oefeningen of concepten</li>
              <li><strong>Stel vragen</strong> - Type je eigen vragen in het invoerveld onderaan</li>
              <li><strong>Vervolg het gesprek</strong> - Klik op de kernbegrippen rechts om het gesprek verder te verdiepen</li>
            </ul>
          </div>
          
          <div class="onboarding-section">
            <h3>3. Kernbegrippen paneel</h3>
            <p>Na elk antwoord van de assistent verschijnen er drie kernbegrippen in het rechterpaneel. <strong>Je kunt hierop klikken om direct een vervolgvraag te stellen</strong> over dat specifieke onderwerp en zo het gesprek te verdiepen.</p>
          </div>
          
          <div class="onboarding-buttons">
            <button @click="dismissOnboarding" class="retro-button onboarding-button">Begin met ACT therapie</button>
          </div>
        </div>
      </div>
      
      <div class="chat-container">
        <div v-for="(message, index) in chatHistory" :key="index" class="message" :class="{'user-message-container': message.role === 'user', 'assistant-message-container': message.role === 'assistant'}">
          <div class="avatar" :class="{'user-avatar': message.role === 'user', 'assistant-avatar': message.role === 'assistant'}">
            {{ message.role === 'user' ? 'J' : 'A' }}
          </div>
          <div class="message-bubble" :class="{'user-bubble': message.role === 'user', 'assistant-bubble': message.role === 'assistant'}">
            {{ message.content }}
          </div>
        </div>
        
        <div v-if="isLoading" class="loading">Laden...</div>
      </div>
      
      <div class="controls">
        <div class="input-container">
          <input 
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Stel hier je vraag over ACT therapie..."
            class="retro-input message-input"
          />
          <button 
            @click="sendMessage"
            :disabled="isLoading"
            class="retro-button send-button"
          >
            Start gesprek
          </button>
          <button
            @click="endSession"
            :disabled="isLoading" 
            class="retro-button end-button"
            title="Beëindig deze sessie"
          >
            Afronden
          </button>
        </div>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="retro-window sidebar">
      <div class="window-header">
        <div class="window-title">Kernbegrippen</div>
        <div class="window-controls">
          <button class="window-minimize">_</button>
        </div>
      </div>
      <div class="essence-panel">
        <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" class="essence-group">
          <div class="essence-words">
            <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                 @click="useEssenceWord(word)"
                 class="retro-button essence-word">
              {{ word }}
            </div>
          </div>
        </div>
        
        <div v-if="isEssenceLoading" class="essence-loading">
          <div class="loading-bar">
            <span class="loading-progress"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Kleurvariabelen */
:root {
  --app-bg-color: #f0f0f0;
  --window-bg-color: #fff;
  --text-color: #000;
  --border-color: #000;
  --accent-color: #009554; /* Hoofdaccent kleur - verander deze om de gehele UI aan te passen */
  --accent-text-color: #fff;
  --secondary-bg-color: #eee;
}

/* Retro UI styling */
body {
  margin: 0;
  padding: 0;
  font-family: 'Courier New', monospace;
  background-color: var(--app-bg-color);
  color: var(--text-color);
}

/* Center the app horizontally and ensure it fits in viewport */
.app-container {
  display: flex;
  min-height: 100vh;
  max-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
}

.retro-window {
  background-color: var(--window-bg-color);
  border: 2px solid var(--border-color);
  box-shadow: 2px 2px 0 var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--window-bg-color);
  border-bottom: 2px solid var(--border-color);
  padding: 5px 10px;
}

.window-title {
  font-weight: bold;
}

.window-controls button {
  background: var(--window-bg-color);
  border: 1px solid var(--border-color);
  width: 20px;
  height: 20px;
  line-height: 16px;
  text-align: center;
  margin-left: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.window-close:hover, .window-help:hover, .window-minimize:hover {
  background-color: var(--accent-color);
  color: var(--accent-text-color);
  transform: scale(1.1);
}

.main-layout {
  width: 600px;
  height: calc(100vh - 40px);
}

.sidebar {
  width: 250px;
  height: calc(100vh - 40px);
}

.chat-container, .essence-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: var(--window-bg-color);
  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color) var(--window-bg-color);
}

.chat-container::-webkit-scrollbar,
.essence-panel::-webkit-scrollbar {
  width: 10px;
}

.chat-container::-webkit-scrollbar-track,
.essence-panel::-webkit-scrollbar-track,
.themes-panel::-webkit-scrollbar-track {
  background: var(--window-bg-color);
  border-left: 1px solid var(--border-color);
}

.chat-container::-webkit-scrollbar-thumb,
.essence-panel::-webkit-scrollbar-thumb,
.themes-panel::-webkit-scrollbar-thumb {
  background-color: var(--accent-color);
  border: 1px solid var(--window-bg-color);
}

.topic-section {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}

.topic-header {
  margin-bottom: 10px;
}

.topic-label, .theme-title {
  font-weight: bold;
  position: relative;
  display: inline-block;
  background-color: var(--window-bg-color);
  padding: 5px;
  border: 1px solid var(--border-color);
}

.topics-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input-container {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid var(--border-color);
}

.retro-input {
  flex: 1;
  padding: 5px;
  border: 2px solid var(--border-color);
  background-color: var(--window-bg-color);
  font-family: 'Courier New', monospace;
}

.retro-button {
  padding: 5px 10px;
  background-color: var(--window-bg-color);
  color: var(--text-color);
  border: 2px solid var(--border-color);
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-weight: normal;
  position: relative;
  text-align: center;
  transition: all 0.15s ease-in-out;
}

.retro-button:hover {
  background-color: var(--accent-color);
  color: var(--accent-text-color);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--accent-color);
}

.retro-button:active {
  top: 1px;
  left: 1px;
  box-shadow: 1px 1px 0 var(--accent-color);
  transform: translate(0, 0);
}

.retro-button:not(:active):not(:hover) {
  box-shadow: 2px 2px 0 var(--border-color);
}

.essence-word {
  display: inline-block;
  margin-right: 10px;
  margin-bottom: 10px;
}

.message {
  margin-bottom: 15px;
  display: flex;
  align-items: flex-start;
}

.user-message-container {
  flex-direction: row-reverse;
}

.assistant-message-container {
  flex-direction: row;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

.user-avatar {
  background-color: var(--window-bg-color);
  margin-left: 10px;
}

.assistant-avatar {
  background-color: var(--accent-color);
  color: var(--accent-text-color);
  margin-right: 10px;
}

.message-bubble {
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 70%;
  word-wrap: break-word;
  position: relative;
}

.user-bubble {
  background-color: var(--window-bg-color);
  border: 1px solid var(--border-color);
  border-top-right-radius: 4px;
  text-align: left;
}

.assistant-bubble {
  background-color: var(--accent-color);
  color: var(--accent-text-color);
  border-top-left-radius: 4px;
  text-align: left;
}

/* Remove old message styling */
.message-content {
  display: none;
}

.user-message, .assistant-message {
  display: none;
}

/* Updated timestamp style */
.chat-container .message:last-child::after {
  content: '';
  display: block;
  width: 100%;
  text-align: center;
  color: #999;
  font-size: 0.8rem;
  margin-top: 15px;
}

.controls {
  display: flex;
  flex-direction: column;
}

.loading {
  text-align: center;
  padding: 10px;
  font-style: italic;
}

.loading-bar {
  width: 100%;
  height: 20px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  margin-top: 10px;
}

.loading-progress {
  display: block;
  height: 100%;
  width: 50%;
  background: repeating-linear-gradient(
    45deg,
    var(--accent-color),
    var(--accent-color) 10px,
    var(--window-bg-color) 10px,
    var(--window-bg-color) 20px
  );
  animation: progress 1s linear infinite;
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.essence-group {
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.essence-group:last-child {
  border-bottom: none;
}

.window-help {
  margin-right: 5px;
}

/* Onboarding styles */
.onboarding-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.onboarding-content {
  background-color: var(--window-bg-color);
  border: 2px solid var(--border-color);
  box-shadow: 3px 3px 0 var(--border-color);
  padding: 20px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
}

.onboarding-content h2 {
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
  margin-top: 0;
}

.onboarding-section {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px dashed var(--border-color);
}

.onboarding-section h3 {
  margin-top: 0;
  border-bottom: 1px solid var(--border-color);
  display: inline-block;
}

.onboarding-section ul {
  padding-left: 20px;
}

.onboarding-section li {
  margin-bottom: 8px;
}

.onboarding-buttons {
  text-align: center;
  margin-top: 20px;
}

.onboarding-button {
  padding: 8px 16px;
  font-size: 1.1rem;
}

.onboarding-button:hover {
  background-color: var(--accent-color);
  color: var(--accent-text-color);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--accent-color);
}

.retro-window {
  position: relative;
}

.send-button {
  white-space: nowrap;
}

.themes-sidebar {
  width: 250px;
  height: calc(100vh - 40px);
  order: -1; /* Places this sidebar on the left */
}

.themes-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: var(--window-bg-color);
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color) var(--window-bg-color);
}

.themes-panel::-webkit-scrollbar {
  width: 10px;
}

.themes-panel::-webkit-scrollbar-track {
  background: var(--window-bg-color);
  border-left: 1px solid var(--border-color);
}

.themes-panel::-webkit-scrollbar-thumb {
  background-color: var(--accent-color);
  border: 1px solid var(--window-bg-color);
}

.themes-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-title {
  font-weight: bold;
  border: 1px solid var(--border-color);
  padding: 5px;
  margin-bottom: 10px;
  text-align: center;
  background-color: var(--window-bg-color);
}

.theme-button {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 5px;
}

.back-button {
  margin-top: 15px;
}

/* Remove the topic-section styles as they're no longer needed */
.topic-section, .topic-header, .topics-container {
  /* These elements are being replaced by the left sidebar */
}

/* End session styles */
.end-session-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.end-session-content {
  background-color: var(--window-bg-color);
  border: 2px solid var(--border-color);
  box-shadow: 3px 3px 0 var(--border-color);
  padding: 20px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.end-session-content h2 {
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
  margin-top: 0;
}

.end-session-summary {
  background-color: var(--secondary-bg-color);
  border: 1px dashed var(--border-color);
  padding: 15px;
  margin: 15px 0;
  text-align: left;
  border-radius: 4px;
}

.meditation-icon {
  font-size: 48px;
  margin: 20px 0;
}

.end-session-message {
  margin-bottom: 20px;
  font-style: italic;
}

.end-session-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.continue-button, .new-session-button {
  padding: 8px 16px;
}

.end-button {
  white-space: nowrap;
  margin-left: 10px;
  background-color: var(--secondary-bg-color);
}
</style> 