<script setup lang="ts">
import { FileText, Image, Search, UploadCloud, Video, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useGitStore, type FileNode } from "~/stores/git";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "pick", payload: { path: string; type: "asset" | "note" }): void;
}>();

const store = useGitStore();
const searchQuery = ref("");
const mode = ref<"asset" | "note">("asset");
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadError = ref<string | null>(null);

const triggerUpload = () => {
  if (isUploading.value) return;
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  if (!file) return;

  isUploading.value = true;
  uploadError.value = null;
  
  
  let openFolder = "";
  if (store.currentFilePath) {
    const parts = store.currentFilePath.split("/");
    parts.pop(); 
    openFolder = parts.join("/");
  }

  
  const attachmentsFolder = openFolder ? `${openFolder}/attachments` : "attachments";
  const targetPath = `${attachmentsFolder}/${file.name}`;

  try {
    await store.uploadFile(targetPath, file);
    
    
    emit("pick", { path: targetPath, type: "asset" });
    emit("close");
  } catch (e: any) {
    console.error("Failed to upload file", e);
    uploadError.value = e.message || "Failed to upload file. Please try again.";
  } finally {
    isUploading.value = false;
    
    input.value = "";
  }
};

const items = computed(() => {
  const allItems: FileNode[] = [];

  const traverse = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === "tree" && node.children) {
        traverse(node.children);
      } else if (node.type === "blob") {
        const lowerName = node.name.toLowerCase();

        if (mode.value === "asset") {
          const isImage = [
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".svg",
            ".webp",
            ".bmp",
            ".ico",
            ".avif",
          ].some((ext) => lowerName.endsWith(ext));
          const isVideo = [
            ".mp4",
            ".webm",
            ".mov",
            ".avi",
            ".mkv",
            ".m4v",
            ".ogv",
          ].some((ext) => lowerName.endsWith(ext));
          if (isImage || isVideo) allItems.push(node);
        } else {
          
          if (lowerName.endsWith(".md")) {
            allItems.push(node);
          }
        }
      }
    }
  };

  traverse(store.fileTree);
  return allItems;
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const q = searchQuery.value.toLowerCase();
  return items.value.filter(
    (a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
  );
});

const getIcon = (filename: string) => {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".md")) return FileText;

  if (
    [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".ogv"].some((ext) =>
      lower.endsWith(ext)
    )
  ) {
    return Video;
  }
  return Image;
};

const selectItem = (path: string) => {
  emit("pick", { path, type: mode.value });
  emit("close");
};
</script>

<template>
  <div v-if="visible" class="asset-picker-overlay" @click.self="!isUploading && emit('close')">
    <div class="asset-picker-modal" style="position: relative;">
      <div class="modal-header">
        <h3>Insert {{ mode === "asset" ? "Asset" : "Note Link" }}</h3>
        <button class="close-btn" @click="emit('close')" :disabled="isUploading" :style="{ opacity: isUploading ? 0.5 : 1 }">
          <X :size="20" />
        </button>
      </div>

      <div class="mode-selector">
        <button :class="{ active: mode === 'asset' }" @click="mode = 'asset'">
          Assets
        </button>
        <button :class="{ active: mode === 'note' }" @click="mode = 'note'">
          Notes
        </button>
      </div>

      <div class="search-bar">
        <Search :size="16" class="search-icon" />
        <UiTextInput
          v-model="searchQuery"
          placeholder="Search..."
          autofocus
          class="search-input"
        />
      </div>

      <div v-if="uploadError" class="error-banner">
        <span>{{ uploadError }}</span>
        <button class="icon-btn" @click="uploadError = null" style="color: inherit; width: 24px; height: 24px;">
          <X :size="16" />
        </button>
      </div>

      <div class="assets-list">
        <div
          v-if="mode === 'asset' && !searchQuery"
          class="asset-item upload-item"
          @click="triggerUpload"
          :style="{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }"
        >
          <UploadCloud :size="18" class="asset-icon upload-icon" />
          <div class="asset-info">
            <span class="asset-name">Upload New Asset</span>
            <span class="asset-path">Upload and start using</span>
          </div>
        </div>

        <div
          v-for="item in filteredItems"
          :key="item.path"
          class="asset-item"
          @click="!isUploading && selectItem(item.path)"
          :style="{ cursor: isUploading ? 'not-allowed' : 'pointer' }"
        >
          <component :is="getIcon(item.name)" :size="18" class="asset-icon" />
          <div class="asset-info">
            <span class="asset-name">{{ item.name }}</span>
            <span class="asset-path">{{ item.path }}</span>
          </div>
        </div>

        <div v-if="filteredItems.length === 0" class="empty-state">
          No items found
        </div>
      </div>
      
      <div v-if="isUploading" class="upload-overlay">
        <div class="spinner"></div>
        <span>Uploading...</span>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      style="display: none"
      @change="handleFileUpload"
    />
  </div>
</template>

<style scoped lang="scss">
.asset-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}

.asset-picker-modal {
  background: var(--bg-dark-200);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-subtle);

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.mode-selector {
  display: flex;
  padding: 0 1rem;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);

  button {
    background: transparent;
    border: none;
    padding: 0.75rem 0.5rem;
    color: var(--text-muted);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    &:hover {
      color: var(--text-primary);
    }

    &.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  }
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);

  &:hover {
    color: var(--text-primary);
    background: var(--bg-dark-300);
  }
}

.search-bar {
  padding: 1rem;
  position: relative;

  .search-icon {
    position: absolute;
    left: 1.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
    z-index: 1;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: var(--bg-dark-300) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.95rem;

    &:focus {
      outline: none;
      border-color: var(--color-primary) !important;
    }
  }
}

.assets-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.5rem 1rem;
}

.asset-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background-color 0.2s;

  &:hover {
    background: var(--bg-dark-300);
  }
}

.asset-icon {
  color: var(--color-accent);
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.asset-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.asset-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-path {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.upload-icon {
  color: var(--color-primary);
}

.upload-item {
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 0.5rem;
  border-radius: var(--radius-md);
  
  &:hover {
    background: var(--bg-dark-300);
  }
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  flex-direction: column;
  gap: 1rem;
  color: white;
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background: rgba(220, 38, 38, 0.1);  
  border: 1px solid rgba(220, 38, 38, 0.5);
  color: #fca5a5;  
  padding: 0.75rem;
  margin: 0 1rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

