<template>
  <div class="gemini-chat">
    <h1>GeminiChat</h1>
    <div class="chat-input">
      <input type="text" v-model="prompt" placeholder="Enter your prompt">
      <button @click="sendPrompt">Send</button>
    </div>
    <div v-if="response">
      <h2>Response:</h2>
      <p>{{ response }}</p>
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

<style scoped>
.gemini-chat {
  width: 500px;
  margin: 0 auto;
  border: 1px solid #ccc;
  padding: 20px;
}

.chat-input {
  margin-top: 10px;
}

.chat-input input {
  width: 70%;
  padding: 10px;
  border: 1px solid #ccc;
}

.chat-input button {
  width: 25%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}
</style>