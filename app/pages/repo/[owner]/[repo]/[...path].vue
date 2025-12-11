<script setup lang="ts">
import MediaViewer from "~/components/MediaViewer.vue";
import { useGitHubStore } from "~/stores/github";

import FolderView from "~/components/FolderView.vue";
import { useFileActions } from "~/composables/useFileActions";

// Route params: /repo/:owner/:repo/:path*
const route = useRoute();
const router = useRouter();
const store = useGitHubStore();

const owner = route.params.owner as string;
const repoName = route.params.repo as string;
// path is an array of strings
const pathSegments = computed(() => (route.params.path as string[]) || []);
const filePath = computed(() => pathSegments.value.join("/"));

const fileNode = computed(() => store.getNodeByPath(filePath.value));
const isFolder = computed(() => fileNode.value?.type === "tree");
const folderChildren = computed(() => fileNode.value?.children || []);

// Sidebar Actions
const { createFolder, createNote, triggerUpload, deleteCurrentFile } =
  useFileActions();

const revertAll = async () => {
  if (
    confirm(
      "Are you sure you want to discard ALL unsaved changes? This cannot be undone."
    )
  ) {
    await store.revertAll();
  }
};

const activeSidebarPath = computed(() => {
  if (!store.currentFilePath) return "";
  const node = store.getNodeByPath(store.currentFilePath);
  if (node?.type === "tree") return node.path;
  // If file, get parent
  const parts = store.currentFilePath.split("/");
  parts.pop();
  return parts.join("/");
});

const isSidebarOpen = ref(true);
const isChatOpen = ref(false);
const sidebarWidth = ref(300); // Default width
const isResizing = ref(false);
const chatSidebarWidth = ref(350);
const isChatResizing = ref(false);

// Close sidebar on route change on mobile
watch(
  () => route.fullPath,
  () => {
    if (window.innerWidth <= 768) {
      const p = ((route.params.path as string[]) || []).join("/");
      const node = store.getNodeByPath(p);
      // Only close if it's a file (blob)
      if (node && node.type === "blob") {
        isSidebarOpen.value = false;
      }
    }
  }
);

const startResize = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none"; // Prevent text selection
};

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return;

  // Collapse if dragged too small
  if (e.clientX < 100) {
    isSidebarOpen.value = false;
    stopResize();
    sidebarWidth.value = 300; // Reset to default for next open
    return;
  }

  // Constraints
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

  // Calculate width from right edge
  const newWidth = window.innerWidth - e.clientX;

  // Collapse if dragged too small
  if (newWidth < 100) {
    isChatOpen.value = false;
    stopChatResize();
    chatSidebarWidth.value = 350;
    return;
  }

  // Constraints
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
  // Navigate to the root of the repo
  router.push(`/repo/${owner}/${repoName}/`);
};

// Verification logic
onMounted(async () => {
  const initialRoot = route.query.root as string;

  // Auto-close sidebar on mobile initially
  if (window.innerWidth <= 768) {
    isSidebarOpen.value = false;
  }

  // If no token or no user (implies not init), try init
  if (!store.token || !store.user) {
    // try init first
    await store.init();
    if (!store.token) {
      router.push("/");
      return;
    }
  }

  // Ensure we have current repo loaded
  if (!store.currentRepo || store.currentRepo.name !== repoName) {
    // Need to find repo obj or fetch it.
    // For now, assume they came from dashboard or we force fetch repos
    if (store.repos.length === 0) await store.fetchRepos();
    let found = store.repos.find(
      (r) => r.name === repoName && r.full_name.includes(owner)
    );

    if (!found) {
      // Try fetching directly
      const repo = await store.fetchRepo(owner, repoName);
      if (repo) found = repo;
    }

    if (found) {
      await store.selectRepo(found);
    } else {
      console.error("Repo not found");
      router.push("/"); // fallback
      return;
    }
  }

  // Restore root if it was present initially (even if selectRepo cleared it)
  if (initialRoot) {
    store.setMainFolder(initialRoot, false);
  }

  // If path exists, open it
  if (filePath.value) {
    const node = store.getNodeByPath(filePath.value);
    if (node && node.type === "tree") {
      store.currentFilePath = filePath.value;
      store.currentFileContent = "";
    } else {
      const success = await store.openFile(filePath.value);
      if (!success) {
        // File doesn't exist, navigate to parent
        const parts = filePath.value.split("/");
        parts.pop();
        const parentPath = parts.join("/");
        router.replace(`/repo/${owner}/${repoName}/${parentPath}`);
      }
    }
  }

  // If we just set mainFolder, ensure the URL reflects it (in case selectRepo cleared it)
  // The watcher will handle this, but if we lost it in the middle, we need to put it back.
  // The watcher reacts to store changes.
  // If selectRepo -> mainFolder=null -> watcher removes param.
  // Then setMainFolder -> mainFolder=val -> watcher adds param.
  // So theoretically it should bounce back.
  // BUT if the router replace happens too fast/slow, we might lose it.
  // Sync logic is good, but let's be sure.
});

// Watch for path changes
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
          // File doesn't exist (e.g., deleted), navigate to parent
          const parts = p.split("/");
          parts.pop();
          const parentPath = parts.join("/");
          router.replace(`/repo/${owner}/${repoName}/${parentPath}`);
        }
      }
    }
  }
);

// Sync mainFolder state to URL query param
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
  <div class="repo-layout">
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
      <div class="sidebar-header">
        <h3 @click="navigateToRoot" class="repo-title" title="Go to Repo Root">
          {{ repoName }}
        </h3>

        <button
          class="icon-btn collapse-btn"
          @click="isSidebarOpen = false"
          title="Collapse Sidebar"
        >
          <span class="desktop-only">«</span>
          <span class="mobile-only">✕</span>
        </button>
      </div>

      <div class="sidebar-actions">
        <button
          class="icon-btn sm"
          @click="createFolder(activeSidebarPath)"
          title="New Folder"
        >
          📁+
        </button>
        <button
          class="icon-btn sm"
          @click="createNote(activeSidebarPath)"
          title="New Note"
        >
          📝+
        </button>
        <button
          class="icon-btn sm"
          @click="triggerUpload(activeSidebarPath)"
          title="Upload File"
        >
          ⬆️
        </button>
        <button
          class="icon-btn sm"
          @click="store.showHiddenFiles = !store.showHiddenFiles"
          :title="store.showHiddenFiles ? 'Hide dotfiles' : 'Show dotfiles'"
        >
          {{ store.showHiddenFiles ? "👁️" : "🙈" }}
        </button>
        <button
          v-if="store.hasUnsavedChanges"
          class="icon-btn sm revert-all"
          @click="revertAll"
          title="Revert All Unsaved Changes"
        >
          ↩️
        </button>
      </div>

      <div class="sidebar-content">
        <div
          v-if="store.isLoading && store.fileTree.length === 0"
          class="loading"
        >
          Loading Tree...
        </div>
        <FileTree :nodes="store.filteredFileTree" />
      </div>

      <!-- Resize Handle -->
      <div class="resize-handle" @mousedown.prevent="startResize"></div>
    </aside>

    <main class="main-content">
      <!-- Unified App Header -->
      <header class="app-header glass-panel">
        <div class="header-left">
          <button
            class="icon-btn sidebar-toggle"
            @click="isSidebarOpen = !isSidebarOpen"
            :title="isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'"
          >
            <span v-if="!isSidebarOpen">☰</span>
            <span v-else class="mobile-only">✕</span>
            <!-- Mobile close icon -->
          </button>
          <span class="file-path">{{
            store.currentFilePath || "No file selected"
          }}</span>
        </div>

        <div class="header-right">
          <div id="header-actions" class="header-actions">
            <button
              v-if="filePath && !isFolder"
              class="icon-btn"
              @click="deleteCurrentFile"
              title="Delete File"
            >
              🗑️
            </button>
          </div>
          <button
            class="icon-btn mobile-chat-toggle"
            @click="isChatOpen = !isChatOpen"
          >
            ✨
          </button>
        </div>
      </header>

      <div v-if="filePath" class="editor-wrapper">
        <FolderView
          v-if="isFolder"
          :nodes="folderChildren"
          :current-path="filePath"
        />
        <MediaViewer
          v-else-if="store.isBinary"
          :content="store.currentFileContent"
          :path="store.currentFilePath || ''"
        />
        <Editor v-else />
        <!-- Floating chat toggle for desktop -->
        <button
          v-if="!isChatOpen"
          class="fab-chat"
          @click="isChatOpen = !isChatOpen"
          title="Gemini AI Help"
        >
          ✨
        </button>
      </div>
      <div v-else class="empty-state flex-center">
        <div class="text-center">
          <h2>Select a file to edit</h2>
          <p class="text-muted">Choose a markdown file from the sidebar</p>
        </div>
      </div>
    </main>

    <aside
      class="chat-sidebar glass-panel"
      :class="{ collapsed: !isChatOpen }"
      :style="{ width: isChatOpen ? `${chatSidebarWidth}px` : undefined }"
    >
      <!-- Resize Handle (Left side) -->
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
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  backdrop-filter: blur(2px);
}

.sidebar {
  /* width: 300px;  Removed fixed width */
  width: v-bind('sidebarWidth + "px"');
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-dark-100); /* override glass slightly for solidity */
  transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease;
  z-index: 100;
  overflow-x: hidden;
  white-space: nowrap;

  &.collapsed {
    width: 0;
    border-right: none;
    opacity: 0;
    pointer-events: none;

    /* Expand on hover (desktop only) */
    &:hover {
      width: 300px;
      opacity: 1;
      pointer-events: auto;
      border-right: 1px solid var(--border-subtle);
    }
  }

  @media (max-width: 768px) {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100% !important; /* Full screen for mobile */
    max-width: 100%;
    box-shadow: none;
    opacity: 1;
    pointer-events: auto;
    border-right: none;
    border-radius: 0;

    &.collapsed {
      width: 100% !important;
      transform: translateX(-100%);
      opacity: 1;
      pointer-events: none;

      /* Disable hover on mobile */
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
  padding: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 60px;

  h3 {
    font-size: 1.1rem;
    color: var(--color-primary);
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--color-primary-light);
      text-decoration: underline;
    }
  }
}

.sidebar-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-dark-200);
  overflow-x: auto;
  flex-wrap: wrap;

  .icon-btn.sm {
    font-size: 1.1rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-dark-100);
    border: 1px solid var(--border-subtle);
    flex: 1;
    min-width: 40px;

    &:hover {
      border-color: var(--color-primary-dim);
      background: var(--bg-dark-300);
    }

    &.revert-all {
      background: hsla(0, 60%, 40%, 0.3);
      border-color: hsla(0, 60%, 50%, 0.5);

      &:hover {
        background: hsla(0, 60%, 45%, 0.5);
        border-color: hsla(0, 60%, 60%, 0.7);
      }
    }
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 3rem; /* Space for bottom elements if any */
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: var(--bg-dark-100);
  width: 100%; /* Ensure full width */
}

.editor-wrapper {
  flex: 1;
  height: 100%;
  overflow: hidden;
  padding: 0 1rem 1rem 1rem;
  position: relative;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.app-header {
  /* Full width, no margins for cleaner look */
  width: 100%;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  flex-shrink: 0;
  border-radius: 0; /* Full width bar */
  border-left: none;
  border-right: none;
  border-top: none;
  z-index: 10; /* Ensure above editor content */

  @media (max-width: 768px) {
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
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;

    /* Mobile adjustment */
    @media (max-width: 768px) {
      max-width: 150px;
      font-size: 0.8rem;
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
  min-width: 40px; /* Ensure 40x40 min touch target */
  min-height: 40px;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: var(--bg-dark-200);
    color: var(--text-primary);
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
  @media (max-width: 768px) {
    display: none;
  }
}

.mobile-only {
  display: none;
  @media (max-width: 768px) {
    display: block;
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

  /* Liquid Glass Effect */
  background: linear-gradient(
    135deg,
    hsla(var(--hue-primary), 80%, 65%, 0.9),
    hsla(var(--hue-accent), 80%, 65%, 0.9),
    hsla(var(--hue-secondary), 80%, 65%, 0.9)
  );
  background-size: 200% 200%;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

  /* Glass border and shadow */
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);

  /* Smooth transitions */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Floating animation */
  animation: float 3s ease-in-out infinite, gradientShift 8s ease infinite;

  /* Inner glow */
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

  /* Outer glow ring */
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

/* Floating animation */
@keyframes float {
  0%,
  100% {
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

  h2 {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
}

/* Scrollbar for sidebar */
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px; /* Hit area */
  height: 100%;
  cursor: col-resize;
  z-index: 101; /* Above sidebar content */
  transition: background 0.2s;

  @media (max-width: 768px) {
    display: none; /* Disable resize on mobile */
  }

  &:hover,
  &:active {
    background: var(--color-primary);
  }
}

.chat-sidebar {
  width: v-bind('chatSidebarWidth + "px"');
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-dark-100);
  transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease;
  z-index: 100;
  overflow: hidden;
  position: relative;

  &.collapsed {
    width: 0;
    border-left: none;
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 100% !important;
    max-width: 100%;
    border-left: none;

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

  @media (max-width: 768px) {
    display: none;
  }

  &:hover,
  &:active {
    background: var(--color-primary);
  }
}
</style>
