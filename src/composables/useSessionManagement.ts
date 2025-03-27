import { ref } from 'vue'
import { useAuth } from './useAuth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

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
  async function startNewSession() {
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

    // If user is logged in, create an empty session record in Supabase
    if (user.value?.id) {
      try {
        await supabase.from('sessions').insert({
          id: sessionId,
          user_id: user.value.id,
          title: "Nieuwe sessie",
          created_at: new Date().toISOString(),
          duration: 0,
          insights: [],
          summary: null
        })
      } catch (error) {
        console.error('Error creating initial session in Supabase:', error)
        // Continue even if this fails - we'll retry on first save
      }
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

    // Don't save sessions without any user input
    const hasUserInput = currentSession.value.messages.some(msg => msg.role === 'user')
    if (!hasUserInput) return null

    try {
      isLoading.value = true
      
      // Generate a session summary if it doesn't exist and we have enough messages
      if (!currentSession.value.summary && currentSession.value.messages.length >= 2) {
        await generateSessionSummary()
      }
      
      // Update duration before saving
      currentSession.value.duration = calculateSessionDuration()
      
      let savedSessionId = null
      
      // If user is logged in, save to Supabase
      if (user.value?.id) {
        savedSessionId = await saveToSupabase(currentSession.value)
      }
      
      // Always save to localStorage as backup and for anonymous users
      savedSessionId = await saveToLocalStorage(currentSession.value)
      
      // Reload saved sessions to update the list
      await loadSavedSessions()
      
      console.log("Saved current session:", {
        id: savedSessionId,
        title: currentSession.value.title,
        messageCount: currentSession.value.messages.length,
        storage: user.value?.id ? 'Supabase + localStorage' : 'localStorage'
      })
      
      return savedSessionId
    } catch (error) {
      console.error('Error saving session:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Helper function to save session to Supabase
  async function saveToSupabase(session: TherapySession) {
    try {
      // Check if session already exists in Supabase
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', session.id)
        .single()
      
      // Prepare session data for Supabase
      const sessionData = {
        id: session.id,
        user_id: user.value!.id,
        title: session.title,
        created_at: session.date,
        duration: session.duration,
        insights: session.insights,
        summary: session.summary ? JSON.stringify(session.summary) : null,
      }
      
      if (existingSession) {
        // Update existing session
        await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', session.id)
      } else {
        // Insert new session
        await supabase
          .from('sessions')
          .insert(sessionData)
      }
      
      // Save or update messages
      for (const message of session.messages) {
        // Ensure timestamp exists
        const timestamp = message.timestamp || new Date().toISOString()
        
        // Check if message exists by comparing content and timestamp
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('session_id', session.id)
          .eq('content', message.content)
          .eq('role', message.role)
        
        const messageData = {
          session_id: session.id,
          role: message.role,
          content: message.content,
          essence: message.essence || '',
          timestamp: timestamp
        }
        
        if (messages && messages.length > 0) {
          // Update existing message
          await supabase
            .from('messages')
            .update(messageData)
            .eq('id', messages[0].id)
        } else {
          // Insert new message
          await supabase
            .from('messages')
            .insert(messageData)
        }
      }
      
      return session.id
    } catch (error) {
      console.error('Error saving to Supabase:', error)
      // Fallback to localStorage if Supabase fails
      return await saveToLocalStorage(session)
    }
  }

  // Helper function to save session to localStorage
  async function saveToLocalStorage(session: TherapySession) {
    try {
      // Get existing sessions
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      
      // Check if session already exists
      const existingIndex = sessions.findIndex((s: TherapySession) => s.id === session.id)
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session
      } else {
        sessions.push(session)
      }
      
      // Save back to localStorage
      localStorage.setItem('actTherapySessions', JSON.stringify(sessions))
      
      // Update savedSessions for anonymous users
      if (!user.value?.id) {
        savedSessions.value = sessions.filter((s: TherapySession) => s.userId === null)
      }
      
      console.log("Saved session to localStorage:", {
        id: session.id,
        title: session.title,
        messageCount: session.messages.length
      })
      
      return session.id
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      return null
    }
  }

  // Load saved sessions
  async function loadSavedSessions() {
    try {
      isLoading.value = true
      let loadedSessions = [];
      
      if (user.value?.id) {
        // Load from Supabase for logged-in users
        loadedSessions = await loadFromSupabase()
      } else {
        // Load from localStorage for anonymous users
        loadedSessions = loadFromLocalStorage()
      }
      
      // Ensure we're updating the reactive ref with a new array
      savedSessions.value = loadedSessions.filter(Boolean) // Filter out any null/undefined sessions
      
      console.log("Loaded sessions:", {
        count: savedSessions.value.length,
        source: user.value?.id ? 'Supabase' : 'localStorage',
        sessions: savedSessions.value.map(s => ({
          id: s.id,
          title: s.title,
          messageCount: s.messages.length
        }))
      })
      
      return savedSessions.value
    } catch (error) {
      console.error('Error loading sessions:', error)
      savedSessions.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Helper function to load sessions from Supabase
  async function loadFromSupabase() {
    try {
      // Get sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.value!.id)
        .order('created_at', { ascending: false })
      
      if (sessionError) throw sessionError
      
      // Map sessions to our format
      const sessions: TherapySession[] = []
      
      for (const session of sessionData) {
        // Get messages for each session
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true })
        
        if (messagesError) throw messagesError
        
        // Parse the summary if it's a string, otherwise use as-is
        let parsedSummary = undefined
        if (session.summary) {
          try {
            // Check if it's already an object or needs parsing
            parsedSummary = typeof session.summary === 'string' 
              ? JSON.parse(session.summary) 
              : session.summary
          } catch (e) {
            console.error('Error parsing summary:', e)
          }
        }
        
        // Format session
        const therapySession: TherapySession = {
          id: session.id,
          userId: session.user_id,
          title: session.title,
          date: session.created_at,
          duration: session.duration,
          insights: session.insights || [],
          messages: messagesData.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            essence: msg.essence,
            timestamp: msg.timestamp,
            displayFull: true
          })),
          summary: parsedSummary
        }
        
        sessions.push(therapySession)
      }
      
      return sessions
    } catch (error) {
      console.error('Error loading from Supabase:', error)
      // Fallback to localStorage if Supabase fails
      return loadFromLocalStorage()
    }
  }

  // Helper function to load sessions from localStorage
  function loadFromLocalStorage() {
    try {
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      
      // For non-logged in users, only show anonymous sessions
      return sessions.filter((s: TherapySession) => s.userId === null)
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      return []
    }
  }

  // Load a specific session
  async function loadSession(sessionId: string) {
    try {
      if (user.value?.id) {
        // Load from Supabase for logged-in users
        return await loadSessionFromSupabase(sessionId)
      } else {
        // Load from localStorage for anonymous users
        return loadSessionFromLocalStorage(sessionId)
      }
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  // Helper function to load a session from Supabase
  async function loadSessionFromSupabase(sessionId: string) {
    try {
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sessionError) throw sessionError
      
      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
      
      if (messagesError) throw messagesError
      
      // Parse the summary if it's a string, otherwise use as-is
      let parsedSummary = undefined
      if (session.summary) {
        try {
          // Check if it's already an object or needs parsing
          parsedSummary = typeof session.summary === 'string' 
            ? JSON.parse(session.summary) 
            : session.summary
        } catch (e) {
          console.error('Error parsing summary:', e)
        }
      }
      
      // Format session
      const therapySession: TherapySession = {
        id: session.id,
        userId: session.user_id,
        title: session.title,
        date: session.created_at,
        duration: session.duration,
        insights: session.insights || [],
        messages: messagesData.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          essence: msg.essence,
          timestamp: msg.timestamp,
          displayFull: true
        })),
        summary: parsedSummary
      }
      
      currentSession.value = therapySession
      return therapySession
    } catch (error) {
      console.error('Error loading session from Supabase:', error)
      // Fallback to localStorage if Supabase fails
      return loadSessionFromLocalStorage(sessionId)
    }
  }

  // Helper function to load a session from localStorage
  function loadSessionFromLocalStorage(sessionId: string) {
    try {
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      const session = sessions.find((s: TherapySession) => s.id === sessionId)
      
      if (session) {
        currentSession.value = session
        return session
      }
      
      return null
    } catch (error) {
      console.error('Error loading session from localStorage:', error)
      return null
    }
  }

  // Delete a session
  async function deleteSession(sessionId: string) {
    try {
      if (user.value?.id) {
        // Delete from Supabase for logged-in users
        await deleteSessionFromSupabase(sessionId)
      } else {
        // Delete from localStorage for anonymous users
        deleteSessionFromLocalStorage(sessionId)
      }
      
      // Remove from current session if it's the one being deleted
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
      }
      
      // Remove from saved sessions list
      savedSessions.value = savedSessions.value.filter(s => s.id !== sessionId)
      
      return true
    } catch (error) {
      console.error('Error deleting session:', error)
      return false
    }
  }

  // Helper function to delete a session from Supabase
  async function deleteSessionFromSupabase(sessionId: string) {
    try {
      // Delete messages first (due to foreign key constraints)
      await supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId)
      
      // Then delete the session
      await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.value!.id)
      
      return true
    } catch (error) {
      console.error('Error deleting session from Supabase:', error)
      // Fallback to localStorage if Supabase fails
      return deleteSessionFromLocalStorage(sessionId)
    }
  }

  // Helper function to delete a session from localStorage
  function deleteSessionFromLocalStorage(sessionId: string) {
    try {
      const sessions = JSON.parse(localStorage.getItem('actTherapySessions') || '[]')
      const filteredSessions = sessions.filter((s: TherapySession) => s.id !== sessionId)
      localStorage.setItem('actTherapySessions', JSON.stringify(filteredSessions))
      return true
    } catch (error) {
      console.error('Error deleting session from localStorage:', error)
      return false
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

  // Generate a summary for the current session
  async function generateSessionSummary() {
    if (!currentSession.value) return null
    
    // Don't generate summary for sessions without any user input
    if (!currentSession.value.messages.some(msg => msg.role === 'user')) {
      return null
    }
    
    try {
      // Extract the conversation
      const conversation = currentSession.value.messages
        .map(msg => `${msg.role === 'user' ? 'CLIENT' : 'THERAPEUT'}: ${msg.content}`)
        .join('\n\n')
      
      // Choose prompt based on conversation length
      let prompt = ""
      if (conversation.length > 8000) {
        // For very long conversations, use a more concise prompt
        prompt = `Maak een beknopte samenvatting van deze ACT therapiesessie, met nadruk op de belangrijkste thema's, inzichten, besproken uitdagingen en therapeutische vooruitgang. Focus op specifieke client-issues, niet op algemene beschrijvingen.\n\n${conversation}`
      } else {
        // For shorter conversations, use a more detailed prompt
        prompt = `Dit is een ACT (Acceptance and Commitment Therapy) therapiesessie gesprek. 
Maak een gedetailleerde samenvatting (maximaal 250 woorden) van dit gesprek die het volgende belicht:
1. De kernuitdagingen, zorgen of worstelingen die de client heeft gedeeld
2. Belangrijke ACT-concepten die in het gesprek aanwezig waren (bijv. cognitieve fusie, experiëntiële vermijding, waardenverduidelijking)
3. Specifieke inzichten of momenten van helderheid die de client heeft ervaren
4. Eventuele toezeggingen, oefeningen of praktijken waar de client mee heeft ingestemd

Wees concreet en specifiek voor de situatie van deze client - vermijd algemene therapeutische uitspraken.
Verzin geen details die niet zijn besproken. Als iets niet duidelijk is uit het gesprek, neem het dan niet op.

GESPREK:
${conversation}`
      }
      
      // Generate summary with Gemini AI
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const summaryText = result.response.text().trim()
      
      // Extract themes
      const themes = await extractThemes(conversation)
      
      // Generate reflective questions
      const reflectiveQuestions = await generateReflectiveQuestions(conversation, themes)
      
      // Create a meaningful title
      const title = await generateMeaningfulTitle(summaryText, conversation)
      
      // Create and store the summary
      const summary: SessionSummary = {
        id: currentSession.value.id,
        title: title,
        date: currentSession.value.date,
        duration: calculateSessionDuration(),
        keyThemes: themes,
        summary: summaryText,
        reflectiveQuestions: reflectiveQuestions
      }
      
      // Update the session
      currentSession.value.summary = summary
      currentSession.value.title = title
      
      return summary
    } catch (error) {
      console.error('Error generating summary:', error)
      
      // Create a fallback summary
      const fallbackSummary: SessionSummary = {
        id: currentSession.value.id,
        title: generateFallbackTitle(),
        date: currentSession.value.date,
        duration: calculateSessionDuration(),
        keyThemes: [],
        summary: "Er kon geen samenvatting worden gegenereerd voor deze sessie.",
        reflectiveQuestions: []
      }
      
      // Update the session with fallback
      currentSession.value.summary = fallbackSummary
      currentSession.value.title = fallbackSummary.title
      
      return fallbackSummary
    }
  }
  
  // Extract unique themes from the conversation
  async function extractThemes(conversation: string) {
    try {
      const actThemes = [
        "Acceptatie", "Waarden", "Toegewijd handelen", "Zelf als context", 
        "Cognitieve defusie", "Mindfulness", "Experiëntiële vermijding", 
        "Psychologische flexibiliteit", "Hier en nu", "Perspectief nemen", 
        "Zelfcompassie", "Emotieregulatie", "Gedragsverandering"
      ]
      
      const prompt = `Analyseer deze ACT therapie conversatie en bepaal de 2-4 belangrijkste ACT-gerelateerde thema's die aan bod kwamen. 
Kies uit deze lijst: ${actThemes.join(", ")}

Probeer zo precies mogelijk te zijn in je evaluatie - lees en begrijp de conversatie zorgvuldig.
Geef je antwoord als een eenvoudige lijst met alleen de thema's, gescheiden door komma's, zonder extra tekst, uitleg of inleiding.

CONVERSATIE:
${conversation}`
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const themesText = result.response.text().trim()
      
      // Split by commas and clean up
      let themesList = themesText.split(/,\s*/).map(theme => theme.trim())
      
      // Ensure we have no more than 4 themes
      themesList = themesList.slice(0, 4)
      
      return themesList
    } catch (error) {
      console.error('Error extracting themes:', error)
      return []
    }
  }
  
  // Generate reflective questions based on the conversation
  async function generateReflectiveQuestions(conversation: string, themes: string[]) {
    try {
      const prompt = `Gebaseerd op deze ACT therapie conversatie, genereer 3 doordachte, reflectieve vragen die de cliënt kunnen helpen om 
dieper na te denken over de besproken onderwerpen. Deze vragen moeten specifiek betrekking hebben op wat de cliënt heeft gedeeld, 
en gebaseerd zijn op ACT-principes, in het bijzonder: ${themes.join(", ")}.

Zorg ervoor dat de vragen:
- Geen ja/nee-antwoorden uitlokken
- Aanzetten tot verdere reflectie of verkenning
- Specifiek zijn voor deze cliënt (niet algemeen)
- In de eerste persoon geschreven zijn (bijv. "Hoe kan ik..." in plaats van "Hoe kan de cliënt...")

Geef je antwoord als een lijst met slechts de 3 vragen, één per regel, zonder nummering of extra tekst.

CONVERSATIE:
${conversation}`
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const questionsText = result.response.text().trim()
      
      // Split by newlines
      let questions = questionsText.split(/\n+/).map(q => q.trim()).filter(q => q.length > 0)
      
      // Ensure we have exactly 3 questions
      questions = questions.slice(0, 3)
      while (questions.length < 3) {
        questions.push("Hoe kan ik het geleerde toepassen in mijn dagelijks leven?")
      }
      
      return questions
    } catch (error) {
      console.error('Error generating reflective questions:', error)
      return [
        "Wat neem ik uit deze sessie mee?",
        "Hoe kan ik het geleerde toepassen in mijn dagelijks leven?",
        "Wat zou mijn volgende stap kunnen zijn?"
      ]
    }
  }
  
  // Generate a meaningful title based on the conversation
  async function generateMeaningfulTitle(summary: string, conversation: string) {
    try {
      const prompt = `Genereer een korte, betekenisvolle titel (maximaal 5 woorden) voor deze ACT therapie sessie gebaseerd op de samenvatting en oorspronkelijke conversatie. 
De titel moet:
- Kort en krachtig zijn (maximaal 5 woorden)
- De essentie of het hoofdthema van het gesprek vatten
- Niet te algemeen zijn (niet simpelweg "ACT Sessie" of "Therapiegesprek")
- Bij voorkeur een belangrijk ACT-concept of inzicht bevatten
- Geen aanhalingstekens of andere opmaak bevatten

Geef alleen de titel als antwoord, zonder inleiding of uitleg.

SAMENVATTING:
${summary}

CONVERSATIE (indien nodig om context te begrijpen):
${conversation.substring(0, 5000)}`
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      let title = result.response.text().trim()
      
      // Remove quotes if present
      title = title.replace(/^["'](.*)["']$/, '$1').trim()
      
      if (title.length > 30) {
        title = title.substring(0, 30) + "..."
      }
      
      return title
    } catch (error) {
      console.error('Error generating title:', error)
      return generateFallbackTitle()
    }
  }
  
  // Generate a fallback title if AI title generation fails
  function generateFallbackTitle() {
    const extractTitleFromUserMessages = () => {
      if (!currentSession.value || currentSession.value.messages.length === 0) {
        return null
      }
      
      // Try to find the first substantive user message
      const userMessages = currentSession.value.messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
      
      if (userMessages.length > 0) {
        const firstMessage = userMessages[0]
        
        // If message is short enough, use it directly
        if (firstMessage.length <= 30) {
          return firstMessage
        }
        
        // Otherwise, take the first sentence or fragment
        const firstSentence = firstMessage.split(/[.!?]/).filter(s => s.trim().length > 0)[0]
        if (firstSentence && firstSentence.length <= 35) {
          return firstSentence
        }
        
        // Last resort: first few words
        return firstMessage.split(' ').slice(0, 5).join(' ') + '...'
      }
      
      return null
    }
    
    // Try to extract from messages
    const messageTitle = extractTitleFromUserMessages()
    if (messageTitle) {
      return messageTitle
    }
    
    // Fall back to date
    const date = currentSession.value ? new Date(currentSession.value.date) : new Date()
    const formattedDate = date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `Gesprek op ${formattedDate}`
  }

  // Add function to delete all sessions
  async function deleteAllSessions() {
    try {
      if (user.value?.id) {
        // For logged-in users, delete all sessions from Supabase
        // First get all user's sessions
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.value.id)
        
        if (sessions && sessions.length > 0) {
          // Delete all messages for these sessions
          const sessionIds = sessions.map(s => s.id)
          await supabase
            .from('messages')
            .delete()
            .in('session_id', sessionIds)
          
          // Then delete all sessions
          await supabase
            .from('sessions')
            .delete()
            .eq('user_id', user.value.id)
        }
      } else {
        // For anonymous users, clear localStorage
        localStorage.removeItem('actTherapySessions')
      }
      
      // Clear in-memory sessions
      savedSessions.value = []
      currentSession.value = null
      
      return true
    } catch (error) {
      console.error('Error deleting all sessions:', error)
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
    deleteSession,
    updateSessionMessages,
    addSessionInsight,
    generateSessionSummary,
    calculateSessionDuration,
    deleteAllSessions
  }
} 