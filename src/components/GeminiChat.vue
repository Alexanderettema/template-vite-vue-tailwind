<template>
  <div class="flex flex-col items-center justify-center bg-gradient-to-br from-yellow-200 to-pink-200 rounded-xl shadow-lg p-6 w-96">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">GeminiChat</h1>
    <div class="flex w-full mb-4">
      <input v-model="prompt" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter your prompt">
      <button @click="sendPrompt" class="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Send</button>
    </div>
    <div v-if="response" class="bg-white shadow-md rounded-md p-4">
      <p class="text-gray-800">{{ response }}</p>
    </div>
  </div>
</template>

<script>
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAnGkMmVSqjXtA-glr372uaO_JZFobkSo0";
const MODEL_NAME = "gemini-2.0-flash";

// Initialize the API client
const genAI = new GoogleGenerativeAI(API_KEY);

export default {
  data() {
    return {
      prompt: "",
      response: null,
    };
  },
  methods: {
    async sendPrompt() {
      if (!this.prompt.trim()) return;
      
      try {
        // Get the model
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        // Generate content
        const result = await model.generateContent(this.prompt);
        
        // Get the response text
        this.response = result.response.text();
      } catch (error) {
        console.error("Error generating content:", error);
        this.response = "Error generating response: " + error.message;
      }
    },
  },
};
</script>