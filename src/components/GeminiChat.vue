<template>
  <div class="flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto">
    <!-- Header - Inspired by the EQUALIZER element -->
    <div class="w-full bg-yellow-500 border-4 border-black rounded-none shadow-lg mb-6">
      <div class="flex justify-between items-center px-4 py-2">
        <span class="font-bold text-2xl text-black">GEMINI CHAT</span>
        <div class="flex">
          <div class="h-6 w-6 bg-red-500 rounded-full border-2 border-black flex items-center justify-center text-black font-bold">×</div>
        </div>
      </div>
    </div>

    <!-- Input area - Inspired by the PASSWORD element -->
    <div class="w-full bg-red-400 border-4 border-black rounded-none shadow-lg mb-6">
      <div class="p-4">
        <div class="mb-2 font-bold text-black">PROMPT:</div>
        <input 
          v-model="prompt"
          class="w-full bg-yellow-100 border-2 border-black p-2 mb-3 shadow-inner focus:outline-none"
          placeholder="Enter your prompt"
        />
        
        <div class="flex justify-between">
          <button
            @click="reset"
            class="bg-blue-400 text-black font-bold py-1 px-4 border-2 border-black shadow hover:bg-blue-500"
          >
            RESET
          </button>
          <button 
            @click="sendPrompt"
            class="bg-yellow-400 text-black font-bold py-1 px-4 border-2 border-black shadow hover:bg-yellow-500"
          >
            SEND
          </button>
        </div>
        <div class="flex flex-col">
          <div
            @click="examplePrompt('Dealing with Anxiety')"
            class="bg-green-400 text-black font-bold py-1 px-4 border-2 border-black shadow hover:bg-green-500 mb-2 cursor-pointer"
          >
            Dealing with Anxiety
          </div>
          <div
            @click="examplePrompt('Overcoming Procrastination')"
            class="bg-green-400 text-black font-bold py-1 px-4 border-2 border-black shadow hover:bg-green-500 mb-2 cursor-pointer"
          >
            Overcoming Procrastination
          </div>
          <div
            @click="examplePrompt('Improving Relationships')"
            class="bg-green-400 text-black font-bold py-1 px-4 border-2 border-black shadow hover:bg-green-500 cursor-pointer"
          >
            Improving Relationships
          </div>
        </div>
      </div>
    </div>

    <!-- Messages area - Inspired by the SYSTEM and file tabs elements -->
    <div class="w-full bg-blue-300 border-4 border-black rounded-none shadow-lg mb-6">
      <div class="flex justify-between items-center px-4 py-2 bg-blue-400 border-b-2 border-black">
        <span class="font-bold text-black">SYSTEM</span>
        <div class="flex">
          <span class="h-6 w-6 mx-1 flex items-center justify-center">○</span>
          <span class="h-6 w-6 mx-1 flex items-center justify-center">_</span>
          <span class="h-6 w-6 mx-1 flex items-center justify-center">×</span>
        </div>
      </div>
      
      <div class="p-4 overflow-auto" style="max-height: 60vh;">
        <div v-for="(message, index) in messages.slice().reverse()" :key="index" class="bg-yellow-100 border-2 border-black mb-4 shadow">
          <div class="bg-gray-200 p-2 border-b-2 border-black">
            <span class="font-bold">PROMPT #{{ messages.length - index }}</span>
          </div>
          <div class="p-3">
            <p class="mb-2">{{ message.prompt }}</p>
            <div class="bg-gray-100 p-2 border-2 border-black">
              <p>{{ message.response }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-center p-2 border-t-2 border-black">
        <button class="bg-gray-300 px-6 py-1 border-2 border-black font-bold">OK</button>
      </div>
    </div>
    
    <!-- Audio player inspired element -->
    <div class="w-full bg-yellow-500 border-4 border-black rounded-none shadow-lg">
      <div class="p-2 flex justify-between items-center">
        <div class="bg-red-500 h-6 w-6 rounded-full border-2 border-black"></div>
        <div class="bg-yellow-300 h-6 w-6 rounded-full border-2 border-black"></div>
        <div class="bg-blue-400 h-6 w-6 rounded-full border-2 border-black"></div>
      </div>
      <div class="p-3 bg-yellow-100 border-t-2 border-black">
        <div class="w-full h-6 bg-yellow-200 border-2 border-black mb-3 flex items-center justify-center">
          <!-- Audio visualization -->
          <div class="w-4/5 h-2 bg-yellow-500 relative">
            <div v-for="n in 20" :key="n" 
              class="absolute bottom-0 bg-yellow-600" 
              :style="{ 
                height: `${Math.random() * 14 + 4}px`, 
                width: '3px', 
                left: `${(n-1) * 5}%` 
              }"
            ></div>
          </div>
        </div>
        <button class="w-full bg-blue-300 border-2 border-black py-1 font-bold">TURN ON</button>
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
      systemPrompt: "You are an ACT (Acceptance and Commitment Therapy) therapist specialist. Respond to the user's prompts with empathy, acceptance, and guidance, helping them to identify their values, accept their thoughts and feelings, and commit to actions that align with their values.",
    };
  },
  methods: {
    async sendPrompt() {
      if (!this.prompt.trim()) return;

      try {
        // Get the model
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Generate content
        const chat = model.startChat({
          history: [],
          generationConfig: {
            temperature: 0.7,
          },
          systemPrompt: this.systemPrompt,
        });

        const result = await chat.sendMessage(this.systemPrompt + "\n" + this.prompt);

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
    reset() {
      this.prompt = "";
      this.messages = [];
    },
    examplePrompt(topic) {
      switch (topic) {
        case "Dealing with Anxiety":
          this.prompt = "I'm feeling anxious about an upcoming presentation. How can ACT help me manage my anxiety?";
          break;
        case "Overcoming Procrastination":
          this.prompt = "I keep procrastinating on important tasks. What ACT techniques can I use to overcome procrastination?";
          break;
        case "Improving Relationships":
          this.prompt = "I'm having trouble communicating effectively in my relationships. How can ACT help me improve my communication skills and build stronger relationships?";
          break;
        default:
          this.prompt = "";
      }
      this.sendPrompt();
    },
  },
};
</script>

<style>
/* Add any additional CSS here */
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

/* Optional: Add a global retro font */
.font-retro {
  font-family: 'VT323', monospace;
}
</style>