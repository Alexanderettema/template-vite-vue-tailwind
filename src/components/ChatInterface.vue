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
  <div class="w-full max-w-2xl mx-auto p-4">
    <div class="bg-gray-800 rounded-lg shadow-lg p-4 mb-4 h-[400px] overflow-y-auto">
      <div v-for="(message, index) in chatHistory" :key="index" 
           :class="['mb-4', message.role === 'user' ? 'text-right' : 'text-left']">
        <div :class="['inline-block p-3 rounded-lg', 
                      message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white']">
          {{ message.content }}
        </div>
      </div>
      <div v-if="isLoading" class="text-white text-center">
        Thinking...
      </div>
    </div>
    
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <button 
          v-for="(prompt, index) in examplePrompts" 
          :key="index"
          @click="sendExamplePrompt(prompt)"
          :disabled="isLoading"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {{ prompt }}
        </button>
      </div>
      
      <div class="flex gap-2 items-center">
        <input 
          v-model="userMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your message..."
          class="flex-1 p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button 
          @click="sendMessage"
          :disabled="isLoading"
          class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style> 