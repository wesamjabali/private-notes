<script setup lang="ts">
import { useGitHubStore, type FileNode } from '~/stores/github'

const props = defineProps<{
  nodes: FileNode[],
  depth?: number
}>()

const store = useGitHubStore()
const route = useRoute()
const router = useRouter()

const isOpen = ref(true) // Default open for now, or manage state

const toggleFolder = (node: FileNode) => {
  // Simple local toggle, could be moved to store if we want persistence
  // But for recursion, we often just toggle visibility of children
}

const selectFile = (node: FileNode) => {
  if (node.type === 'tree') {
    // node.isOpen = !node.isOpen // Would need reactive node or separate state map
    return
  }
  
  // Navigate to file
  const [owner, repo] = store.currentRepo!.full_name.split('/')
  // path needs to be encoded? 
  router.push(`/repo/${owner}/${repo}/${node.path}`)
}

const getIcon = (node: FileNode) => {
  if (node.type === 'tree') return '📁' 
  if (node.name.endsWith('.md')) return '📝'
  return '📄'
}
</script>

<template>
  <div class="file-tree" :style="{ paddingLeft: depth ? '1rem' : '0' }">
    <div v-for="node in nodes" :key="node.path">
      <div 
        class="node-item" 
        :class="{ 'active': store.currentFilePath === node.path }"
        @click="selectFile(node)"
      >
        <div class="node-content">
          <span class="icon">{{ getIcon(node) }}</span>
          <span class="name">{{ node.name }}</span>
        </div>
        
        <button 
          v-if="node.type === 'tree'"
          class="pin-btn"
          :class="{ 'active': store.mainFolder === node.path }"
          @click.stop="store.setMainFolder(node.path)"
          title="Set as main folder"
        >
          {{ store.mainFolder === node.path ? '★' : '☆' }}
        </button>
      </div>
      
      <!-- Recursive Children -->
      <div v-if="node.type === 'tree' && node.children && node.children.length > 0" class="children">
        <FileTree :nodes="node.children" :depth="(depth || 0) + 1" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.node-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg-dark-300);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--color-primary-dim);
    color: white;
  }
  
  .name {
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-content {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;
  }

  .pin-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 0.25rem;
    opacity: 0;
    transition: opacity 0.2s, color 0.2s;
    
    &:hover {
      color: var(--color-accent);
      opacity: 1;
    }
    
    &.active {
      color: var(--color-primary);
      opacity: 1;
    }
  }

  &:hover .pin-btn {
    opacity: 1;
  }
}
</style>
