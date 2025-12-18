<script setup lang="ts">
import {
    File as FileIcon,
    FilePlus,
    FileText,
    Folder,
    FolderPlus,
    Image as ImageIcon,
    Upload,
} from "lucide-vue-next";
import { useFileActions } from "~/composables/useFileActions";
import { useFileCreation } from "~/composables/useFileCreation";
import { useNodeContextMenu } from "~/composables/useNodeContextMenu";
import { type FileNode } from "~/stores/git";
import ContextMenu from "./ContextMenu.vue";

const props = defineProps<{
  nodes: FileNode[];
  currentPath: string;
  creationSource?: string;
}>();

const router = useRouter();
const route = useRoute();
const store = useGitStore();

const navigateTo = (node: FileNode) => {
  const [owner, repo] = store.currentRepo!.full_name.split("/");
  router.push({
    path: `/repo/${owner}/${repo}/${node.path}`,
    query: route.query,
  });
};

const getIcon = (node: FileNode) => {
  if (node.type === "tree") return Folder;
  if (node.name.endsWith(".md")) return FileText;
  const imageExts = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".bmp",
    ".ico",
    ".avif",
  ];
  if (imageExts.some((ext) => node.name.toLowerCase().endsWith(ext)))
    return ImageIcon;
  return FileIcon;
};

const navigateUp = () => {
  const parts = props.currentPath.split("/").filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  parts.pop();
  const parentPath = parts.join("/");
  const [owner, repo] = store.currentRepo!.full_name.split("/");
  router.push({
    path: `/repo/${owner}/${repo}/${parentPath}`,
    query: route.query,
  });
};

const folders = computed(() => {
  const backItem = props.currentPath ? [{ name: "..", path: "..", type: "tree" as "tree" | "blob" }] : [];
  return [...backItem, ...props.nodes.filter((n) => n.type === "tree")];
});
const files = computed(() => props.nodes.filter((n) => n.type !== "tree"));


const { createFolder, createNote, triggerUpload, handleDrop } =
  useFileActions();

const onNewFolder = () => createFolder(props.currentPath, props.creationSource);
const onNewNote = () => createNote(props.currentPath, props.creationSource);
const onUpload = () => triggerUpload(props.currentPath);


const isDragging = ref(false);

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
};

const onDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;

  if (e.dataTransfer?.files) {
    const fileList = Array.from(e.dataTransfer.files);
    if (fileList.length > 0) {
      await handleDrop(fileList, props.currentPath);
    }
  }
};


const creationInput = ref<HTMLInputElement | null>(null);
const creationCard = ref<HTMLElement | null>(null);

const { creationName, confirmCreation, cancelCreation } = useFileCreation(
  creationCard, 
  creationInput,
  { enableClickOutside: true }
);



const {
  contextMenu,
  handleContextMenu,
  handleBackgroundContextMenu,
  closeContextMenu,
} = useNodeContextMenu();
</script>

<template>
  <div
    class="folder-view"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="closeContextMenu"
    @contextmenu="handleBackgroundContextMenu($event, props.currentPath, props.creationSource)"
  >
    <ClientOnly>
      <Teleport to="#header-actions">
        <div class="toolbar-actions">
          <button @click="onNewFolder" class="action-btn">
            <FolderPlus :size="18" class="icon" /> New Folder
          </button>
          <button @click="onNewNote" class="action-btn">
            <FilePlus :size="18" class="icon" /> New Note
          </button>
          <button @click="onUpload" class="action-btn">
            <Upload :size="18" class="icon" /> Upload
          </button>
        </div>
      </Teleport>
    </ClientOnly>

    <div class="bookshelf">
      
      <div v-if="folders.length > 0" class="shelf-section">
        <h3 class="shelf-label">Folders</h3>
        <div class="grid">
          
          <div
            v-if="
              store.pendingCreation &&
              store.pendingCreation.type === 'tree' &&
              store.pendingCreation.parentPath === currentPath &&
              ( (!store.pendingCreation.source && !creationSource) || (store.pendingCreation.source === creationSource) )
            "
            class="item-card folder-card creation-card"
            ref="creationCard"
          >
            <div class="folder-tab"></div>
            <div class="folder-body">
              <input
                ref="creationInput"
                v-model="creationName"
                @keydown.enter="confirmCreation(creationSource)"
                @keydown.esc="cancelCreation"
                class="creation-input"
                placeholder="New Folder"
              />
            </div>
          </div>

          <div
            v-for="folder in folders"
            :key="folder.path"
            class="item-card folder-card"
            @click="
              folder.path === '..' ? navigateUp() : navigateTo(folder as any)
            "
            @contextmenu="
              folder.path !== '..'
                ? handleContextMenu($event, folder as any, {}, creationSource)
                : undefined
            "
          >
            <div class="folder-tab"></div>
            <div class="folder-body">
              <Folder :size="32" class="icon" />
              <span class="name" :title="folder.name">{{ folder.name }}</span>
            </div>
          </div>
        </div>
      </div>

      
      <div v-if="files.length > 0" class="shelf-section">
        <h3 class="shelf-label">Documents</h3>
        <div class="grid">
          
          <div
            v-if="
              store.pendingCreation &&
              store.pendingCreation.type === 'blob' &&
              store.pendingCreation.parentPath === currentPath &&
              ( (!store.pendingCreation.source && !creationSource) || (store.pendingCreation.source === creationSource) )
            "
            class="item-card file-card creation-card"
            ref="creationCard"
          >
            <div class="paper-sheet">
              <div class="line"></div>
              <div class="line"></div>
              <div class="content-preview">
                <input
                  ref="creationInput"
                  v-model="creationName"
                  @keydown.enter="confirmCreation(creationSource)"
                  @keydown.esc="cancelCreation"
                  class="creation-input"
                  placeholder="New Note"
                />
              </div>
            </div>
          </div>

          <div
            v-for="file in files"
            :key="file.path"
            class="item-card file-card"
            @click="navigateTo(file)"
            @contextmenu="handleContextMenu($event, file, {}, creationSource)"
          >
            <div class="paper-sheet">
              <div class="line"></div>
              <div class="line"></div>
              <div class="line short"></div>
              <div class="content-preview">
                <component :is="getIcon(file)" :size="32" class="file-icon" />
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

    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :actions="contextMenu.actions"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped lang="scss">
.folder-view {
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-dark-100);
   
  background: radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.03) 0%, transparent 20%),
              radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.03) 0%, transparent 20%),
              var(--bg-dark-100);
}

.dragging {
  border: 2px dashed var(--color-primary);
  background: rgba(124, 58, 237, 0.05);
  border-radius: var(--radius-lg);
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--bg-dark-200), var(--bg-dark-300));
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &:hover {
    background: linear-gradient(135deg, var(--bg-dark-300), var(--bg-dark-400));
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .icon {
    font-size: 1.1rem;
    opacity: 0.8;
  }

  &:hover .icon {
    opacity: 1;
  }
}

.bookshelf {
  max-width: 1200px;
  margin: 0 auto;
}

.shelf-section {
  margin-bottom: 3rem;
}

.shelf-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-primary);
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0.75rem;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
}

.item-card {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-6px);
  }
}

 
.folder-card {
  position: relative;

  .folder-tab {
    width: 45px;
    height: 12px;
     
    background: linear-gradient(135deg, var(--bg-dark-300), var(--bg-dark-200)); 
    border-radius: 6px 6px 0 0;
    margin-bottom: -1px;
    box-shadow: 
      -1px -1px 3px rgba(255, 255, 255, 0.05),
      1px 1px 3px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-bottom: none;
    position: relative;
    z-index: 1;
  }

  .folder-body {
     
    background: linear-gradient(145deg, var(--bg-dark-300), var(--bg-dark-200));
    box-shadow: 
        5px 5px 10px rgba(0, 0, 0, 0.3), 
        -2px -2px 6px rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);

    border-radius: 0 var(--radius-md) var(--radius-md) var(--radius-md);
    padding: 1.25rem;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    .icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
      opacity: 0.7;
      color: var(--text-secondary);
      transition: all 0.2s;
    }
    .name {
      font-size: 0.95rem;
      font-weight: 500;
      text-align: center;
      color: var(--text-primary);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
  }

  &:hover .folder-body {
     
    transform: translateY(-4px);
    box-shadow: 
        8px 8px 16px rgba(0, 0, 0, 0.4), 
        -4px -4px 8px rgba(255, 255, 255, 0.05);
    background: linear-gradient(145deg, var(--bg-dark-300), var(--bg-dark-200));  
    border-color: rgba(255, 255, 255, 0.1);

    .icon {
      opacity: 1;
      color: var(--color-primary);  
      transform: scale(1.05);
    }
  }

  &:hover .folder-tab {
     
    transform: translateY(-4px);
    box-shadow: 
        -2px -2px 4px rgba(255, 255, 255, 0.05),
        2px 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.back-card {
  width: 150px;
  margin-bottom: 2rem;

  .folder-body {
    border-style: dashed;
    opacity: 0.7;
  }
  &:hover .folder-body {
    opacity: 1;
    border-style: solid;
  }
}

 
.file-card {
  .paper-sheet {
     
    background: linear-gradient(145deg, var(--bg-dark-300), var(--bg-dark-200));
    box-shadow: 
        5px 5px 10px rgba(0, 0, 0, 0.3), 
        -2px -2px 6px rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);

    height: 180px;
    border-radius: var(--radius-md);
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;

     
    .line {
      height: 4px;  
      background: var(--bg-dark-300);  
      border-radius: 2px;
      margin-bottom: 8px;
      
       
      box-shadow: 
        inset 1px 1px 3px rgba(0, 0, 0, 0.8),  
        inset -1px -1px 2px rgba(255, 255, 255, 0.05),  
        0 1px 0 rgba(255, 255, 255, 0.05);  
        
      opacity: 0.8;  
      
      position: relative;
      overflow: hidden;

       
      background: linear-gradient(90deg, var(--bg-dark-300), var(--bg-dark-400));

      &.short {
        width: 60%;
      }
    }

    .content-preview {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 0.5rem;

      .file-icon {
        font-size: 2rem;
        margin-bottom: 0.75rem;
        color: var(--text-secondary);
        opacity: 0.7;
        transition: all 0.2s;
         
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }
      .file-name {
        font-size: 0.85rem;
        color: var(--text-primary);
        text-align: center;
        word-break: break-word;
        line-height: 1.3;
        font-weight: 500;
      }
    }
  }

  &:hover .paper-sheet {
    transform: translateY(-4px);
    box-shadow: 
        8px 8px 16px rgba(0, 0, 0, 0.4), 
        -4px -4px 8px rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);

    .content-preview .file-icon {
      opacity: 1;
      color: var(--color-primary);
      transform: scale(1.05);
    }
  }
}

.empty-folder {
  text-align: center;
  color: var(--text-muted);
  padding: 4rem 2rem;
  background: var(--bg-dark-glass);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-subtle);

  p {
    font-size: 1rem;
    opacity: 0.7;
  }
}

.creation-input {
  background: var(--bg-dark-100) !important;
  border: 1px solid var(--color-primary) !important;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  width: 100%;
  outline: none;
  text-align: center;
  font-size: 0.9rem;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

 
.file-card.creation-card {
  .creation-input {
    color: var(--text-primary);
    caret-color: var(--color-primary);
  }

  .creation-input::placeholder {
    color: var(--text-muted);
  }
}
</style>
