import { ref } from 'vue'
import { useAuth } from './useAuth'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(API_KEY)

// Define session types
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  essence?: string
  timestamp?: string // Add timestamp for duration calculations
}

export interface SessionSummary {
  id: string
  title: string
  date: string
  duration: number // in minutes
  keyThemes: string[]
  summary: string
  reflectiveQuestions: string[]
}

export interface TherapySession {
  id: string
  userId: string | null
  title: string
  date: string
  duration: number
  messages: ChatMessage[]
  insights: string[]
  summary?: SessionSummary
}

export function useSessionManagement() {
  const { user } = useAuth()
  const currentSession = ref<TherapySession | null>(null)
  const savedSessions = ref<TherapySession[]>([])
  const isLoading = ref(false)

  // Initialize a new session
  function startNewSession() {
    // Check if we have an existing session created in the last 10 seconds
    // This prevents duplicate sessions when navigating or component remounting
    if (currentSession.value) {
      const creationTime = new Date(currentSession.value.date).getTime();
      const now = new Date().getTime();
      const timeDiff = now - creationTime;
      
      // If session was created less than 10 seconds ago, return the existing session
      if (timeDiff < 10000) {
        return currentSession.value.id;
      }
    }
    
    const sessionId = generateSessionId()
    currentSession.value = {
      id: sessionId,
      userId: user.value?.id || null,
      title: "Nieuwe sessie",
      date: new Date().toISOString(),
      duration: 0,
      messages: [],
      insights: []
    }

    return sessionId
  }

  // Generate a unique session ID
  function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }

  // Save current session
  async function saveCurrentSession() {
    if (!currentSession.value) return null

    try {
      isLoading.value = true
      
      // Generate a session summary if it doesn't exist
      if (!currentSession.value.summary) {
        await generateSessionSummary()
      }
      
      // Store in localStorage
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      
      // Check if session already exists to update it
      const existingSessionIndex = sessions.findIndex((s: TherapySession) => 
        s.id === currentSession.value?.id
      )
      
      if (existingSessionIndex >= 0) {
        sessions[existingSessionIndex] = currentSession.value
      } else {
        sessions.push(currentSession.value)
      }
      
      localStorage.setItem('actTherapySessions', JSON.stringify(sessions))
      
      // Correctly filter sessions for the current user
      if (user.value?.id) {
        savedSessions.value = sessions.filter((s: TherapySession) => 
          s.userId === user.value?.id || s.userId === null
        )
      } else {
        savedSessions.value = sessions.filter((s: TherapySession) => s.userId === null)
      }
      
      return currentSession.value.id
    } catch (error) {
      console.error('Error saving session:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Load saved sessions
  function loadSavedSessions() {
    try {
      isLoading.value = true
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      
      // Filter sessions by current user if logged in
      if (user.value?.id) {
        savedSessions.value = sessions.filter((s: TherapySession) => 
          s.userId === user.value?.id || s.userId === null
        )
      } else {
        // For non-logged in users, only show anonymous sessions
        savedSessions.value = sessions.filter((s: TherapySession) => s.userId === null)
      }
      
      return savedSessions.value
    } catch (error) {
      console.error('Error loading sessions:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Load a specific session
  function loadSession(sessionId: string) {
    try {
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      const session = sessions.find((s: TherapySession) => s.id === sessionId)
      
      if (session) {
        currentSession.value = session
        return session
      }
      
      return null
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  // Update the current session with new messages
  function updateSessionMessages(messages: ChatMessage[]) {
    if (!currentSession.value) return

    currentSession.value.messages = [...messages]
    currentSession.value.duration = calculateSessionDuration()
  }

  // Add an insight to the current session
  function addSessionInsight(insight: string) {
    if (!currentSession.value) return
    
    if (!currentSession.value.insights.includes(insight)) {
      currentSession.value.insights.push(insight)
    }
  }

  // Calculate session duration in minutes
  function calculateSessionDuration() {
    if (!currentSession.value) return 0
    
    const startDate = new Date(currentSession.value.date)
    const now = new Date()
    
    return Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60))
  }

  // Generate a session summary using AI
  async function generateSessionSummary() {
    if (!currentSession.value || currentSession.value.messages.length === 0) return
    
    try {
      // Extract the full conversation
      const conversation = currentSession.value.messages.map(msg => 
        `${msg.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${msg.content}`
      ).join('\n\n')
      
      // Use Gemini API to create a real summary regardless of conversation length
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      // Create different prompts based on conversation length
      let summaryPrompt = ''
      if (currentSession.value.messages.length >= 2) {
        summaryPrompt = `
        Maak een korte, betekenisvolle samenvatting (maximaal 2 zinnen) van deze ACT-therapie conversatie. 
        Focus op de kernthema's en inzichten die aan bod kwamen.
        
        Conversatie:
        ${conversation}
        
        Samenvatting:
        `
      } else {
        // Special prompt for very short conversations (1 or 0 messages)
        const userMessage = currentSession.value.messages.find(m => m.role === 'user')
        if (userMessage) {
          summaryPrompt = `
          Maak een korte, betekenisvolle samenvatting (maximaal 2 zinnen) van deze korte ACT-therapie vraag. 
          Focus op het thema van de vraag en mogelijke ACT-relevantie.
          
          Vraag van gebruiker:
          ${userMessage.content}
          
          Samenvatting:
          `
        } else {
          // In case there is somehow no user message
          summaryPrompt = `
          Maak een korte, betekenisvolle samenvatting voor het begin van een ACT-therapie sessie.
          
          Samenvatting:
          `
        }
      }
      
      // Generate the summary with AI
      const result = await model.generateContent(summaryPrompt)
      const response = await result.response
      const summaryText = response.text().trim()
      
      // Extract unique themes from the conversation
      const uniqueThemes = extractThemesFromConversation(conversation)
      
      // Generate personalized reflective questions
      const reflectiveQuestions = await generateReflectiveQuestions(conversation, uniqueThemes)
      
      // Create session summary
      currentSession.value.summary = {
        id: currentSession.value.id,
        title: generateMeaningfulTitle(conversation, uniqueThemes),
        date: currentSession.value.date,
        duration: calculateSessionDuration(),
        keyThemes: uniqueThemes,
        summary: summaryText,
        reflectiveQuestions: reflectiveQuestions
      }
      
      // Update title
      if (currentSession.value.summary) {
        currentSession.value.title = currentSession.value.summary.title
      }
      
      return currentSession.value.summary
    } catch (error) {
      console.error('Error generating session summary:', error)
      // Create a simple summary as fallback in case of error
      const fallbackSummary = {
        id: currentSession.value.id,
        title: "ACT Sessie " + new Date().toLocaleDateString('nl-NL'),
        date: currentSession.value.date,
        duration: calculateSessionDuration(),
        keyThemes: [],
        summary: "Deze sessie onderzocht ACT-therapie concepten en persoonlijke reflecties.",
        reflectiveQuestions: getDefaultReflectiveQuestions()
      }
      
      currentSession.value.summary = fallbackSummary
      currentSession.value.title = fallbackSummary.title
      
      return fallbackSummary
    }
  }

  // Helper function to extract themes from conversation
  function extractThemesFromConversation(conversation: string) {
    // Analyze the conversation to identify themes
    const actThemes = [
      'acceptatie', 'waarden', 'commitment', 'zelf', 'defusie', 
      'mindfulness', 'actie', 'perspectief', 'zelfcompassie', 
      'flexibiliteit', 'emoties', 'gedachten', 'bewustzijn'
    ]
    
    // Simple frequency analysis
    const themeCounts: Record<string, number> = {}
    
    actThemes.forEach(theme => {
      const regex = new RegExp(`\\b${theme}\\b`, 'gi')
      const matches = conversation.match(regex) || []
      themeCounts[theme] = matches.length
    })
    
    // Sort by frequency and take the top 5
    return Object.entries(themeCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .slice(0, 5)
      .map(([theme, _]) => theme)
  }

  // Function to generate a meaningful title based on conversation content
  function generateMeaningfulTitle(conversation: string, themes: string[]) {
    if (themes.length >= 2) {
      return `${themes[0].charAt(0).toUpperCase() + themes[0].slice(1)} & ${themes[1]}`
    } else if (themes.length === 1) {
      return `${themes[0].charAt(0).toUpperCase() + themes[0].slice(1)} Verkenning`
    } else {
      // If no themes, create a title based on the first question
      const lines = conversation.split('\n\n')
      const firstUserMessage = lines.find(line => line.startsWith('Gebruiker:'))
      if (firstUserMessage) {
        const topic = firstUserMessage.substring(11, 30).trim()
        return `Verkenning: ${topic}...`
      }
      return "ACT Sessie " + new Date().toLocaleDateString('nl-NL')
    }
  }

  // Function to get default reflective questions
  function getDefaultReflectiveQuestions() {
    const defaultQuestions = [
      "Hoe kun je vandaag één kleine stap zetten richting wat echt belangrijk voor je is?",
      "Welke gedachten of gevoelens zijn moeilijk om te accepteren?",
      "Wat zou een vriendelijke manier zijn om jezelf te benaderen wanneer je vastzit?"
    ]
    
    // Add a time-specific question for more variety
    const now = new Date()
    const timeBasedQuestions = [
      `Wat is één ding waar je vandaag (${now.getDate()} ${now.toLocaleString('nl-NL', {month: 'long'})}) dankbaar voor bent?`,
      `Hoe zou je beste zelf omgaan met de uitdagingen van vandaag?`,
      `Wat is één waarde die je deze week belangrijk vindt om te leven?`
    ]
    
    const selectedQuestions = [...defaultQuestions]
    selectedQuestions.push(timeBasedQuestions[now.getMinutes() % timeBasedQuestions.length])
    
    // Choose 3 unique questions
    return selectedQuestions.slice(0, 3)
  }

  // Function to generate personalized reflective questions
  async function generateReflectiveQuestions(conversation: string, themes: string[]) {
    let questions: string[] = []
    
    // Try to generate questions using AI for a more personalized approach
    try {
      if (conversation.length > 100) { // Only use AI if there's sufficient conversation
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        const prompt = `
        Genereer 3 reflectievragen op basis van deze ACT-therapie conversatie. 
        De vragen moeten:
        1. Direct verband houden met de inhoud van het gesprek
        2. Gericht zijn op verdere zelfreflectie
        3. In het Nederlands zijn
        4. Kort en krachtig zijn (maximaal 15 woorden per vraag)
        5. Aansluiten bij ACT-principes
        
        Conversatie:
        ${conversation.substring(0, 2000)} ${conversation.length > 2000 ? '...' : ''}
        
        Formatteer als een lijst van exact 3 vragen, één per regel.
        `
        
        const result = await model.generateContent(prompt)
        const response = await result.response
        const generatedText = response.text().trim()
        
        // Extract questions from the response
        questions = generatedText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.endsWith('?') || line.length > 10)
          .slice(0, 3)
      }
    } catch (error) {
      console.error('Error generating reflective questions:', error)
    }
    
    // If AI generation failed or produced insufficient questions, fall back to theme-based questions
    if (questions.length < 3) {
      // Theme-specific questions
      if (themes.includes('waarden') || themes.includes('commitment')) {
        questions.push("Welke kleine actie kun je nemen die in lijn is met je waarden?")
      }
      
      if (themes.includes('acceptatie') || themes.includes('mindfulness')) {
        questions.push("Welk moeilijk gevoel kun je vandaag met meer zachtheid observeren?")
      }
      
      if (themes.includes('zelf') || themes.includes('perspectief')) {
        questions.push("Hoe zou je situatie eruit zien als je het vanuit een afstand kon bekijken?")
      }
      
      if (themes.includes('defusie') || themes.includes('gedachten')) {
        questions.push("Welke gedachte kun je vandaag wat losser vasthouden?")
      }
      
      // General questions for fallback
      const generalQuestions = [
        "Hoe kun je vandaag één kleine stap zetten richting wat echt belangrijk voor je is?",
        "Welke gedachten of gevoelens zijn moeilijk om te accepteren?",
        "Wat zou een vriendelijke manier zijn om jezelf te benaderen wanneer je vastzit?",
        "Hoe kan mindfulness je helpen bij de uitdagingen die je nu ervaart?",
        "Welke waarde zou je vandaag meer aandacht willen geven in je leven?"
      ]
      
      // Add time-specific questions for more variety and uniqueness
      const now = new Date()
      const timeBasedQuestions = [
        `Wat is één ding waar je vandaag (${now.getDate()} ${now.toLocaleString('nl-NL', {month: 'long'})}) dankbaar voor bent?`,
        `Hoe zou je beste zelf omgaan met de uitdagingen van vandaag?`,
        `Wat is één waarde die je deze week belangrijk vindt om te leven?`
      ]
      
      // Ensure we have at least one time-specific question
      const timeQuestion = timeBasedQuestions[now.getMinutes() % timeBasedQuestions.length]
      if (!questions.includes(timeQuestion)) {
        questions.push(timeQuestion)
      }
      
      // Fill up to 3 unique questions
      while (questions.length < 3) {
        const randomIndex = Math.floor(Math.random() * generalQuestions.length)
        const question = generalQuestions[randomIndex]
        
        if (!questions.includes(question)) {
          questions.push(question)
          generalQuestions.splice(randomIndex, 1)
        }
      }
    }
    
    return questions
  }

  // Delete a session
  function deleteSession(sessionId: string) {
    try {
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      const updatedSessions = sessions.filter((s: TherapySession) => s.id !== sessionId)
      
      localStorage.setItem('actTherapySessions', JSON.stringify(updatedSessions))
      savedSessions.value = savedSessions.value.filter(s => s.id !== sessionId)
      
      // Reset current session if it's the one being deleted
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
      }
      
      return true
    } catch (error) {
      console.error('Error deleting session:', error)
      return false
    }
  }

  return {
    currentSession,
    savedSessions,
    isLoading,
    startNewSession,
    saveCurrentSession,
    loadSavedSessions,
    loadSession,
    updateSessionMessages,
    addSessionInsight,
    generateSessionSummary,
    deleteSession,
    // Add function to delete all sessions
    deleteAllSessions() {
      try {
        // Clear sessions from localStorage
        localStorage.removeItem('actTherapySessions')
        
        // Clear the sessions array in memory
        savedSessions.value = []
        
        // Reset current session if there is one
        currentSession.value = null
        
        return true
      } catch (error) {
        console.error('Error deleting all sessions:', error)
        return false
      }
    }
  }
} 