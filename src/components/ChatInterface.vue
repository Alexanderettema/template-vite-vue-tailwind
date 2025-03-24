<script setup lang="ts">
import { ref } from 'vue'
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyAnGkMmVSqjXtA-glr372uaO_JZFobkSo0'
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
    const result = await model.generateContent(message)
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
      
      <div class="flex gap-2">
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
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template> 