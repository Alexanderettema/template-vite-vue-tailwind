<template>
  <div class="flex justify-center items-center h-screen bg-gradient-to-br from-pink-500 to-purple-500">
    <GeminiChat />
  </div>
</template>

<script>
import GeminiChat from './components/GeminiChat.vue';

export default {
  components: {
    GeminiChat
  }
}
</script>
