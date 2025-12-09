import { GoogleGenerativeAI, type ChatSession, type GenerativeModel } from '@google/generative-ai'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export const useGeminiStore = defineStore('gemini', () => {
  const apiKey = useStorage('gemini_api_key', '')
  const history = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  let model: GenerativeModel | null = null
  let chat: ChatSession | null = null

  const init = () => {
    if (apiKey.value) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey.value)
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
        chat = model.startChat({
          history: history.value.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
          }))
        })
      } catch (e: any) {
        error.value = "Failed to init Gemini: " + e.message
      }
    }
  }

  const setApiKey = (key: string) => {
    apiKey.value = key
    init()
  }

  const sendMessage = async (message: string, context: string = '') => {
    if (!model) init()
    if (!model) {
      error.value = "Gemini API Key missing"
      return
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // Add user message to history immediatley for UI
      history.value.push({ role: 'user', text: message })
      
      const prompt = context 
         ? `Context: The user is writing a markdown file. Current content snippet:\n${context}\n\nUser Request: ${message}`
         : message
         
      // Allow single-turn or chat? 'chat' object maintains history but we are manually managing it for UI. 
      // Actually `sendMessage` on chat object updates its internal history.
      // But if we want to include "Context" dynamically every time without polluting history with context blobs...
      // It might be better to just use generateContent for "Help me write" or use chat for "Chat".
      // Let's use generaContent for now to keep it simple and stateless/flexible, 
      // OR use chat and just append.
      // Let's use chat but we need to resync history if we reload. 
      
      // Re-init chat to be safe or if history changed externally
      if (!chat) {
         const genAI = new GoogleGenerativeAI(apiKey.value)
         model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
         chat = model.startChat({})
      }

      const result = await chat.sendMessage(prompt)
      const response = result.response.text()
      
      history.value.push({ role: 'model', text: response })
      
    } catch (e: any) {
      error.value = e.message
      // Remove failed user message? Or keep it?
    } finally {
      isLoading.value = false
    }
  }

  const clearHistory = () => {
    history.value = []
    chat = null
    init()
  }

  return {
    apiKey,
    history,
    isLoading,
    error,
    setApiKey,
    sendMessage,
    clearHistory
  }
})
