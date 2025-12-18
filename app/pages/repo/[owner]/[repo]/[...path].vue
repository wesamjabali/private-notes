<script setup lang="ts">
import EditorSkeleton from "~/components/skeletons/EditorSkeleton.vue";
import SidebarSkeleton from "~/components/skeletons/SidebarSkeleton.vue";
import { useGitStore, type FileNode } from "~/stores/git";

import { useMediaQuery } from "@vueuse/core";
import {
  ArrowLeft,
  ChevronLeft,
  Menu,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X
} from "lucide-vue-next";
import TextInput from "~/components/ui/TextInput.vue";
import { useFileActions } from "~/composables/useFileActions";


const route = useRoute();
const router = useRouter();
const store = useGitStore();
const settings = useSettingsStore();

const showAiTools = computed(() => !!settings.geminiApiKey);

const owner = route.params.owner as string;
const repoName = route.params.repo as string;

const pathSegments = computed(() => (route.params.path as string[]) || []);
const filePath = computed(() => pathSegments.value.join("/"));

const fileNode = computed(() => store.getNodeByPath(filePath.value));
const isFolder = computed(() => fileNode.value?.type === "tree");
const folderChildren = computed(() => {
  const children = fileNode.value?.children || [];
  if (settings.showDotfiles) return children;
  return children.filter((node) => !node.name.startsWith("."));
});

const rootFolderPath = computed(() => store.mainFolder || "");
const rootFolderNodes = computed(() => store.filteredFileTree);

const headerPathLabel = computed(() => {
  const fullPath = filePath.value || rootFolderPath.value;
  if (!fullPath) return "Repository root";
  return fullPath.split("/").pop() || fullPath;
});


const { createFolder, createNote, triggerUpload, deleteCurrentFile } =
  useFileActions();

const activeSidebarPath = computed(() => {
  const root = store.mainFolder || "";

  
  if (!filePath.value) return root;

  const node = store.getNodeByPath(filePath.value);
  if (node?.type === "tree") {
    const candidate = filePath.value;
    if (!root) return candidate;
    return candidate === root || candidate.startsWith(root + "/")
      ? candidate
      : root;
  }

  
  const parts = filePath.value.split("/");
  parts.pop();
  const parent = parts.join("/");
  if (!root) return parent;
  if (!parent) return root;
  return parent === root || parent.startsWith(root + "/") ? parent : root;
});


const isStandalone = useMediaQuery("(display-mode: standalone)");
const isPwa = computed(() => {
   
  const isIosStandalone = typeof window !== "undefined" && window.navigator?.standalone;
  return isStandalone.value || isIosStandalone;
});


const touchStart = ref<{ x: number; y: number } | null>(null);

const handleTouchStart = (e: TouchEvent) => {
  if (!isPwa.value) return;
  
  if (e.touches.length !== 1) return;
  
  touchStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isPwa.value || !touchStart.value) return;
  
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const diffX = currentX - touchStart.value.x;
  const diffY = currentY - touchStart.value.y;

  
  if (Math.abs(diffX) > Math.abs(diffY)) {
    
    
    const startX = touchStart.value.x;
    const windowWidth = window.innerWidth;
    
    
    if (startX < 50) {
       e.preventDefault(); 
    }
    
    else if (startX > windowWidth - 50) {
       e.preventDefault();
    }
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!isPwa.value || !touchStart.value) return;
  
  const touchEnd = {
    x: e.changedTouches[0].clientX,
    y: e.changedTouches[0].clientY
  };
  
  const diffX = touchEnd.x - touchStart.value.x;
  const diffY = touchEnd.y - touchStart.value.y;
  
  
  const startX = touchStart.value.x;
  touchStart.value = null;

  
  const minSwipeDistance = 50;
  const maxVerticalDeviance = 50; 

  if (Math.abs(diffY) > maxVerticalDeviance) return;
  if (Math.abs(diffX) < minSwipeDistance) return;

  const windowWidth = window.innerWidth;

  
  if (diffX > 0 && startX < 50) {
    if (!isSidebarOpen.value) {
      isSidebarOpen.value = true;
    }
  }
  
  
  else if (diffX < 0 && startX > windowWidth - 50) {
    if (!isChatOpen.value) {
      isChatOpen.value = true;
    }
  }
};

const isSidebarOpen = ref(true);
const isChatOpen = ref(false);
const sidebarWidth = ref(300); 
const isResizing = ref(false);
const chatSidebarWidth = ref(350);
const isChatResizing = ref(false);

const showHamburger = ref(!isSidebarOpen.value);

watch(isSidebarOpen, (val) => {
  if (val) {
    showHamburger.value = false;
  } else {
    setTimeout(() => {
      showHamburger.value = true;
    }, 300);
  }
});


const handleFileSelect = (node: FileNode) => {
  if (window.innerWidth <= 640 && node.type === "blob") {
    isSidebarOpen.value = false;
  }
};


watch(
  () => route.fullPath,
  () => {
    if (window.innerWidth <= 640) {
      const p = ((route.params.path as string[]) || []).join("/");
      const node = store.getNodeByPath(p);
      
      if (node && node.type === "blob") {
        isSidebarOpen.value = false;
      }
    }
  }
);


const showSearch = ref(false);
const searchInput = ref<InstanceType<typeof TextInput> | null>(null);

watch(showSearch, async (val) => {
  if (val) {
    await nextTick();
    searchInput.value?.focus();
  } else {
    store.searchQuery = "";
  }
});


watch(
  () => store.currentFilePath,
  (val) => {
    if (val) {
      showSearch.value = false;
    }
  }
);

const startResize = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none"; 
};

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return;

  
  if (e.clientX < 100) {
    isSidebarOpen.value = false;
    stopResize();
    sidebarWidth.value = 300; 
    return;
  }

  
  const newWidth = Math.max(200, Math.min(e.clientX, 800));
  sidebarWidth.value = newWidth;
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};

const startChatResize = () => {
  isChatResizing.value = true;
  document.addEventListener("mousemove", handleChatResize);
  document.addEventListener("mouseup", stopChatResize);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const handleChatResize = (e: MouseEvent) => {
  if (!isChatResizing.value) return;

  
  const newWidth = window.innerWidth - e.clientX;

  
  if (newWidth < 100) {
    isChatOpen.value = false;
    stopChatResize();
    chatSidebarWidth.value = 350;
    return;
  }

  
  const constrainedWidth = Math.max(250, Math.min(newWidth, 800));
  chatSidebarWidth.value = constrainedWidth;
};

const stopChatResize = () => {
  isChatResizing.value = false;
  document.removeEventListener("mousemove", handleChatResize);
  document.removeEventListener("mouseup", stopChatResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};

const navigateToRoot = () => {
  
  router.push(`/repo/${owner}/${repoName}/`);
};


onMounted(async () => {
  const initialRoot = route.query.root as string;

  
  if (window.innerWidth <= 640) {
    isSidebarOpen.value = false;
    showHamburger.value = true;
  }

  
  if (!store.token || !store.user) {
    
    await store.init();
    if (!store.token) {
      router.push("/");
      return;
    }
  }
  
  
  store.isInitialized = true;

  
  if (!store.currentRepo || store.currentRepo.name !== repoName) {
    
    
    if (store.repos.length === 0) await store.fetchRepos();
    let found = store.repos.find(
      (r) => r.name === repoName && r.full_name.includes(owner)
    );

    if (!found) {
      
      const repo = await store.fetchRepo(owner, repoName);
      if (repo) found = repo;
    }

    if (found) {
      await store.selectRepo(found);
    } else {
      console.error("Repo not found");
      router.push("/"); 
      return;
    }
  }

  
  if (initialRoot) {
    store.setMainFolder(initialRoot, false);
  }

  
  if (filePath.value) {
    const node = store.getNodeByPath(filePath.value);
    if (node && node.type === "tree") {
      store.currentFilePath = filePath.value;
      store.currentFileContent = "";
    } else {
      
      if (store.currentFilePath === filePath.value && store.currentFileContent !== null) {
        console.log("File content already in store, skipping fetch (optimistic).");
      } else {
        const success = await store.openFile(filePath.value);
        if (!success) {
          
          const parts = filePath.value.split("/");
          parts.pop();
          const parentPath = parts.join("/");
          router.replace(`/repo/${owner}/${repoName}/${parentPath}`);
        }
      }
    }
  }

  
  
  
  
  
  
  
  
});


watch(
  () => route.params.path,
  async (newPath) => {
    const p = ((newPath as string[]) || []).join("/");
    if (p && p !== store.currentFilePath) {
      const node = store.getNodeByPath(p);
      if (node && node.type === "tree") {
        store.currentFilePath = p;
        store.currentFileContent = "";
      } else {
        const success = await store.openFile(p);
        if (!success) {
          
          const parts = p.split("/");
          parts.pop();
          const parentPath = parts.join("/");
          router.replace(`/repo/${owner}/${repoName}/${parentPath}`);
        }
      }
    }
  }
);


watch(
  () => store.mainFolder,
  (newMainFolder) => {
    if (newMainFolder) {
      router.replace({ query: { ...route.query, root: newMainFolder } });
    } else {
      const query = { ...route.query };
      delete query.root;
      router.replace({ query });
    }
  }
);

definePageMeta({
  key: (route) => `repo-${route.params.owner}-${route.params.repo}`,
});
</script>

<template>
  <div class="repo-layout"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div
      v-if="isSidebarOpen"
      class="sidebar-backdrop mobile-only"
      @click="isSidebarOpen = false"
    ></div>
    <aside
      class="sidebar glass-panel"
      :class="{ collapsed: !isSidebarOpen }"
      :style="{ width: isSidebarOpen ? `${sidebarWidth}px` : undefined }"
    >
      <SidebarSkeleton v-if="store.isSwitchingRepo || (store.isLoading && store.fileTree.length === 0)" />
      
      <template v-else>
        <div class="sidebar-header">
          <div class="header-title-group">
            <button
              class="icon-btn back-btn"
              @click="router.push('/')"
              title="Back to Repositories"
            >
              <ArrowLeft :size="20" />
            </button>
            <div class="repo-info-stack">
              <h3
                @click="navigateToRoot"
                class="repo-title"
                title="Go to Repo Root"
              >
                {{ repoName }}
              </h3>
              <GitBranchSwitcher />
            </div>
          </div>

          <div class="header-buttons">
            <button
              class="icon-btn settings-btn"
              @click="router.push('/settings')"
              title="Settings"
            >
              <Settings :size="18" />
            </button>
            <button
              class="icon-btn collapse-btn"
              @click="isSidebarOpen = false"
              title="Collapse Sidebar"
            >
              <span class="desktop-only"><ChevronLeft :size="20" /></span>
              <span class="mobile-only"><X :size="20" /></span>
            </button>
          </div>
        </div>

        <div class="sidebar-actions">
          <template v-if="showSearch">
              <div class="search-box">
                <Search :size="16" class="search-icon" />
                <UiTextInput
                  ref="searchInput"
                  v-model="store.searchQuery"
                  class="search-input"
                  placeholder="Search files..."
                  @keydown.esc="showSearch = false"
                />
                <button class="icon-btn close-search-btn" @click="showSearch = false">
                  <X :size="16" />
                </button>
              </div>
          </template>
          <template v-else>
            <div class="sidebar-actions-left">
                <button
                  class="icon-btn search-toggle-btn"
                  @click="showSearch = true"
                  title="Search Files"
                >
                  <Search :size="18" />
                </button>
            </div>

            <div class="sidebar-actions-right">
                <UiActionDropdown
                  @new-note="createNote(activeSidebarPath, 'sidebar')"
                  @new-folder="createFolder(activeSidebarPath, 'sidebar')"
                  @upload="triggerUpload(activeSidebarPath)"
                />
            </div>
          </template>
        </div>

        <div class="sidebar-content">
          <FileTree :nodes="store.filteredFileTree" @select="handleFileSelect" creation-source="sidebar" />
        </div>
      </template>

      
      <div class="resize-handle" @mousedown.prevent="startResize"></div>
    </aside>

    <main class="main-content">
      <EditorSkeleton v-if="store.isSwitchingRepo || (store.isLoading && !store.currentFileContent && !isFolder)" />
      
      <template v-else>
        
        <header class="app-header glass-panel">
          <div class="header-left">
            <button
              class="icon-btn sidebar-toggle"
              @click="isSidebarOpen = !isSidebarOpen"
              :title="isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'"
            >
              <Menu v-if="showHamburger" :size="24" />
              <X v-else-if="isSidebarOpen" class="mobile-only" :size="24" />
              
            </button>
            <span class="file-path">{{ headerPathLabel }}</span>
          </div>

          <div class="header-right">
            <div id="header-actions" class="header-actions">
              
              <button
                v-if="filePath && !isFolder && store.isBinary"
                class="icon-btn"
                @click="deleteCurrentFile"
                title="Delete File"
              >
                <Trash2 :size="20" />
              </button>
              
              <button
                v-show="showAiTools && !isChatOpen"
                class="icon-btn ai-toggle"
                :class="{ 'desktop-hide': !isChatOpen }"
                @click="isChatOpen = !isChatOpen"
                title="AI Chat"
              >
                <Sparkles :size="20" />
              </button>
            </div>
          </div>
        </header>

        <div class="editor-wrapper">
          <FileTreeFolderView
            v-if="!filePath || isFolder"
            :nodes="!filePath ? rootFolderNodes : folderChildren"
            :current-path="!filePath ? rootFolderPath : filePath"
            creation-source="main-folder-view"
          />
          <UiMediaViewer
            v-else-if="store.isBinary"
            :content="store.currentFileContent"
            :path="store.currentFilePath || ''"
          />
          <Editor v-else @toggle-ai="isChatOpen = !isChatOpen" />
          
          <button
            v-if="!isChatOpen && showAiTools"
            class="fab-chat"
            @click="isChatOpen = !isChatOpen"
            title="Gemini AI Help"
          >
            <Sparkles :size="24" />
          </button>
        </div>
      </template>
    </main>

    <aside
      class="chat-sidebar glass-panel"
      :class="{ collapsed: !isChatOpen }"
      :style="{ width: isChatOpen ? `${chatSidebarWidth}px` : undefined }"
    >
      
      <div
        class="resize-handle-left"
        @mousedown.prevent="startChatResize"
      ></div>

      <GeminiChat :isOpen="isChatOpen" @close="isChatOpen = false" />
    </aside>
  </div>
</template>

<style scoped lang="scss">
.repo-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: var(--bg-dark-100);
   
  background: radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.03) 0%, transparent 20%),
              radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.03) 0%, transparent 20%),
              var(--bg-dark-100);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
}

.sidebar {
   
  width: v-bind('sidebarWidth + "px"');
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background: rgba(10, 10, 12, 0.6);  
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  z-index: 100;
  overflow-x: hidden;
  white-space: nowrap;
  flex-shrink: 0;

  &.collapsed {
    width: 0;
    border-right: none;
    opacity: 0;
    pointer-events: none;

     

  }

  @media (max-width: 640px) {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100% !important;  
    max-width: 100%;
    box-shadow: none;
    opacity: 1;
    pointer-events: auto;
    border-right: none;
    border: none;
    border-radius: 0;
    background: var(--bg-dark-100);  

    &.collapsed {
      width: 100% !important;
      transform: translateX(-100%);
      opacity: 1;
      pointer-events: none;

       
      &:hover {
        width: 100% !important;
        transform: translateX(-100%);
        opacity: 1;
        pointer-events: none;
      }
    }
  }
}

.sidebar-header {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 64px;
  background: rgba(255, 255, 255, 0.02);

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;  
  }

  h3 {
    font-size: 1.15rem;
    color: var(--color-primary);
    cursor: pointer;
    transition: color 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 700;
    letter-spacing: -0.01em;

    @media (hover: hover) {
      &:hover {
        color: var(--color-primary-dim);
        text-shadow: 0 0 15px rgba(124, 58, 237, 0.3);
      }
    }
  }

  .header-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

   
  .settings-btn, .collapse-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: var(--bg-dark-300);
      color: var(--text-primary);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateY(-1px);
    }
  }
}

.repo-info-stack {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
  min-width: 0;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.01);

  @media (max-width: 640px) {
    padding: 0.75rem;
  }

  .sidebar-actions-left,
  .sidebar-actions-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sidebar-actions-left {
    justify-content: flex-start;
  }

  .sidebar-actions-right {
    justify-content: flex-end;
    margin-left: auto;
  }

  .revert-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    min-width: 36px;
    min-height: 36px;
    background: hsla(0, 60%, 40%, 0.2);
    border: 1px solid hsla(0, 60%, 50%, 0.3);
    border-radius: var(--radius-sm);
    color: hsl(0, 70%, 65%);
    cursor: pointer;
    transition: all 0.2s;

    @media (max-width: 640px) {
      padding: 0.75rem;
    }

    @media (hover: hover) {
      &:hover {
        background: hsla(0, 60%, 45%, 0.4);
        border-color: hsla(0, 60%, 60%, 0.5);
        color: hsl(0, 75%, 70%);
      }
    }
  }

  .search-box {
    display: flex;
    align-items: center;
    background: var(--bg-dark-300);
    border-radius: var(--radius-sm);
    padding: 0 0.5rem;
    flex: 1;
    height: 36px;
    border: 1px solid var(--border-subtle);
    animation: expand-search 0.25s cubic-bezier(0.2, 0, 0, 1) forwards;
    transform-origin: left center;
    overflow: hidden;

    .search-icon {
      color: var(--text-muted);
      margin-right: 0.5rem;
      flex-shrink: 0;
    }

    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      width: 100%;
      min-width: 0;
      font-size: 0.9rem;
      padding: 0;
      height: 100%;
    }

    .close-search-btn {
      padding: 0.25rem;
      min-width: auto;
      min-height: auto;
      color: var(--text-muted);
      flex-shrink: 0;
      
      &:hover {
        color: var(--text-primary);
        background: transparent;
      }
    }
  }

  @keyframes expand-search {
    from {
      opacity: 0;
      transform: scaleX(0.9);
    }
    to {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  .search-toggle-btn {
    padding: 0.5rem;
    min-width: 36px;
    min-height: 36px;
    margin-right: 0.25rem;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 3rem;  
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
  position: relative;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    padding: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.app-header {
   
  width: 100%;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  flex-shrink: 0;
  border-radius: 0;  
  border-left: none;
  border-right: none;
  border-top: none;
  z-index: 10;  
  container-type: inline-size;

  @media (max-width: 640px) {
    height: auto;
    min-height: 60px;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-path {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;

     
    @container (max-width: 650px) {
      display: none;
    }
  }
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  min-width: 40px;  
  min-height: 40px;
  line-height: 0;  
  transition: background 0.2s, color 0.2s;

  @media (hover: hover) {
    &:hover {
      background: var(--bg-dark-200);
      color: var(--text-primary);
    }
  }
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.mobile-chat-toggle {
  display: none;
  @media (max-width: 1024px) {
    display: flex;
  }
}

.desktop-only {
  display: block;
  @media (max-width: 640px) {
    display: none;
  }
}

.mobile-only {
  display: none;
  @media (max-width: 640px) {
    display: flex;  
    align-items: center;
    justify-content: center;
  }
}

.mobile-hidden {
  @media (max-width: 640px) {
    display: none;
  }
}

.mobile-label {
  display: none;
  @media (max-width: 640px) {
    display: inline-block;
    margin-left: 0.75rem;
    font-size: 0.95rem;
  }
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

   
  background: linear-gradient(
    135deg,
    hsla(var(--hue-primary), 80%, 65%, 0.9),
    hsla(var(--hue-accent), 80%, 65%, 0.9),
    hsla(var(--hue-secondary), 80%, 65%, 0.9)
  );
  background-size: 200% 200%;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

   
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);

   
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

   
  animation: float 3s ease-in-out infinite, gradientShift 8s ease infinite;

   
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 255, 255, 0.4),
      transparent 60%
    );
    opacity: 0.6;
    transition: opacity 0.4s ease;
  }

   
  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
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
    box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.5),
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

  @media (max-width: 1024px) {
    display: none;
  }
}

 
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

 
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

  h2 {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
}

 
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;  
  height: 100%;
  cursor: col-resize;
  z-index: 101;  
  transition: background 0.2s;

  @media (max-width: 640px) {
    display: none;  
  }

  &:hover,
  &:active {
    background: var(--color-primary);
  }
}

.chat-sidebar {
  width: v-bind('chatSidebarWidth + "px"');
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-dark-100);
  transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease;
  z-index: 100;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;

  &.collapsed {
    width: 0;
    border-left: none;
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 100% !important;
    max-width: 100%;
    border-left: none;
    border: none;
    border-radius: 0;

    &.collapsed {
      width: 100% !important;
      transform: translateX(100%);
      opacity: 1;
      pointer-events: none;
    }
  }
}

.resize-handle-left {
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 101;
  transition: background 0.2s;

  @media (max-width: 640px) {
    display: none;
  }

  &:hover,
  &:active {
    background: var(--color-primary);
  }
}

@media (min-width: 1025px) {
  .desktop-hide {
    display: none !important;
  }
}
</style>
