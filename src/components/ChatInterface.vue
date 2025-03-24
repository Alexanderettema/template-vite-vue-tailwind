<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyAnGkMmVSqjXtA-glr372uaO_JZFobkSo0'
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const systemInstructions = `You are an ACT (Acceptance and Commitment Therapy) expert and guide. Your role is to:
1. Provide evidence-based ACT techniques and principles
2. Use clear, compassionate, and practical language
3. Focus on experiential exercises and mindfulness practices
4. Emphasize acceptance of difficult thoughts and feelings while committing to value-aligned actions
5. Keep responses under 50 words - be extremely concise
6. Use examples and metaphors when helpful, but keep them brief
7. Avoid giving medical advice or diagnosing conditions
8. Encourage self-compassion and personal growth

IMPORTANT: Your responses MUST be under 50 words. Prioritize clarity and brevity over completeness.`

const userMessage = ref('')
const chatHistory = ref<{ role: 'user' | 'assistant', content: string, essence?: string }[]>([])
const isLoading = ref(false)
const isEssenceLoading = ref(false)
const selectedMainTopic = ref('')

const mainTopics = {
  "Values": "Values exploration",
  "Defusion": "Defusion technique",
  "Mindfulness": "Present moment"
}

const subTopics = {
  "Values": [
    "Life direction",
    "Core values",
    "Values vs goals"
  ],
  "Defusion": [
    "Thought watching",
    "Leaves on stream",
    "Thanking your mind"
  ],
  "Mindfulness": [
    "Body scan",
    "Five senses",
    "Mindful breathing"
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
    chatHistory.value.push({ role: 'assistant', content: 'Sorry, there was an error processing your request.' })
    
    nextTick(() => scrollToBottom())
  } finally {
    isLoading.value = false
  }
}

async function getEssence(text: string, messageIndex: number) {
  isEssenceLoading.value = true
  try {
    const essencePrompt = `Extract exactly 3 important keywords directly from this ACT therapy response.
      Choose words that actually appear in the text and would be meaningful for continuing the conversation.
      Select diverse words representing different aspects or concepts mentioned.
      Format: respond with only the 3 extracted single words separated by spaces. No explanations or additional text.
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
  userMessage.value = `Let's explore ${word} more deeply.`
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
}
</script>

<template>
  <div class="app-container">
    <div class="retro-window main-layout">
      <div class="window-header">
        <div class="window-title">ACT therapy</div>
        <div class="window-controls">
          <button class="window-close" @click="resetSession">×</button>
        </div>
      </div>
      
      <div class="chat-container">
        <div v-for="(message, index) in chatHistory" :key="index" class="message">
          <div class="message-content" :class="{'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant'}">
            <strong>{{ message.role === 'user' ? 'You' : 'Assistant' }}:</strong> {{ message.content }}
          </div>
        </div>
        
        <div v-if="isLoading" class="loading">Loading...</div>
      </div>
      
      <div class="controls">
        <!-- Topic selection buttons -->
        <div class="topics-container">
          <!-- Main topics -->
          <template v-if="!selectedMainTopic">
            <button 
              v-for="(description, topic) in mainTopics" 
              :key="topic"
              @click="selectMainTopic(topic)"
              :disabled="isLoading"
              class="retro-button topic-button"
            >
              {{ topic }}
            </button>
          </template>
          
          <!-- Subtopics after main topic selection -->
          <template v-else>
            <button 
              v-for="(subtopic, index) in subTopics[selectedMainTopic as keyof typeof subTopics]" 
              :key="index"
              @click="sendSubTopic(subtopic)"
              :disabled="isLoading"
              class="retro-button subtopic-button"
            >
              {{ subtopic }}
            </button>
          </template>
        </div>
        
        <!-- Back button appears when subtopics are shown -->
        <div v-if="selectedMainTopic" class="back-button-container">
          <button @click="selectedMainTopic = ''" class="retro-button back-button">Back</button>
        </div>
        
        <div class="input-container">
          <input 
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Enter..."
            class="retro-input message-input"
          />
          <button 
            @click="sendMessage"
            :disabled="isLoading"
            class="retro-button send-button"
          >
            Send...
          </button>
        </div>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="retro-window sidebar">
      <div class="window-header">
        <div class="window-title">Key Concepts</div>
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
/* Retro UI styling */
body {
  margin: 0;
  padding: 0;
  font-family: 'Courier New', monospace;
  background-color: #f0f0f0;
  color: #000;
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
  background-color: #fff;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 2px solid #000;
  padding: 5px 10px;
}

.window-title {
  font-weight: bold;
}

.window-controls button {
  background: #fff;
  border: 1px solid #000;
  width: 20px;
  height: 20px;
  line-height: 16px;
  text-align: center;
  margin-left: 5px;
  font-weight: bold;
  cursor: pointer;
}

.window-close:hover {
  background-color: #000;
  color: #fff;
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
  background-color: #fff;
  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #000 #fff;
}

.chat-container::-webkit-scrollbar,
.essence-panel::-webkit-scrollbar {
  width: 10px;
}

.chat-container::-webkit-scrollbar-track,
.essence-panel::-webkit-scrollbar-track {
  background: #fff;
  border-left: 1px solid #000;
}

.chat-container::-webkit-scrollbar-thumb,
.essence-panel::-webkit-scrollbar-thumb {
  background-color: #000;
  border: 1px solid #fff;
}

.topics-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px;
}

.input-container {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid #000;
}

.retro-input {
  flex: 1;
  padding: 5px;
  border: 2px solid #000;
  background-color: #fff;
  font-family: 'Courier New', monospace;
}

.retro-button {
  padding: 5px 10px;
  background-color: #fff;
  color: #000;
  border: 2px solid #000;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-weight: normal;
  position: relative;
  text-align: center;
}

.retro-button:active {
  top: 1px;
  left: 1px;
  box-shadow: 1px 1px 0 #000;
}

.retro-button:not(:active) {
  box-shadow: 2px 2px 0 #000;
}

.essence-word {
  display: inline-block;
  margin-right: 10px;
  margin-bottom: 10px;
}

.message {
  margin-bottom: 10px;
}

.message-content {
  padding: 8px;
  border: 1px solid #000;
  display: inline-block;
  max-width: 80%;
  background-color: #fff;
}

.user-message {
  margin-right: auto;
}

.assistant-message {
  margin-left: auto;
  background-color: #f0f0f0;
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
  border: 1px solid #000;
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
    #000,
    #000 10px,
    #fff 10px,
    #fff 20px
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
  border-bottom: 1px solid #000;
  padding-bottom: 10px;
}

.essence-group:last-child {
  border-bottom: none;
}
</style> 