<script setup lang="ts">
import { useGitHubStore } from '~/stores/github'
import LiveEditor from './LiveEditor.vue'

const store = useGitHubStore()

const save = async () => {
  await store.saveCurrentFile()
}
</script>

<template>
  <div class="editor-container">
    <header class="editor-header glass-panel">
      <div class="file-info">
        <span class="path">{{ store.currentFilePath }}</span>
        <span v-if="store.isDirty" class="dirty-indicator">• Unsaved</span>
      </div>
      
      <div class="actions">
        <button class="btn-primary" @click="save" :disabled="!store.isDirty || store.isLoading">
          {{ store.isLoading ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </header>
    
    <div class="editor-main">
      <LiveEditor 
        v-if="store.currentFileContent !== null"
        :model-value="store.currentFileContent" 
        @update:model-value="store.updateContent"
        @save="save"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1rem;
}

.file-info {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-muted);
  
  .dirty-indicator {
    color: var(--color-accent);
    margin-left: 0.5rem;
  }
}

.actions {
  gap: 1rem;
  display: flex;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  
  &:hover {
    background: lighten(hsl(260, 70%, 60%), 5%);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.editor-main {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--bg-dark-200);
}
</style>
