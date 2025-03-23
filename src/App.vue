<template>
  <div class="flex justify-center items-center h-screen bg-gray-100" style="background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.05) 50%, transparent 50%, transparent 100%), linear-gradient(to right, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.05) 50%, transparent 50%, transparent 100%); background-size: 20px 20px;">
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
