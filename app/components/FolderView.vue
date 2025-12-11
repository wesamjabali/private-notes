<script setup lang="ts">
import { type FileNode } from '~/stores/github';

const props = defineProps<{
  nodes: FileNode[],
  currentPath: string
}>()

const router = useRouter()
const store = useGitHubStore()

const navigateTo = (node: FileNode) => {
    const [owner, repo] = store.currentRepo!.full_name.split('/')
    router.push(`/repo/${owner}/${repo}/${node.path}`)
}

const getIcon = (node: FileNode) => {
  if (node.type === 'tree') return '📁' 
  if (node.name.endsWith('.md')) return '📝'
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif']
  if (imageExts.some(ext => node.name.toLowerCase().endsWith(ext))) return '🖼️'
  return '📄'
}

const navigateUp = () => {
    const parts = props.currentPath.split('/')
    if (parts.length <= 1) {
        // Go to root
         const [owner, repo] = store.currentRepo!.full_name.split('/')
         router.push(`/repo/${owner}/${repo}/`)
    } else {
        parts.pop() // remove last segment
        const parentPath = parts.join('/')
        const [owner, repo] = store.currentRepo!.full_name.split('/')
        router.push(`/repo/${owner}/${repo}/${parentPath}`)
    }
}

const folders = computed(() => (props.currentPath ? [{ name: '..', path: '..' }] : []).concat(props.nodes.filter(n => n.type === 'tree')))
const files = computed(() => props.nodes.filter(n => n.type !== 'tree'))
</script>

<template>
  <div class="folder-view">
    <div class="bookshelf">
        <!-- Folders Section -->
        <div v-if="folders.length > 0" class="shelf-section">
            <h3 class="shelf-label">Folders</h3>
            <div class="grid">
                <div 
                    v-for="folder in folders" 
                    :key="folder.path"
                    class="item-card folder-card"
                    @click="folder.path === '..' ? navigateUp() : navigateTo(folder as any)"
                >
                    <div class="folder-tab"></div>
                    <div class="folder-body">
                        <span class="icon">📁</span>
                        <span class="name" :title="folder.name">{{ folder.name }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Files Section -->
        <div v-if="files.length > 0" class="shelf-section">
            <h3 class="shelf-label">Documents</h3>
            <div class="grid">
                <div 
                    v-for="file in files" 
                    :key="file.path"
                    class="item-card file-card"
                    @click="navigateTo(file)"
                >
                   <div class="paper-sheet">
                        <div class="line"></div>
                        <div class="line"></div>
                        <div class="line short"></div>
                        <div class="content-preview">
                            <span class="file-icon">{{ getIcon(file) }}</span>
                            <span class="file-name">{{ file.name }}</span>
                        </div>
                   </div>
                </div>
            </div>
        </div>

        <div v-if="nodes.length === 0" class="empty-folder">
            <p>This folder is empty.</p>
        </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.folder-view {
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-dark-100);
}

.bookshelf {
    max-width: 1200px;
    margin: 0 auto;
}

.shelf-section {
    margin-bottom: 3rem;
}

.shelf-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 0.5rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1.5rem;
}

.item-card {
    cursor: pointer;
    transition: transform 0.2s;
    
    &:hover {
        transform: translateY(-4px);
    }
}

/* Folder Look */
.folder-card {
    position: relative;
    
    .folder-tab {
        width: 40px;
        height: 10px;
        background: var(--bg-dark-300);
        border-radius: 4px 4px 0 0;
        margin-bottom: -1px;
    }
    
    .folder-body {
        background: var(--bg-dark-200);
        border: 1px solid var(--bg-dark-300);
        border-radius: 0 4px 4px 4px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: background 0.2s, border-color 0.2s;
        
        .icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.7; }
        .name { 
            font-size: 1rem; 
            font-weight: 500;
            text-align: center; 
            color: var(--text-primary); /* Use primary text color for better visibility */
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word; /* Ensure long names wrap */
        }
    }
    
    &:hover .folder-body {
        background: var(--bg-dark-300);
        border-color: var(--color-primary-dim);
        
        .name { color: white; }
    }
}

.back-card {
    width: 140px;
    margin-bottom: 2rem;
    
    .folder-body {
        border-style: dashed;
        opacity: 0.8;
    }
    &:hover .folder-body {
        opacity: 1;
        border-style: solid;
        border-color: var(--color-accent);
    }
}

/* File/Paper Look */
.file-card {
    .paper-sheet {
        background: white;
        height: 180px;
        border-radius: 2px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        position: relative;
        padding: 15px;
        display: flex;
        flex-direction: column;
        transition: box-shadow 0.2s;
        
        /* Subtle paper gradient */
        background: linear-gradient(to bottom right, #fdfdfd, #f0f0f0);
        
        /* Decorative lines */
        .line {
            height: 4px;
            background: #e0e0e0;
            margin-bottom: 8px;
            border-radius: 2px;
            &.short { width: 60%; }
        }
        
        .content-preview {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 1rem;
            
            .file-icon { font-size: 2rem; margin-bottom: 0.5rem; }
            .file-name {
                font-size: 0.85rem;
                color: #333;
                text-align: center;
                word-break: break-word;
                font-family: var(--font-mono);
                line-height: 1.3;
            }
        }
    }
    
    &:hover .paper-sheet {
        box-shadow: 0 8px 15px rgba(0,0,0,0.25);
        z-index: 10;
        background: white; /* brighter on hover */
    }
}

.empty-folder {
    text-align: center;
    color: var(--text-muted);
    padding: 3rem;
}
</style>
