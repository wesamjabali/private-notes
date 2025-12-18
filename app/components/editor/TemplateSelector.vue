<script setup lang="ts">
import { File as FileIcon, FileText } from 'lucide-vue-next'
import { useGitStore, type Template } from '~/stores/git'

const store = useGitStore()
const router = useRouter()

const handleSelect = async (template: Template | null) => {
  const result = await store.applyTemplate(template)
  if (result?.path && store.currentRepo) {
    const [owner, repo] = store.currentRepo.full_name.split("/")
    router.push(`/repo/${owner}/${repo}/${result.path}`)
  }
}

const handleCancel = () => {
  store.cancelTemplateSelection()
}
</script>

<template>
  <div v-if="store.pendingTemplateSelection" class="template-selector-overlay" @click.self="handleCancel">
    <div class="template-selector-modal">
      <div class="header">
        <h3>Choose a Template</h3>
        <button class="close-btn" @click="handleCancel">×</button>
      </div>
      
      <div class="template-list">
        <button 
          v-for="template in store.pendingTemplateSelection.templates" 
          :key="template.path"
          class="template-item"
          @click="handleSelect(template)"
        >
          <FileText :size="18" class="icon" />
          <span class="name">{{ template.name }}</span>
        </button>
        
        <button class="template-item empty-file" @click="handleSelect(null)">
          <FileIcon :size="18" class="icon" />
          <span class="name">Empty File</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.template-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-selector-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modal-pop 0.2s ease-out;
}

@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 0.5rem;
    
    &:hover {
      color: var(--text-primary);
    }
  }
}

.template-list {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 60vh;
  overflow-y: auto;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: background 0.2s;
  
  &:hover {
    background: var(--bg-hover);
  }
  
  .icon {
    font-size: 1.2rem;
  }
  
  .name {
    font-size: 1rem;
    flex: 1;
  }
  
  &.empty-file {
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
    margin-top: 0.25rem;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    
    &:hover {
        background: var(--bg-dark-300);
        color: var(--text-primary);
    }
  }
}
</style>
