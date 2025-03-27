import { ref, watch } from 'vue'
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
  const isInitialized = ref(false)

  // Watch for user auth state changes
  watch(() => user.value?.id, async (newUserId, oldUserId) => {
    console.log("Auth state changed:", { newUserId, oldUserId })
    
    if (newUserId) {
      // User just logged in
      if (!isInitialized.value) {
        console.log("Initializing session management for user:", newUserId)
        await loadSavedSessions()
        isInitialized.value = true
      }
    } else {
      // User logged out
      console.log("Clearing session data due to logout")
      currentSession.value = null
      savedSessions.value = []
      isInitialized.value = false
    }
  }, { immediate: true })

  // Generate a unique session ID
  function generateSessionId() {
    // Generate a UUID v4
    return crypto.randomUUID()
  }

  // Initialize a new session
  async function startNewSession() {
    // Wait a moment for auth state to stabilize if needed
    if (!isInitialized.value) {
      console.log("Waiting for session management to initialize...")
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!user.value?.id) {
      console.error('Cannot start session: User not logged in')
      return null
    }

    // Check if we have an existing session created in the last 10 seconds
    if (currentSession.value) {
      const creationTime = new Date(currentSession.value.date).getTime()
      const now = new Date().getTime()
      const timeDiff = now - creationTime
      
      if (timeDiff < 10000) {
        return currentSession.value.id
      }
    }
    
    const sessionId = generateSessionId()
    const now = new Date().toISOString()
    
    try {
      // First create the session in Supabase
      const { error: insertError } = await supabase.from('sessions').insert({
        id: sessionId,
        user_id: user.value.id,
        title: "Nieuwe sessie",
        created_at: now,
        duration: 0,
        insights: [],
        summary: null,
        is_archived: false
      })

      if (insertError) {
        console.error('Error creating session in Supabase:', insertError)
        return null
      }

      // Then set it as current session
      currentSession.value = {
        id: sessionId,
        userId: user.value.id,
        title: "Nieuwe sessie",
        date: now,
        duration: 0,
        messages: [],
        insights: []
      }

      return sessionId
    } catch (error) {
      console.error('Error creating session:', error)
      currentSession.value = null
      return null
    }
  }

  // Save current session
  async function saveCurrentSession() {
    if (!currentSession.value || !user.value?.id) return null

    // Don't save sessions without any user input
    const hasUserInput = currentSession.value.messages.some(msg => {
      console.log("Checking message:", msg) // Debug log
      return msg.role === 'user' && msg.content.trim().length > 0
    })
    
    if (!hasUserInput) {
      console.log("No valid user messages found in session:", {
        messageCount: currentSession.value.messages.length,
        messages: currentSession.value.messages
      })
      return null
    }

    try {
      isLoading.value = true
      
      if (!currentSession.value.summary && currentSession.value.messages.length >= 2) {
        await generateSessionSummary()
      }
      
      currentSession.value.duration = calculateSessionDuration()
      
      const savedSessionId = await saveToSupabase(currentSession.value)
      await loadSavedSessions()
      
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
      console.log("=== Starting saveToSupabase ===")
      console.log("Session details:", {
        id: session.id,
        userId: user.value?.id,
        messageCount: session.messages.length,
        title: session.title,
        date: session.date
      })
      
      // Check if session already exists in Supabase
      const { data: existingSession, error: checkError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', session.id)
        .single()
      
      console.log("Existing session check:", { existingSession, checkError })
      
      // Prepare session data for Supabase
      const sessionData = {
        id: session.id,
        user_id: user.value!.id,
        title: session.title,
        created_at: session.date,
        duration: session.duration,
        insights: session.insights,
        summary: session.summary ? JSON.stringify(session.summary) : null,
        is_archived: false
      }
      
      console.log("Prepared session data:", sessionData)
      
      let result
      if (existingSession) {
        console.log("Updating existing session...")
        result = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', session.id)
      } else {
        console.log("Inserting new session...")
        result = await supabase
          .from('sessions')
          .insert(sessionData)
      }
      
      console.log("Session save result:", result)
      
      if (result.error) {
        console.error("Error saving session to Supabase:", result.error)
        throw result.error
      }
      
      // Save or update messages
      console.log("Starting to save messages...")
      for (const message of session.messages) {
        const timestamp = message.timestamp || new Date().toISOString()
        
        console.log("Processing message:", {
          role: message.role,
          content: message.content.substring(0, 50) + "...",
          timestamp,
          essence: message.essence
        })
        
        // Check if message exists in this specific session
        const { data: messages, error: messageCheckError } = await supabase
          .from('messages')
          .select('id')
          .eq('session_id', session.id)
          .eq('content', message.content)
          .eq('role', message.role)
          .eq('created_at', timestamp)
        
        if (messageCheckError) {
          console.error("Error checking for existing message:", messageCheckError)
          continue
        }
        
        console.log("Message existence check:", { exists: messages?.length > 0 })
        
        // Handle essence field - ensure it's a string or null
        let essence = null
        if (message.essence) {
          essence = typeof message.essence === 'string' ? message.essence : null
        }
        
        const messageData = {
          session_id: session.id,
          role: message.role,
          content: message.content,
          essence: essence,
          created_at: timestamp
        }
        
        console.log("Prepared message data:", messageData)
        
        let messageResult
        if (messages && messages.length > 0) {
          console.log("Updating existing message...")
          messageResult = await supabase
            .from('messages')
            .update(messageData)
            .eq('id', messages[0].id)
        } else {
          console.log("Inserting new message...")
          messageResult = await supabase
            .from('messages')
            .insert(messageData)
        }
        
        if (messageResult.error) {
          console.error("Error saving message to Supabase:", messageResult.error)
          console.log("Failed message data:", messageData)
        } else {
          console.log("Successfully saved message")
        }
      }
      
      console.log("=== Completed saveToSupabase ===")
      return session.id
    } catch (error) {
      console.error('Error in saveToSupabase:', error)
      throw error
    }
  }

  // Load saved sessions
  async function loadSavedSessions() {
    // Wait a moment for auth state to stabilize if needed
    if (!isInitialized.value) {
      console.log("Waiting for auth state before loading sessions...")
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!user.value?.id) {
      console.error('Cannot load sessions: User not logged in')
      savedSessions.value = []
      return []
    }

    try {
      console.log("Loading sessions for user:", user.value.id)
      isLoading.value = true
      const loadedSessions = await loadFromSupabase()
      savedSessions.value = loadedSessions.filter(Boolean)
      console.log("Successfully loaded sessions:", savedSessions.value.length)
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
      console.log("Loading sessions from Supabase for user:", user.value?.id)
      
      // Get sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.value!.id)
        .order('created_at', { ascending: false })
      
      if (sessionError) {
        console.error("Error loading sessions from Supabase:", sessionError)
        throw sessionError
      }
      
      console.log("Found sessions in Supabase:", {
        count: sessionData?.length || 0,
        sessionIds: sessionData?.map(s => s.id) || []
      })
      
      // Map sessions to our format
      const sessions: TherapySession[] = []
      
      for (const session of sessionData) {
        // Get messages for each session
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })
        
        if (messagesError) {
          console.error("Error loading messages from Supabase:", messagesError)
          throw messagesError
        }
        
        // Parse the summary if it's a string, otherwise use as-is
        let parsedSummary = undefined
        if (session.summary) {
          try {
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
          title: session.title || "Nieuwe sessie",
          date: session.created_at,
          duration: session.duration || 0,
          insights: session.insights || [],
          messages: messagesData.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            essence: msg.essence || undefined,
            timestamp: msg.created_at,
            displayFull: true
          })),
          summary: parsedSummary
        }
        
        sessions.push(therapySession)
      }
      
      console.log("Successfully loaded sessions from Supabase:", {
        count: sessions.length,
        sessionIds: sessions.map(s => s.id)
      })
      
      return sessions
    } catch (error) {
      console.error('Error loading from Supabase:', error)
      // Fallback to localStorage if Supabase fails
      console.log("Falling back to localStorage due to Supabase error")
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
    // Wait a moment for auth state to stabilize if needed
    if (!isInitialized.value) {
      console.log("Waiting for auth state before loading session...")
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!user.value?.id) {
      console.error('Cannot load session: User not logged in')
      return null
    }

    try {
      const session = await loadSessionFromSupabase(sessionId)
      if (session) {
        currentSession.value = session
      }
      return session
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  // Helper function to load a session from Supabase
  async function loadSessionFromSupabase(sessionId: string) {
    try {
      console.log("Loading session from Supabase:", sessionId)
      
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sessionError) {
        console.error("Error loading session:", sessionError)
        throw sessionError
      }
      
      if (!session) {
        console.error("Session not found:", sessionId)
        return null
      }
      
      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      
      if (messagesError) {
        console.error("Error loading messages:", messagesError)
        throw messagesError
      }
      
      // Parse the summary if it's a string, otherwise use as-is
      let parsedSummary = undefined
      if (session.summary) {
        try {
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
        title: session.title || "Nieuwe sessie",
        date: session.created_at,
        duration: session.duration || 0,
        insights: session.insights || [],
        messages: messagesData.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          essence: msg.essence || undefined,
          timestamp: msg.created_at,
          displayFull: true
        })),
        summary: parsedSummary
      }
      
      return therapySession
    } catch (error) {
      console.error('Error loading session from Supabase:', error)
      throw error
    }
  }

  // Delete a session
  async function deleteSession(sessionId: string) {
    if (!user.value?.id) {
      console.error('Cannot delete session: User not logged in')
      return false
    }

    try {
      await deleteSessionFromSupabase(sessionId)
      
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
      }
      
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
      throw error // Don't fallback to localStorage anymore
    }
  }

  // Update the current session with new messages
  function updateSessionMessages(messages: ChatMessage[]) {
    if (!currentSession.value) return

    // Ensure all messages have timestamps
    currentSession.value.messages = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString()
    }))
    
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
Maak een korte, bondige samenvatting (maximaal 100 woorden) van dit gesprek die het volgende belicht:
1. De kernuitdaging die de client heeft gedeeld
2. Het belangrijkste ACT-concept dat is besproken
3. Een specifiek inzicht of moment van helderheid

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

  // Delete all sessions
  async function deleteAllSessions() {
    if (!user.value?.id) {
      console.error('Cannot delete sessions: User not logged in')
      return false
    }

    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.value.id)
      
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        await supabase
          .from('messages')
          .delete()
          .in('session_id', sessionIds)
        
        await supabase
          .from('sessions')
          .delete()
          .eq('user_id', user.value.id)
      }
      
      savedSessions.value = []
      currentSession.value = null
      return true
    } catch (error) {
      console.error('Error deleting all sessions:', error)
      return false
    }
  }

  // Add test function to verify Supabase connection
  async function testSupabaseConnection() {
    try {
      console.log("Testing Supabase connection...")
      
      // Test reading from sessions table
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('count')
        .limit(1)
      
      if (sessionsError) {
        console.error("Error reading from sessions table:", sessionsError)
        return false
      }
      
      console.log("Successfully connected to Supabase sessions table")
      
      // Test reading from messages table
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('count')
        .limit(1)
      
      if (messagesError) {
        console.error("Error reading from messages table:", messagesError)
        return false
      }
      
      console.log("Successfully connected to Supabase messages table")
      
      // Get actual counts
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
      
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
      
      console.log("Current Supabase data:", {
        sessions: sessionCount || 0,
        messages: messageCount || 0
      })
      
      return true
    } catch (error) {
      console.error("Error testing Supabase connection:", error)
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
    deleteAllSessions,
    testSupabaseConnection
  }
} 