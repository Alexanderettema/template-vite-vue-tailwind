<template>
  <div class="flex flex-col items-center justify-center rounded-xl shadow-lg p-6 w-full md:w-2/3 border-4 border-gray-400 bg-yellow-50">
    <h1 class="text-3xl font-bold text-gray-800 mb-4 retro-font">GeminiChat</h1>
    <div class="flex w-full mb-4">
      <input v-model="prompt" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-yellow-100" placeholder="Enter your prompt">
      <button @click="sendPrompt" class="ml-2 bg-blue-400 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded shadow focus:outline-none focus:shadow-outline">Send</button>
    </div>
    <div class="overflow-auto" style="max-height: 60vh;">
      <div v-for="(message, index) in messages.slice().reverse()" :key="index" class="bg-yellow-100 shadow-md rounded-md p-4 mb-2 w-full border border-gray-300">
        <p class="text-gray-600 font-bold">Prompt:</p>
        <p class="text-gray-800">{{ message.prompt }}</p>
        <p class="text-gray-600 font-bold mt-2">Response:</p>
        <p class="text-gray-800">{{ message.response }}</p>
      </div>
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
      messages: [],
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
        const responseText = result.response.text();

        this.messages.push({
          prompt: this.prompt,
          response: responseText,
        });

        this.prompt = "";
      } catch (error) {
        console.error("Error generating content:", error);
        this.messages.push({
          prompt: this.prompt,
          response: "Error generating response: " + error.message,
        });
        this.prompt = "";
      }
    },
  },
};
</script>