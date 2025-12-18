<script setup lang="ts">
import {
    ChevronRight,
    File as FileIcon,
    FileText,
    Folder,
    Star
} from "lucide-vue-next";
import { useFileActions } from "~/composables/useFileActions";
import { useFileCreation } from "~/composables/useFileCreation";
import { useNodeContextMenu, type ContextMenuState } from "~/composables/useNodeContextMenu";
import { useGitStore, type FileNode } from "~/stores/git";
import ContextMenu from "./ContextMenu.vue";

const props = defineProps<{
  nodes: FileNode[];
  depth?: number;
}>();

const emit = defineEmits<{
  (e: "select", node: FileNode): void;
}>();

const store = useGitStore();
const route = useRoute();
const router = useRouter();
const { handleDrop } = useFileActions();

const expandedPaths = ref(new Set<string>());
const dragOverPath = ref<string | null>(null);


const CONTEXT_MENU_KEY = "fileTreeContextMenu";



const isRoot = props.depth === undefined;




const { contextMenu: localContextMenu, handleContextMenu: localHandleContextMenu, handleRootContextMenu, closeContextMenu } = useNodeContextMenu();

const contextMenu = isRoot
  ? localContextMenu
  : inject<Ref<ContextMenuState>>(CONTEXT_MENU_KEY)!; 


if (isRoot) {
  provide(CONTEXT_MENU_KEY, contextMenu);
}


const handleContextMenu = (e: MouseEvent, node: FileNode) => {
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    localHandleContextMenu(e, node, {
        onExpand: () => {
             if (!expandedPaths.value.has(node.path)) {
                toggleFolder(node);
             }
        }
    });

    if (!isRoot) {
        contextMenu.value = localContextMenu.value;
    }
};

const { triggerUpload } = useFileActions();

const toggleFolder = (node: FileNode, event?: Event) => {
  if (node.type !== "tree") return;

  
  const newSet = new Set(expandedPaths.value);
  if (newSet.has(node.path)) {
    newSet.delete(node.path);
  } else {
    newSet.add(node.path);
  }
  expandedPaths.value = newSet;
};

const selectFile = (node: FileNode) => {
  
  if (node.type === "tree") {
    const newSet = new Set(expandedPaths.value);
    newSet.add(node.path);
    expandedPaths.value = newSet;
  }

  emit("select", node);

  
  if (!store.currentRepo) return;
  const [owner, repo] = store.currentRepo.full_name.split("/");
  router.push({
    path: `/repo/${owner}/${repo}/${node.path}`,
    query: route.query,
  });
};

const getIcon = (node: FileNode) => {
  if (node.type === "tree") return Folder;
  if (node.name.endsWith(".md") || node.name.endsWith(".pdf") || node.name.endsWith(".txt")) return FileText;
  return FileIcon;
};


const creationInput = ref<HTMLInputElement | HTMLInputElement[] | null>(null);
const creationContainer = ref<HTMLElement | null>(null); 

const { creationName, confirmCreation, cancelCreation } = useFileCreation(
  creationContainer, 
  creationInput, 
  { enableClickOutside: isRoot }
);




watch(
  () => store.pendingCreation,
  async (val) => {
    if (val) {
      
      if (val.parentPath) {
        const newSet = new Set(expandedPaths.value);

        
        const pathParts = val.parentPath.split("/");
        let currentPath = "";
        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          newSet.add(currentPath);
        }

        expandedPaths.value = newSet;
      }
      await nextTick();

      
      const containerEl = Array.isArray(creationContainer.value)
        ? creationContainer.value[0]
        : creationContainer.value;

      if (containerEl instanceof Element) {
        containerEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  },
  { deep: true }
);


watch(
  () => store.currentFilePath,
  async (path) => {
    if (!path) return;

    
    for (const node of props.nodes) {
      if (node.type === "tree") {
        
        if (path.startsWith(node.path + "/")) {
          const newSet = new Set(expandedPaths.value);
          newSet.add(node.path);
          expandedPaths.value = newSet;
        }
      }
    }

    
    if (props.nodes.some((n) => n.path === path)) {
      await nextTick();
      const activeEl = document.querySelector(".file-tree .node-item.active");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  },
  { immediate: true }
);


watch(
  () => [props.nodes, store.searchQuery],
  () => {
    if (store.searchQuery) {
      const newSet = new Set(expandedPaths.value);
      let changed = false;
      for (const node of props.nodes) {
        if (node.type === "tree" && !newSet.has(node.path)) {
          newSet.add(node.path);
          changed = true;
        }
      }
      if (changed) {
        expandedPaths.value = newSet;
      }
    }
  },
  { immediate: true, deep: true }
);



const onNodeDragStart = (e: DragEvent, node: FileNode) => {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ path: node.path, type: node.type })
    );
    e.dataTransfer.setData("text/plain", node.path); 
  }
};

const onNodeDragOver = (e: DragEvent, node: FileNode) => {
  
  if (node.type !== "tree") return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = node.path;
};


const onNodeDrop = async (e: DragEvent, node: FileNode) => {
  if (node.type !== "tree") return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = null;

  
  const rawData = e.dataTransfer?.getData("application/json");
  if (rawData) {
    try {
      const data = JSON.parse(rawData);
      if (data.path && data.type) {
        
        
        if (node.path === data.path || node.path.startsWith(data.path + "/")) {
          return;
        }

        const newPath = node.path + "/" + data.path.split("/").pop();
        if (newPath !== data.path) {
          await store.moveNode(data.path, newPath, data.type);
        }
      }
    } catch (e) {
      console.error("Invalid drop data", e);
    }
    return;
  }

  if (e.dataTransfer?.files?.length) {
    await handleDrop(Array.from(e.dataTransfer.files), node.path);
    const newSet = new Set(expandedPaths.value);
    newSet.add(node.path);
    expandedPaths.value = newSet;
  }
};

const onRootDragOver = (e: DragEvent) => {
  if (props.depth) return; 
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = "root";
};

const onRootDrop = async (e: DragEvent) => {
  if (props.depth) return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = null;

  
  const rawData = e.dataTransfer?.getData("application/json");
  if (rawData) {
    try {
      const data = JSON.parse(rawData);
      if (data.path && data.type) {
        
        const newPath = data.path.split("/").pop() || "";
        if (newPath !== data.path) {
          await store.moveNode(data.path, newPath, data.type);
        }
      }
    } catch (e) {
      console.error("Invalid drop data", e);
    }
    return;
  }

  if (e.dataTransfer?.files?.length) {
    await handleDrop(Array.from(e.dataTransfer.files), ""); 
  }
};

const onDragLeave = (e: DragEvent) => {
  
  
  dragOverPath.value = null;
};
</script>

<template>
  <div
    class="file-tree"
    :class="{
      'root-drag-over': depth === undefined && dragOverPath === 'root',
    }"
    :style="{ paddingLeft: depth ? '1rem' : '0' }"
    @contextmenu="handleRootContextMenu"
    @dragover="onRootDragOver"
    @drop="onRootDrop"
    @dragleave.self="dragOverPath = null"
  >
    <div v-for="node in nodes" :key="node.path">
      <div
        class="node-item"
        :class="{
          active: store.currentFilePath === node.path,
          'drag-over': dragOverPath === node.path,
        }"
        :draggable="true"
        @contextmenu.stop="handleContextMenu($event, node)"
        @click="selectFile(node)"
        @dragstart="onNodeDragStart($event, node)"
        @dragover="onNodeDragOver($event, node)"
        @drop="onNodeDrop($event, node)"
        @dragleave="dragOverPath = null"
      >
        
        <span
          v-if="node.type === 'tree'"
          class="chevron"
          :class="{ expanded: expandedPaths.has(node.path) }"
          @click.stop="toggleFolder(node)"
        >
          <ChevronRight :size="16" />
        </span>
        <span v-else class="chevron-placeholder"></span>

        <div class="node-content">
          <component :is="getIcon(node)" class="icon" :size="18" />
          <span class="name">{{ node.name }}</span>
        </div>

        <button
          v-if="node.type === 'tree'"
          class="pin-btn"
          :class="{ active: store.mainFolder === node.path }"
          @click.stop="store.setMainFolder(node.path)"
          title="Set as main folder"
        >
          <Star
            :size="16"
            :fill="store.mainFolder === node.path ? 'currentColor' : 'none'"
          />
        </button>
      </div>

      
      <div
        v-if="node.type === 'tree' && expandedPaths.has(node.path)"
        class="children"
      >
        
        <div
          v-if="
            store.pendingCreation &&
            store.pendingCreation.parentPath === node.path
          "
          class="node-item creation-item"
          ref="creationContainer"
        >
          <span class="chevron-placeholder"></span>
          <div class="node-content">
            <span class="creation-icon-spacer" aria-hidden="true"></span>
            <UiTextInput
              ref="creationInput"
              v-model="creationName"
              @keydown.enter="confirmCreation"
              @keydown.esc="cancelCreation"
              class="creation-input"
              placeholder="Name..."
            />
          </div>
        </div>

        <FileTree
          v-if="node.children && node.children.length > 0"
          :nodes="node.children"
          :depth="(depth || 0) + 1"
          @select="emit('select', $event)"
        />
      </div>
    </div>

    
    <div
      v-if="
        store.pendingCreation &&
        store.pendingCreation.parentPath === null &&
        depth === undefined
      "
      class="node-item creation-item"
      ref="creationContainer"
    >
      <div class="node-content">
        <span class="creation-icon-spacer" aria-hidden="true"></span>
        <UiTextInput
          ref="creationInput"
          v-model="creationName"
          @keydown.enter="confirmCreation"
          @keydown.esc="cancelCreation"
          class="creation-input"
          placeholder="Name..."
        />
      </div>
    </div>
  </div>

  <ContextMenu
    v-if="depth === undefined"
    :visible="contextMenu.visible"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :actions="contextMenu.actions"
    @close="closeContextMenu"
  />
</template>

<style scoped lang="scss">
.file-tree {
  min-height: 100%;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 38px;
  border: 1px solid transparent;
  margin-bottom: 2px;
  position: relative;
  overflow: hidden;

   
  @media (max-width: 768px) {
    min-height: 48px;
    padding: 0.6rem 0.75rem;
  }

  @media (hover: hover) {
    &:hover {
       
      background: var(--bg-dark-300);
      transform: translateX(4px);
      color: var(--color-primary);
      
      .icon {
        opacity: 1;
      }
    }
  }

  &.active {
     
    background: var(--bg-dark-300);
    color: var(--color-primary);
    
    .icon {
      opacity: 1;
      color: var(--color-primary);
    }
  }

  &.drag-over {
    background: var(--bg-dark-300);
    border: 1px dashed var(--color-primary);
    color: var(--text-primary);
  }

  .name {
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;

    @media (max-width: 768px) {
      font-size: 16px;
    }
  }

  .node-content {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;
    pointer-events: none;
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    margin-right: 0.35rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: transform 0.2s, color 0.2s;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 4px;

    @media (max-width: 768px) {
      width: 32px;
      height: 32px;
      margin-right: 0.25rem;
    }

    @media (hover: hover) {
      &:hover {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.05);
      }
    }

    &.expanded {
      transform: rotate(90deg);
      color: var(--text-primary);
    }
  }

  .chevron-placeholder {
    width: 20px;
    margin-right: 0.35rem;
    display: inline-block;
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 32px;
      margin-right: 0.25rem;
    }
  }

  .icon {
    margin-right: 0.5rem;
    font-size: 1.1rem;
    flex-shrink: 0;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  &:hover .icon, &.active .icon {
    opacity: 1;
  }

   
  .pin-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;

    @media (hover: hover) {
      &:hover {
        color: var(--color-accent);
        background: rgba(255, 255, 255, 0.1);
        opacity: 1;
      }
    }

    &.active {
      color: var(--color-primary);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .pin-btn {
      opacity: 1;  
    }
  }

  @media (hover: hover) {
    &:hover .pin-btn {
      opacity: 1;
    }
  }
}

.file-tree.root-drag-over {
  outline: 2px dashed var(--color-primary);
  outline-offset: -4px;
  background: hsla(var(--hue-primary), 70%, 60%, 0.05);
  border-radius: var(--radius-lg);
}

.creation-input {
  background: var(--bg-dark-100) !important;
  border: 1px solid var(--color-primary) !important;
  color: var(--text-primary);
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  width: 100%;
  outline: none;
  min-height: 36px;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);

  @media (max-width: 768px) {
    min-height: 44px;
    font-size: 16px;
  }
}

.creation-icon-spacer {
  width: 18px;
  height: 18px;
  margin-right: 0.5rem;
  flex: 0 0 18px;
}
</style>
