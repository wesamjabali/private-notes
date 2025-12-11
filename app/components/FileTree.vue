<script setup lang="ts">
import { useFileActions } from "~/composables/useFileActions";
import { useGitHubStore, type FileNode } from "~/stores/github";
import ContextMenu from "./ContextMenu.vue";

const props = defineProps<{
  nodes: FileNode[];
  depth?: number;
}>();

const store = useGitHubStore();
const route = useRoute();
const router = useRouter();
const { handleDrop } = useFileActions();

const expandedPaths = ref(new Set<string>());
const dragOverPath = ref<string | null>(null);

// Context Menu State - shared across all recursive instances via provide/inject
type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  actions: {
    label: string;
    icon?: string;
    action: () => void;
    danger?: boolean;
  }[];
};

const CONTEXT_MENU_KEY = "fileTreeContextMenu";

// Root instance creates and provides the context menu state
// Child instances inject it
const isRoot = props.depth === undefined;

const contextMenu = isRoot
  ? ref<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
      actions: [],
    })
  : inject<Ref<ContextMenuState>>(
      CONTEXT_MENU_KEY,
      ref({
        visible: false,
        x: 0,
        y: 0,
        actions: [],
      })
    );

// Provide context menu to child instances (only root provides)
if (isRoot) {
  provide(CONTEXT_MENU_KEY, contextMenu);
}

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

const handleContextMenu = (e: MouseEvent, node: FileNode) => {
  e.preventDefault();
  e.stopPropagation();

  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    actions: [
      {
        label: "Rename",
        icon: "✏️",
        action: () => promptRename(node),
      },
      {
        label: node.type === "tree" ? "Delete Folder" : "Delete File",
        icon: "🗑️",
        danger: true,
        action: () => confirmDelete(node),
      },
    ],
  };

  if (node.type === "tree") {
    contextMenu.value.actions.unshift(
      {
        label: "Set as Root",
        icon: "📌",
        action: () => store.setMainFolder(node.path),
      },
      {
        label: "New Note",
        icon: "📝",
        action: () => {
          store.startCreation(node.path, "blob"); // Start inline creation inside folder
          // Expand folder if needed
          if (!expandedPaths.value.has(node.path)) {
            toggleFolder(node);
          }
        },
      },
      {
        label: "New Folder",
        icon: "📁",
        action: () => {
          store.startCreation(node.path, "tree");
          if (!expandedPaths.value.has(node.path)) {
            toggleFolder(node);
          }
        },
      },
      {
        label: "Upload Files",
        icon: "📤",
        action: () => triggerUpload(node.path),
      }
    );
  }
};

const handleRootContextMenu = (e: MouseEvent) => {
  if (props.depth) return; // Only on root root
  e.preventDefault();
  e.stopPropagation();

  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    actions: [
      {
        label: "New Note",
        icon: "📝",
        action: () => store.startCreation(null, "blob"),
      },
      {
        label: "New Folder",
        icon: "📁",
        action: () => store.startCreation(null, "tree"),
      },
      { label: "Upload Files", icon: "📤", action: () => triggerUpload(null) },
    ],
  };
};

const promptRename = async (node: FileNode) => {
  const newName = prompt(`Rename ${node.name} to:`, node.name);
  if (newName && newName !== node.name) {
    try {
      const parts = node.path.split("/");
      parts.pop(); // remove old name
      const parentPath = parts.join("/");
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      await store.renameNode(node.path, newPath, node.type);
    } catch (e: any) {
      alert(e.message);
    }
  }
};

const confirmDelete = async (node: FileNode) => {
  if (confirm(`Are you sure you want to delete ${node.name}?`)) {
    try {
      await store.deleteFile(
        node.path,
        node.sha || "tree",
        `Delete ${node.name}`
      );
    } catch (e: any) {
      alert(e.message);
    }
  }
};

const { triggerUpload } = useFileActions();

const toggleFolder = (node: FileNode, event?: Event) => {
  if (node.type !== "tree") return;

  // Create new set to trigger reactivity
  const newSet = new Set(expandedPaths.value);
  if (newSet.has(node.path)) {
    newSet.delete(node.path);
  } else {
    newSet.add(node.path);
  }
  expandedPaths.value = newSet;
};

const selectFile = (node: FileNode) => {
  // If it's a folder, expand it when selecting
  if (node.type === "tree") {
    const newSet = new Set(expandedPaths.value);
    newSet.add(node.path);
    expandedPaths.value = newSet;
  }

  // Always navigate
  if (!store.currentRepo) return;
  const [owner, repo] = store.currentRepo.full_name.split("/");
  router.push({
    path: `/repo/${owner}/${repo}/${node.path}`,
    query: route.query,
  });
};

const getIcon = (node: FileNode) => {
  if (node.type === "tree") return "📁";
  if (node.name.endsWith(".md")) return "📝";
  return "📄";
};

// Creation Logic
const creationName = ref("");
const creationInput = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

// Watch for pending creation to auto-focus and auto-expand
watch(
  () => store.pendingCreation,
  async (val) => {
    if (val) {
      creationName.value = "";
      // If creating inside a folder, ensure it's expanded
      if (val.parentPath) {
        const newSet = new Set(expandedPaths.value);
        newSet.add(val.parentPath);
        expandedPaths.value = newSet;
      }
      await nextTick();
      if (Array.isArray(creationInput.value)) {
        creationInput.value[0]?.focus();
      } else {
        creationInput.value?.focus();
      }
    }
  },
  { deep: true }
);

// Watch for active file to auto-expand and scroll
watch(
  () => store.currentFilePath,
  async (path) => {
    if (!path) return;

    // 1. Expand folders if they contain the active file
    for (const node of props.nodes) {
      if (node.type === "tree") {
        // Check if this folder is a parent/ancestor of the active path
        if (path.startsWith(node.path + "/")) {
          const newSet = new Set(expandedPaths.value);
          newSet.add(node.path);
          expandedPaths.value = newSet;
        }
      }
    }

    // 2. Scroll into view
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

const onConfirmCreation = async () => {
  if (creationName.value) {
    await store.confirmCreation(creationName.value);
  } else {
    store.cancelCreation();
  }
};

// Drag and Drop
const onNodeDragStart = (e: DragEvent, node: FileNode) => {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ path: node.path, type: node.type })
    );
    e.dataTransfer.setData("text/plain", node.path); // Fallback
  }
};

const onNodeDragOver = (e: DragEvent, node: FileNode) => {
  // Allow dropping on folders
  if (node.type !== "tree") return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = node.path;
};

// Drop logic
const onNodeDrop = async (e: DragEvent, node: FileNode) => {
  if (node.type !== "tree") return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = null;

  // Check internal move
  const rawData = e.dataTransfer?.getData("application/json");
  if (rawData) {
    try {
      const data = JSON.parse(rawData);
      if (data.path && data.type) {
        // Moving data.path to node.path
        // Prevent moving into self or child
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
  if (props.depth) return; // Only on root root
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = "root";
};

const onRootDrop = async (e: DragEvent) => {
  if (props.depth) return;
  e.preventDefault();
  e.stopPropagation();
  dragOverPath.value = null;

  // Check internal move
  const rawData = e.dataTransfer?.getData("application/json");
  if (rawData) {
    try {
      const data = JSON.parse(rawData);
      if (data.path && data.type) {
        // Moving to root
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
    await handleDrop(Array.from(e.dataTransfer.files), ""); // root
  }
};

const onDragLeave = (e: DragEvent) => {
  // Basic debounce or check could be better but this resets on leaving any child too
  // For now simple check
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
        <!-- Chevron for folders -->
        <span
          v-if="node.type === 'tree'"
          class="chevron"
          :class="{ expanded: expandedPaths.has(node.path) }"
          @click.stop="toggleFolder(node)"
        >
          ▶
        </span>
        <span v-else class="chevron-placeholder"></span>

        <div class="node-content">
          <span class="icon">{{ getIcon(node) }}</span>
          <span class="name">{{ node.name }}</span>
        </div>

        <button
          v-if="node.type === 'tree'"
          class="pin-btn"
          :class="{ active: store.mainFolder === node.path }"
          @click.stop="store.setMainFolder(node.path)"
          title="Set as main folder"
        >
          {{ store.mainFolder === node.path ? "★" : "☆" }}
        </button>
      </div>

      <!-- Recursive Children -->
      <div
        v-if="node.type === 'tree' && expandedPaths.has(node.path)"
        class="children"
      >
        <!-- Creation Input (if this node is the parent) -->
        <div
          v-if="
            store.pendingCreation &&
            store.pendingCreation.parentPath === node.path
          "
          class="node-item creation-item"
        >
          <span class="chevron-placeholder"></span>
          <div class="node-content">
            <span class="icon">{{
              store.pendingCreation.type === "tree" ? "📁" : "📝"
            }}</span>
            <input
              ref="creationInput"
              v-model="creationName"
              @keydown.enter="onConfirmCreation"
              @keydown.esc="store.cancelCreation()"
              @blur="store.cancelCreation()"
              class="creation-input"
              placeholder="Name..."
            />
          </div>
        </div>

        <FileTree
          v-if="node.children && node.children.length > 0"
          :nodes="node.children"
          :depth="(depth || 0) + 1"
        />
      </div>
    </div>

    <!-- Root Level Creation Input -->
    <div
      v-if="
        store.pendingCreation &&
        store.pendingCreation.parentPath === null &&
        depth === undefined
      "
      class="node-item creation-item"
    >
      <div class="node-content">
        <span class="icon">{{
          store.pendingCreation.type === "tree" ? "📁" : "📝"
        }}</span>
        <input
          ref="creationInput"
          v-model="creationName"
          @keydown.enter="onConfirmCreation"
          @keydown.esc="store.cancelCreation()"
          @blur="store.cancelCreation()"
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
.node-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.75rem; /* Increased vertical padding for touch */
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all 0.2s;
  min-height: 40px; /* Minimum touch target height */
  border: 1px solid transparent;

  &:hover {
    background: var(--bg-dark-300);
    color: var(--text-primary);
  }

  &.active {
    background: var(--color-primary-dim);
    color: white;
  }

  &.drag-over {
    background: var(--bg-dark-300);
    border-color: var(--color-primary);
    color: var(--text-primary);
  }

  .name {
    font-size: 1rem; /* Increased font size */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-content {
    display: flex; /* Ensure flex layout */
    align-items: center;
    flex: 1;
    overflow: hidden;
    pointer-events: none; /* Let drag events pass to parent */
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    margin-right: 0.5rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: transform 0.2s;
    width: 24px; /* Larger hit area */
    height: 24px;

    &:hover {
      color: var(--text-primary);
    }

    &.expanded {
      transform: rotate(90deg);
    }
  }

  .chevron-placeholder {
    width: 24px;
    margin-right: 0.5rem;
    display: inline-block;
  }

  .icon {
    margin-right: 0.5rem;
    font-size: 1.1rem;
  }

  .pin-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.2rem; /* Larger icon */
    padding: 0.25rem; /* Larger hit area */
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

  /* Show pin button always on mobile if active, or maybe just handle hover via tap? 
     On mobile hover is tricky. Let's keep opacity 0 behavior but maybe show if active. 
  */
  @media (max-width: 768px) {
    .pin-btn.active {
      opacity: 1;
    }
  }

  &:hover .pin-btn {
    opacity: 1;
  }
}

.file-tree.root-drag-over {
  outline: 2px dashed var(--color-primary);
  outline-offset: -2px;
  background: hsla(var(--hue-primary), 70%, 60%, 0.05);
}

.creation-input {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--text-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  outline: none;
  min-height: 36px;
}
</style>
