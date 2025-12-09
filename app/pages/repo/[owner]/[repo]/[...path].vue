<script setup lang="ts">
import { useGitHubStore } from '~/stores/github'

// Route params: /repo/:owner/:repo/:path*
const route = useRoute()
const router = useRouter()
const store = useGitHubStore()

const owner = route.params.owner as string
const repoName = route.params.repo as string
// path is an array of strings
const pathSegments = route.params.path as string[] || []
const filePath = pathSegments.join('/')

const isSidebarOpen = ref(true)
const isChatOpen = ref(false)

// Verification logic
onMounted(async () => {
    // If no token, redirect home
    if (!store.token) {
        // try init first
        await store.init()
        if (!store.token) {
             router.push('/')
             return
        }
    }
    
    // Ensure we have current repo loaded
    if (!store.currentRepo || store.currentRepo.name !== repoName) {
        // Need to find repo obj or fetch it. 
        // For now, assume they came from dashboard or we force fetch repos
        if (store.repos.length === 0) await store.fetchRepos()
        const found = store.repos.find(r => r.name === repoName && r.full_name.includes(owner))
        if (found) {
            await store.selectRepo(found)
        } else {
            console.error('Repo not found')
            router.push('/') // fallback
            return
        }
    }

    // If path exists, open it
    if (filePath) {
        await store.openFile(filePath)
    }
})

// Watch for path changes
watch(() => route.params.path, async (newPath) => {
    const p = (newPath as string[] || []).join('/')
    if (p && p !== store.currentFilePath) {
        await store.openFile(p)
    }
})

</script>

<template>
<div class="repo-layout">
    <aside class="sidebar glass-panel" :class="{ 'collapsed': !isSidebarOpen }">
        <div class="sidebar-header">
    <h3>{{ repoName }}</h3>
    <button class="icon-btn" @click="store.showHiddenFiles = !store.showHiddenFiles" :title="store.showHiddenFiles ? 'Hide dotfiles' : 'Show dotfiles'">
      {{ store.showHiddenFiles ? '👁️' : '🙈' }}
    </button>
    <button class="icon-btn mobile-only" @click="isSidebarOpen = false">✕</button>
        </div>
        <div class="sidebar-content">
             <div v-if="store.isLoading && store.fileTree.length === 0" class="loading">Loading Tree...</div>
             <FileTree :nodes="store.filteredFileTree" />
        </div>
    </aside>

    <main class="main-content">
        <div class="mobile-header mobile-only">
             <button class="icon-btn" @click="isSidebarOpen = true">☰</button>
             <span class="current-file">{{ store.currentFilePath || 'No file selected' }}</span>
             <button class="icon-btn" @click="isChatOpen = true">✨</button>
        </div>

        <div v-if="filePath" class="editor-wrapper">
             <Editor />
             <!-- Floating chat toggle for desktop -->
             <button class="fab-chat" @click="isChatOpen = !isChatOpen" title="Gemini AI Help">
                ✨
             </button>
        </div>
        <div v-else class="empty-state flex-center">
             <div class="text-center">
                 <h2>Select a file to edit</h2>
                 <p class="text-muted">Choose a markdown file from the sidebar</p>
             </div>
        </div>
        
        <GeminiChat :isOpen="isChatOpen" @close="isChatOpen = false" />
    </main>
</div>
</template>

<style scoped lang="scss">
.repo-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.sidebar {
    width: 300px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-subtle);
    background: var(--bg-dark-100); /* override glass slightly for solidity */
    transition: transform 0.3s ease;
    z-index: 100;
    
    @media (max-width: 768px) {
        position: absolute;
        width: 80%;
        box-shadow: 10px 0 20px rgba(0,0,0,0.5);
        
        &.collapsed {
            transform: translateX(-100%);
        }
    }
}

.sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 { font-size: 1.1rem; color: var(--color-primary); }
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    background: var(--bg-dark-100);
}

.editor-wrapper {
    flex: 1;
    height: 100%;
    overflow: hidden;
    padding: 1rem;
    position: relative;
}

.mobile-header {
    display: none;
    padding: 1rem;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-subtle);
    
    @media (max-width: 768px) {
        display: flex;
    }
    
    .current-file {
        margin-left: 1rem;
        margin-right: auto;
        font-family: var(--font-mono);
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

.icon-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
}

.fab-chat {
    position: absolute;
    bottom: 2rem;
    right: 2rem;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 50;
    
    /* Liquid Glass Effect */
    background: linear-gradient(135deg, 
        hsla(var(--hue-primary), 80%, 65%, 0.9),
        hsla(var(--hue-accent), 80%, 65%, 0.9),
        hsla(var(--hue-secondary), 80%, 65%, 0.9)
    );
    background-size: 200% 200%;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    
    /* Glass border and shadow */
    box-shadow: 
        0 8px 32px 0 rgba(31, 38, 135, 0.37),
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    
    /* Smooth transitions */
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Floating animation */
    animation: float 3s ease-in-out infinite, gradientShift 8s ease infinite;
    
    /* Inner glow */
    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, 
            rgba(255, 255, 255, 0.4), 
            transparent 60%
        );
        opacity: 0.6;
        transition: opacity 0.4s ease;
    }
    
    /* Outer glow ring */
    &::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: linear-gradient(135deg, 
            hsla(var(--hue-primary), 80%, 65%, 0.4),
            hsla(var(--hue-accent), 80%, 65%, 0.4)
        );
        filter: blur(8px);
        opacity: 0;
        z-index: -1;
        transition: opacity 0.4s ease;
    }
    
    &:hover {
        transform: scale(1.15) translateY(-2px);
        box-shadow: 
            0 12px 48px 0 rgba(31, 38, 135, 0.5),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.2);
        
        &::before {
            opacity: 1;
        }
        
        &::after {
            opacity: 1;
        }
    }
    
    &:active {
        transform: scale(1.05) translateY(0);
    }
}

/* Floating animation */
@keyframes float {
    0%, 100% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-8px);
    }
}

/* Gradient shift animation */
@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.empty-state {
    height: 100%;
    color: var(--text-muted);
    
    h2 { color: var(--text-secondary); margin-bottom: 0.5rem; }
}

/* Scrollbar for sidebar */
.sidebar-content::-webkit-scrollbar { width: 4px; }
</style>
