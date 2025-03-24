<script setup lang="ts">
import { ref } from 'vue'
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

const examplePrompts = [
  "What are the core principles of ACT therapy?",
  "How can I practice mindfulness in daily life?",
  "What are some ACT exercises for dealing with anxiety?"
]

async function sendMessage() {
  if (!userMessage.value.trim()) return
  
  const message = userMessage.value
  chatHistory.value.push({ role: 'user', content: message })
  userMessage.value = ''
  isLoading.value = true

  try {
    const fullPrompt = `${systemInstructions}\n\nUser: ${message}`
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    chatHistory.value.push({ role: 'assistant', content: text })
  } catch (error) {
    console.error('Error:', error)
    chatHistory.value.push({ role: 'assistant', content: 'Sorry, there was an error processing your request.' })
  } finally {
    isLoading.value = false
  }
}

function sendExamplePrompt(prompt: string) {
  userMessage.value = prompt
  sendMessage()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sage-900 via-teal-900 to-sage-950 p-4">
    <div class="w-full max-w-2xl mx-auto">
      <h1 class="text-5xl font-extralight text-sage-100 mb-12 text-center tracking-widest">ACT app</h1>
      
      <div class="bg-sage-800/30 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 h-[400px] overflow-y-auto border border-sage-400/10">
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
      
      <div class="flex flex-col gap-8">
        <div class="flex flex-wrap gap-4 justify-center">
          <button 
            v-for="(prompt, index) in examplePrompts" 
            :key="index"
            @click="sendExamplePrompt(prompt)"
            :disabled="isLoading"
            class="px-6 py-3 bg-sage-600/10 text-sage-200 rounded-full border border-sage-400/20 
                   hover:bg-sage-500/20 hover:border-sage-400/30 disabled:opacity-50 text-sm 
                   transition-all duration-500 backdrop-blur-md shadow-lg shadow-sage-900/20"
          >
            {{ prompt }}
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