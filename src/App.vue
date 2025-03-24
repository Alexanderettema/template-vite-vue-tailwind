<script setup lang="ts">
import { ref } from 'vue'
import ChatInterface from './components/ChatInterface.vue'
import LandingPage from './components/LandingPage.vue'

const title = 'Vite template for Vue 3, TypeScript, and TailwindCSS'
const description = 'An open-source Vite template for Vue 3, TypeScript and TailwindCSS. Dark mode enabled, auto-import enabled, persistent localStorage enabled using Nano Stores'
const url = import.meta.env.VITE_BASE_URL
const imageURL = `${url}/og_image.png`
const author = 'Tri Le Minh'
const pubDate = (new Date()).toISOString()

useHead({
  meta: [
    {
      name: 'description',
      content: description,
    },
    {
      name: 'og:site_name',
      content: title,
    },
    {
      name: 'og:type',
      content: 'website',
    },
    {
      name: 'og:url',
      content: url,
    },
    {
      name: 'og:title',
      content: title,
    },
    {
      name: 'og:description',
      content: description,
    },
    {
      name: 'og:image',
      content: imageURL,
    },
    {
      name: 'og:image:alt',
      content: description,
    },
    {
      name: 'og:locale',
      content: 'en',
    },
    {
      name: 'twitter:site',
      content: '@ansidev',
    },
    {
      name: 'twitter:creator',
      content: '@ansidev',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:url',
      content: url,
    },
    {
      name: 'twitter:title',
      content: title,
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image:src',
      content: imageURL,
    },
    {
      name: 'robots',
      content: 'follow, index',
    },
    {
      name: 'author',
      content: author,
    },
    {
      name: 'article:published_time',
      content: pubDate,
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: url,
    }
  ]
})

const showChat = ref(false)

function startApp() {
  showChat.value = true
}

function goToHome() {
  showChat.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <div class="">
      <LandingPage v-if="!showChat" @start-app="startApp" />
      <ChatInterface v-else @go-to-home="goToHome" />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #111827;
}
</style>
