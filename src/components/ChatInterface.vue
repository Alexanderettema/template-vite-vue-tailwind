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
  
  // Scroll to bottom after user message is added
  nextTick(() => scrollToBottom())

  try {
    const fullPrompt = `${systemInstructions}\n\nUser: ${message}`
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    // Add the assistant's response to chat history
    const messageIndex = chatHistory.value.length
    chatHistory.value.push({ role: 'assistant', content: text })
    
    // Generate the three-word essence
    getEssence(text, messageIndex)
    
    // Scroll to bottom after response is received
    nextTick(() => scrollToBottom())
  } catch (error) {
    console.error('Error:', error)
    chatHistory.value.push({ role: 'assistant', content: 'Sorry, there was an error processing your request.' })
    
    // Scroll to bottom after error message is added
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
    
    // Update the message with the essence
    if (chatHistory.value[messageIndex]) {
      chatHistory.value[messageIndex].essence = essence
    }
    
    // Scroll essence panel to bottom to show latest keywords
    nextTick(() => scrollEssencePanelToBottom())
  } catch (error) {
    console.error('Error generating essence:', error)
  } finally {
    isEssenceLoading.value = false
  }
}

// Split a three-word essence into an array of individual words
function splitEssence(essence: string): string[] {
  if (!essence) return []
  return essence.split(/\s+/).filter(word => word.trim().length > 0).slice(0, 3)
}

// Use an essence word to continue the conversation
function useEssenceWord(word: string) {
  userMessage.value = `Tell me more about "${word}" in the context of ACT therapy.`
  sendMessage()
}

// Function to scroll to the bottom of the chat container
function scrollToBottom() {
  const chatContainer = document.querySelector('.chat-container')
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight
  }
}

// Function to scroll essence panel to bottom to show the latest keywords
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
  selectedMainTopic.value = '' // Reset after sending
}

function resetSession() {
  chatHistory.value = []
  selectedMainTopic.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-cream p-8">
    <div class="w-full max-w-4xl mx-auto flex gap-6">
      <div class="flex-1 flex flex-col">
        <div class="flex justify-between items-center mb-12">
          <h1 class="text-5xl font-light text-gray-800 tracking-tight">ACT app</h1>
          <button 
            @click="resetSession" 
            class="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-all duration-300"
            aria-label="Reset session"
            title="Reset session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm p-8 mb-8 h-[400px] overflow-y-auto chat-container">
          <div v-for="(message, index) in chatHistory" :key="index" 
               :class="['mb-6', message.role === 'user' ? 'text-right' : 'text-left']">
            <div :class="['inline-block p-5 rounded-2xl max-w-[85%]', 
                          message.role === 'user' 
                            ? 'bg-yellow-circle text-gray-800' 
                            : 'bg-lavender-circle text-gray-800']">
              {{ message.content }}
            </div>
          </div>
          
          <div v-if="isLoading" class="text-gray-400 text-center italic">
            thinking...
          </div>
        </div>
        
        <div class="flex flex-col gap-6">
          <!-- Topic selection buttons -->
          <div class="grid grid-cols-3 gap-4">
            <!-- Main topics -->
            <template v-if="!selectedMainTopic">
              <button 
                v-for="(description, topic) in mainTopics" 
                :key="topic"
                @click="selectMainTopic(topic)"
                :disabled="isLoading"
                class="bg-salmon-circle text-gray-800 rounded-full p-4
                      hover:bg-salmon-circle-hover transition-all duration-300 disabled:opacity-50 text-center
                      shadow-sm text-sm sm:text-base font-medium"
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
                class="bg-lavender-circle text-gray-800 rounded-full p-4
                      hover:bg-lavender-circle-hover transition-all duration-300 disabled:opacity-50 text-center
                      shadow-sm text-sm sm:text-base font-medium"
              >
                {{ subtopic }}
              </button>
            </template>
          </div>
          
          <!-- Back button appears when subtopics are shown -->
          <div v-if="selectedMainTopic" class="flex justify-center mb-2">
            <button 
              @click="selectedMainTopic = ''" 
              class="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
              Back to main topics
            </button>
          </div>
          
          <div class="flex gap-4 items-center bg-gray-100 p-3 rounded-full shadow-sm">
            <input 
              v-model="userMessage"
              @keyup.enter="sendMessage"
              type="text"
              placeholder="Share your thoughts mindfully..."
              class="flex-1 px-5 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none border-0"
            />
            <button 
              @click="sendMessage"
              :disabled="isLoading"
              class="w-12 h-12 rounded-full bg-yellow-circle text-gray-800 flex items-center justify-center 
                     hover:bg-yellow-circle-hover transition-all duration-300 
                     disabled:opacity-50 shadow-sm"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Essence keywords panel -->
      <div class="w-48 pt-24">
        <div class="sticky top-8 flex flex-col h-[calc(100vh-12rem)]">
          <div class="text-xs uppercase text-gray-500 tracking-wider mb-3 font-medium">Explore Further</div>
          <div class="space-y-4 overflow-y-auto pr-2 essence-panel">
            <div v-for="(message, index) in chatHistory.filter(m => m.role === 'assistant' && m.essence)" :key="index" 
                 class="transition-all duration-500">
              <div class="flex flex-col gap-2 mb-5">
                <div v-for="(word, wordIndex) in splitEssence(message.essence)" :key="wordIndex"
                     @click="useEssenceWord(word)"
                     class="px-3 py-2 rounded-full bg-lavender-circle text-gray-800 text-sm
                            hover:bg-lavender-circle-hover transition-all duration-300 cursor-pointer
                            font-medium flex items-center shadow-sm">
                  <span>{{ word }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 ml-1.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div v-if="isEssenceLoading" class="flex flex-col gap-2 mb-5">
              <div v-for="i in 3" :key="i" 
                   class="px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-300 animate-pulse">
                &nbsp;
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --color-cream: #f8f5f2;
  --color-yellow-circle: #ffd966;
  --color-yellow-circle-hover: #ffcf40;
  --color-salmon-circle: #f8b7bd;
  --color-salmon-circle-hover: #f69ca4;
  --color-lavender-circle: #e9e3f5;
  --color-lavender-circle-hover: #d7ceed;
}

.bg-cream {
  background-color: var(--color-cream);
}

.bg-yellow-circle {
  background-color: var(--color-yellow-circle);
}

.bg-yellow-circle-hover {
  background-color: var(--color-yellow-circle-hover);
}

.bg-salmon-circle {
  background-color: var(--color-salmon-circle);
}

.bg-salmon-circle-hover {
  background-color: var(--color-salmon-circle-hover);
}

.bg-lavender-circle {
  background-color: var(--color-lavender-circle);
}

.bg-lavender-circle-hover {
  background-color: var(--color-lavender-circle-hover);
}

/* Custom cursor styles */
button, 
input[type="text"],
a {
  cursor: pointer;
}

input[type="text"]:hover {
  cursor: text;
}

/* Remove default input focus outline */
input, input:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Animation */
@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.3; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Message max width and wrapping */
.chat-container div[class*="inline-block"] {
  word-break: break-word;
}
</style> 