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
const chatHistory = ref<{ role: 'user' | 'assistant', content: string }[]>([])
const isLoading = ref(false)
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
    chatHistory.value.push({ role: 'assistant', content: text })
    
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

// Function to scroll to the bottom of the chat container
function scrollToBottom() {
  const chatContainer = document.querySelector('.chat-container')
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight
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
  <div class="min-h-screen bg-gradient-to-br from-sage-900 via-teal-900 to-sage-950 p-8">
    <div class="w-full max-w-2xl mx-auto">
      <div class="flex justify-between items-center mb-12">
        <h1 class="text-5xl font-extralight text-sage-100 text-center tracking-widest">ACT app</h1>
        <button 
          @click="resetSession" 
          class="rounded-full bg-sage-700/30 border border-sage-400/20 p-2 hover:bg-teal-400/20 
                 transition-all duration-300 backdrop-blur-md"
          aria-label="Reset session"
          title="Reset session"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sage-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div class="bg-sage-800/30 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 h-[400px] overflow-y-auto border border-sage-400/10 chat-container">
        <div v-for="(message, index) in chatHistory" :key="index" 
             :class="['mb-6', message.role === 'user' ? 'text-right' : 'text-left']">
          <div :class="['inline-block p-5 rounded-3xl backdrop-blur-md', 
                        message.role === 'user' 
                          ? 'bg-teal-400/20 text-sage-100 shadow-teal-500/10' 
                          : 'bg-sage-700/20 text-sage-200/90 shadow-sage-700/10']">
            {{ message.content }}
          </div>
        </div>
        <div v-if="isLoading" class="text-sage-300/70 text-center italic">
          breathing in wisdom...
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
              class="bg-sage-700/20 text-sage-200 rounded-3xl border border-sage-400/10 p-4
                    hover:bg-teal-400/20 transition-all duration-500 disabled:opacity-50 text-center
                    backdrop-blur-md shadow-lg text-sm sm:text-base"
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
              class="bg-teal-400/30 text-sage-100 rounded-3xl border border-teal-400/20 p-4
                    hover:bg-teal-400/40 transition-all duration-500 disabled:opacity-50 text-center
                    backdrop-blur-md shadow-lg text-sm sm:text-base"
            >
              {{ subtopic }}
            </button>
          </template>
        </div>
        
        <!-- Back button appears when subtopics are shown -->
        <div v-if="selectedMainTopic" class="flex justify-center mb-2">
          <button 
            @click="selectedMainTopic = ''" 
            class="text-sage-300 hover:text-sage-100 text-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back to main topics
          </button>
        </div>
        
        <div class="flex gap-4 items-center bg-sage-700/20 p-3 rounded-full backdrop-blur-md border border-sage-400/10 shadow-lg">
          <input 
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Share your thoughts mindfully..."
            class="flex-1 px-5 py-2 bg-transparent text-sage-100 placeholder-sage-400/50 focus:outline-none"
          />
          <button 
            @click="sendMessage"
            :disabled="isLoading"
            class="w-12 h-12 rounded-full bg-teal-500/20 text-sage-200 flex items-center justify-center 
                   backdrop-blur-md hover:bg-teal-500/30 transition-all duration-500 
                   disabled:opacity-50 disabled:hover:bg-teal-500/20 shadow-lg shadow-teal-500/20
                   border border-teal-400/30 hover:border-teal-400/50"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --color-sage-100: #f1f4f1;
  --color-sage-200: #e2e8e2;
  --color-sage-300: #c5d1c5;
  --color-sage-400: #a7b7a7;
  --color-sage-500: #8a9d8a;
  --color-sage-600: #6d836d;
  --color-sage-700: #515f51;
  --color-sage-800: #343b34;
  --color-sage-900: #1a1d1a;
  --color-sage-950: #0d0f0d;
}

/* Custom cursor styles */
button, 
input[type="text"],
a {
  cursor: pointer;
}

button:hover {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'><path fill='%23A7B7A7' d='M9.4 18L8 16.6l4.6-4.6L8 7.4 9.4 6l6 6z'/></svg>"), auto;
}

input[type="text"]:hover {
  cursor: text;
}

/* Existing styles */
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(241, 244, 241, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(241, 244, 241, 0.2);
}

@keyframes breathe {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.3; }
}

.text-center.italic {
  animation: breathe 2s ease-in-out infinite;
}
</style> 