import { ref } from 'vue'

export function useTheme() {
  const darkMode = ref(false)

  // Initialize dark mode from localStorage
  if (typeof window !== 'undefined') {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode === 'true') {
      darkMode.value = true
    }
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    localStorage.setItem('darkMode', darkMode.value ? 'true' : 'false')
  }

  return {
    darkMode,
    toggleDarkMode
  }
} 