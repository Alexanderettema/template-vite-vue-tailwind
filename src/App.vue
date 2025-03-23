<template>
  <div class="flex justify-center items-center h-screen bg-gray-100" style="background-image: linear-gradient(to bottom, rgba(0, 0, 255, 0.1) 0%, rgba(0, 0, 255, 0.1) 1px, transparent 1px, transparent 100%), linear-gradient(to right, rgba(0, 0, 255, 0.1) 0%, rgba(0, 0, 255, 0.1) 1px, transparent 1px, transparent 100%); background-size: 10px 10px;">
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
