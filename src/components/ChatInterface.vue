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
    const essencePrompt = `Create 3 separate keywords or short phrases (1-2 words each) that could serve as conversation continuations based on this text.
      Each should offer a different direction to explore further.
      Format: respond with exactly 3 keywords or phrases separated by spaces. No explanations or additional text.
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
  userMessage.value = `Tell me more about "${word}" in the context of ACT therapy.`
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
    <div class="main-layout">
      <div class="header">
        <h1>ACT app</h1>
        <button @click="resetSession" class="reset-button">Reset</button>
      </div>
      
      <div class="chat-container">
        <div v-for="(message, index) in chatHistory" :key="index" class="message">
          <div class="message-content">
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
              class="topic-button"
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
              class="subtopic-button"
            >
              {{ subtopic }}
            </button>
          </template>
        </div>
        
        <!-- Back button appears when subtopics are shown -->
        <div v-if="selectedMainTopic" class="back-button-container">
          <button @click="selectedMainTopic = ''" class="back-button">Back to main topics</button>
        </div>
        
        <div class="input-container">
          <input 
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Type your message..."
            class="message-input"
          />
          <button 
            @click="sendMessage"
            :disabled="isLoading"
            class="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
    
    <!-- Essence keywords panel -->
    <div class="sidebar">
      <div class="sidebar-header">Explore Further</div>
      <div class="essence-panel">
        <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" class="essence-group">
          <div class="essence-words">
            <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                 @click="useEssenceWord(word)"
                 class="essence-word">
              {{ word }}
            </div>
          </div>
        </div>
        
        <div v-if="isEssenceLoading" class="essence-loading">
          <div v-for="i in 3" :key="i" class="loading-placeholder">Loading...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Basic layout and colors */
.app-container {
  display: flex;
  min-height: 100vh;
  background-color: #f0f4f8;
  padding: 20px;
}

.main-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
}

.sidebar {
  width: 250px;
  margin-left: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-container, .essence-panel {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-container {
  height: 400px;
  flex: 1;
}

.essence-panel {
  height: 400px;
}

.sidebar-header {
  margin-bottom: 10px;
  font-weight: bold;
}

.topics-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input-container {
  display: flex;
  gap: 10px;
}

.message-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.send-button, .reset-button, .topic-button, .subtopic-button, .back-button {
  padding: 8px 15px;
  background-color: #4a6fa5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-button:disabled, .topic-button:disabled, .subtopic-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.essence-word {
  background-color: #e5edfd;
  padding: 5px 10px;
  margin-bottom: 5px;
  border-radius: 4px;
  cursor: pointer;
}

.essence-word:hover {
  background-color: #d3e2fc;
}

.message {
  margin-bottom: 10px;
}

.message-content {
  padding: 10px;
  border-radius: 4px;
  background-color: #f5f8fc;
  display: inline-block;
  max-width: 80%;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.loading, .essence-loading {
  text-align: center;
  color: #666;
  font-style: italic;
}
</style> 