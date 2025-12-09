<script setup lang="ts">
import { useGeminiStore } from '~/stores/gemini'
import { useGitHubStore } from '~/stores/github'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const store = useGeminiStore()
const gitStore = useGitHubStore()

const inputMsg = ref('')
const showKeyInput = ref(!store.apiKey)
const scrollTarget = ref<HTMLElement | null>(null)

// Auto-scroll to bottom
watch(() => store.history.length, async () => {
  await nextTick()
  if (scrollTarget.value) {
    scrollTarget.value.scrollTop = scrollTarget.value.scrollHeight
  }
})

const send = async () => {
  if (!inputMsg.value.trim() || store.isLoading) return
  
  const msg = inputMsg.value
  inputMsg.value = ''
  
  // Pass current file context if available roughly
  // Limit context size to avoid token limits (not huge issue with 1.5 flash but good practice)
  const context = gitStore.currentFileContent 
    ? gitStore.currentFileContent.slice(0, 5000) 
    : ''
    
  await store.sendMessage(msg, context)
}

const saveKey = (key: string) => {
  store.setApiKey(key)
  showKeyInput.value = false
}
</script>

<template>
  <div class="gemini-chat glass-panel" :class="{ 'open': isOpen }">
    <header class="chat-header">
      <div class="flex-center">
        <span class="icon">✨</span>
        <h3>Gemini Assistant</h3>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </header>

    <div v-if="!store.apiKey || showKeyInput" class="key-setup">
      <p>Enter your Gemini API Key to start</p>
      <input 
        type="password" 
        :value="store.apiKey"
        @change="(e) => saveKey((e.target as HTMLInputElement).value)"
        placeholder="AIzaSy..."
        class="input-field"
      >
      <a href="https://aistudio.google.com/app/apikey" target="_blank" class="link">Get API Key</a>
      <button v-if="store.apiKey" @click="showKeyInput = false" class="btn-text">Back to Chat</button>
    </div>

    <template v-else>
      <div class="messages" ref="scrollTarget">
        <div v-if="store.history.length === 0" class="empty-chat">
          <p>Ask me anything about your notes, or ask for help writing!</p>
        </div>
        
        <div 
          v-for="(msg, i) in store.history" 
          :key="i"
          class="message-bubble"
          :class="msg.role"
        >
          <div class="bubble-content">{{ msg.text }}</div>
        </div>
        
        <div v-if="store.isLoading" class="loading-indicator">
          <span>Thinking...</span>
        </div>
        
        <div v-if="store.error" class="error-msg">
          {{ store.error }}
        </div>
      </div>

      <div class="input-area">
        <textarea 
          v-model="inputMsg" 
          placeholder="Ask Gemini..." 
          @keydown.enter.exact.prevent="send"
          rows="1"
        ></textarea>
        <button class="send-btn" @click="send" :disabled="!inputMsg || store.isLoading">↑</button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.gemini-chat {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 350px;
  background: var(--bg-dark-100);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 200;
  
  &.open {
    transform: translateX(0);
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
}

.chat-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  
  .icon { margin-right: 0.5rem; }
  h3 { font-size: 1.1rem; }
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.key-setup {
  padding: 2rem;
  text-align: center;
  
  p { margin-bottom: 1rem; color: var(--text-secondary); }
  
  .input-field {
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background: var(--bg-dark-200);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: white;
  }
  
  .link { color: var(--color-primary); font-size: 0.9rem; display: block; margin-bottom: 1rem;}
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-bubble {
  max-width: 85%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  line-height: 1.5;
  
  &.user {
    align-self: flex-end;
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 2px;
  }
  
  &.model {
    align-self: flex-start;
    background: var(--bg-dark-300);
    color: var(--text-primary);
    border-bottom-left-radius: 2px;
  }
}

.empty-chat {
  text-align: center;
  color: var(--text-muted);
  margin-top: 2rem;
  padding: 0 1rem;
}

.loading-indicator {
  align-self: flex-start;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-left: 0.5rem;
}

.error-msg {
  color: var(--color-accent);
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.input-area {
  padding: 1rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 0.5rem;
  background: var(--bg-dark-200);
  
  textarea {
    flex: 1;
    background: transparent;
    border: none;
    resize: none;
    color: white;
    font-family: var(--font-body);
    font-size: 0.95rem;
    padding: 0.5rem;
    max-height: 100px;
    
    &:focus { outline: none; }
  }
  
  .send-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    
    &:disabled { opacity: 0.5; }
  }
}
</style>
