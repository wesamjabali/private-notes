<script setup lang="ts">
import {
    CheckSquare,
    Clipboard,
    Copy,
    EllipsisVertical,
    Eye,
    Image as ImageIcon,
    Info,
    Loader2,
    Plus,
    Redo,
    RotateCcw,
    Save,
    Scissors,
    Trash2,
    Undo,
} from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useFileActions } from "~/composables/useFileActions";



import { useInsertActions } from "~/composables/useInsertActions";

import { useGeminiStore } from "~/stores/gemini";
import { useGitStore } from "~/stores/git";
import { useSettingsStore } from "~/stores/settings";
import { useUIStore } from "~/stores/ui";
import ContextMenu from "../file-tree/ContextMenu.vue";
import Dropdown from "../ui/Dropdown.vue";
import MarkdownHelpDialog from "../ui/MarkdownHelpDialog.vue";
import AssetPicker from "./AssetPicker.vue";
import ObsidianEditor from "./ObsidianEditor.vue";
import Preview from "./Preview.vue";

const store = useGitStore();
const ui = useUIStore();
const geminiStore = useGeminiStore();
const { deleteCurrentFile } = useFileActions();
const showPreview = ref(false);
const showAssetPicker = ref(false);
const showHelpDialog = ref(false);
const obsidianEditorRef = ref<InstanceType<typeof ObsidianEditor> | null>(null);
const settings = useSettingsStore();

const save = async () => {
  await store.saveCurrentFile();
};

const revert = async () => {
  const confirmed = await ui.openConfirmDialog(
    "Discard Changes",
    "Are you sure you want to discard your local changes? This cannot be undone.",
    "Discard",
    "Cancel",
    true
  );
  if (confirmed) {
    await store.revertFile();
  }
};

const handleAssetPick = (payload: { path: string; type: "asset" | "note" }) => {
  const opts = contextMenuInsertionPos.value ? { at: contextMenuInsertionPos.value } : undefined;

  if (payload.type === "asset") {
    
    const encodedPath = payload.path
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");
    const linkText = `![](${encodedPath})`;
    obsidianEditorRef.value?.insertText(linkText, opts);
  } else {
    
    const filename =
      payload.path.split("/").pop()?.replace(".md", "") || "Link";
    
    const encodedPath = payload.path
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");
    const linkText = `[${filename}](${encodedPath})`;
    obsidianEditorRef.value?.insertText(linkText, opts);
  }
  
  
  contextMenuInsertionPos.value = undefined;
};


const { insertItems } = useInsertActions(obsidianEditorRef, showAssetPicker);


const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuActions = ref<any[]>([]);
const contextMenuTarget = ref<{ id: string; code: string } | null>(null);
const contextMenuInsertionPos = ref<{ x: number; y: number } | undefined>(undefined);

const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenuX.value = e.clientX;
    contextMenuY.value = e.clientY;

    const clickPos = { x: e.clientX, y: e.clientY };

    
    const mapItems = (items: any[]): any[] => {
        return items.map(item => ({
            ...item,
            action: item.action ? () => {
                 if (item.label === "Asset / Image") {
                     contextMenuInsertionPos.value = clickPos;
                     item.action();
                 } else {
                     item.action({ at: clickPos });
                 }
            } : undefined,
            children: item.children ? mapItems(item.children) : undefined
        }));
    };

    const mappedInsertItems = mapItems(insertItems.value);

     contextMenuActions.value = [
        {
            label: "Insert",
            icon: Plus,
            children: mappedInsertItems
        },
        {
          label: "Undo",
          icon: Undo,
          action: () => obsidianEditorRef.value?.triggerAction("undo"),
        },
        {
          label: "Redo",
          icon: Redo, 
          action: () => obsidianEditorRef.value?.triggerAction("redo"),
        },
        {
          label: "Cut",
          icon: Scissors,
          action: () => obsidianEditorRef.value?.triggerAction("cut"),
        },
        {
          label: "Copy",
          icon: Copy,
          action: () => obsidianEditorRef.value?.triggerAction("copy"),
        },
        {
          label: "Paste",
          icon: Clipboard,
          action: () => obsidianEditorRef.value?.triggerAction("paste"),
        },
        {
          label: "Select All",
          icon: CheckSquare,
          action: () => obsidianEditorRef.value?.triggerAction("selectAll"),
        },
    ];
    contextMenuVisible.value = true;
};


const downloadMermaidPng = async () => {
    if (!contextMenuTarget.value) return;
    
    const container = document.getElementById(contextMenuTarget.value.id);
    if (!container) {
        alert("Could not find diagram element. Try hovering it again.");
        return;
    }
    
    const svg = container.querySelector('svg');
    if (svg) {
        
        const rasterize = (svg: SVGSVGElement) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const data = (new XMLSerializer()).serializeToString(svg);
            const img = new Image();
            const blob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            
            img.onload = () => {
                canvas.width = svg.getBoundingClientRect().width * 2; 
                canvas.height = svg.getBoundingClientRect().height * 2;
                ctx?.scale(2, 2);
                ctx?.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                
                
                const a = document.createElement('a');
                a.download = `mermaid-diagram-${Date.now()}.png`;
                a.href = canvas.toDataURL('image/png');
                a.click();
            };
            img.src = url;
        };
        rasterize(svg);
    } else {
        alert("SVG not found.");
    }
};

const mermaidActions = computed(() => [
  {
    label: "Download PNG",
    icon: ImageIcon,
    action: downloadMermaidPng,
  }
]);

const handleMermaidContextMenu = (e: Event) => {
    const customEvent = e as CustomEvent;
    const { x, y, id, code } = customEvent.detail;
    contextMenuX.value = x;
    contextMenuY.value = y;
    contextMenuTarget.value = { id, code }; 
    contextMenuActions.value = mermaidActions.value;
    contextMenuVisible.value = true;
};

const showAiTools = computed(() => !!settings.geminiApiKey);

const menuItems = computed(() => [
  {
      label: "Help",
      icon: Info,
      action: () => (showHelpDialog.value = true),
  },
  {
    label: "Revert Changes",
    icon: RotateCcw,
    action: revert,
    disabled: !store.isDirty,
  },
  {
    label: "Delete File",
    icon: Trash2,
    action: deleteCurrentFile,
    danger: true,
  },
]);

onMounted(() => {
    window.addEventListener("mermaid-context-menu", handleMermaidContextMenu);
});

onUnmounted(() => {
    window.removeEventListener("mermaid-context-menu", handleMermaidContextMenu);
});
</script>

<template>
  <div class="editor-container">
    <ClientOnly>
      <Teleport to="#header-actions">
        <div class="actions">


          <button
            class="btn-secondary"
            @click="showPreview = true"
            :disabled="ui.isLoading"
            title="Preview"
          >
            <Eye :size="18" />
            <span class="btn-text">Preview</span>
          </button>

          <Dropdown :items="insertItems" :icon="Plus" label="Insert" />

          <Dropdown
            :items="menuItems"
            :icon="EllipsisVertical"
            title="File Options"
          />

          <div class="spacer"></div>

          <button
            class="btn-primary"
            @click="save"
            :disabled="!store.isDirty || ui.isLoading"
            :title="ui.isSaving ? 'Saving...' : 'Save'"
          >
            <Loader2 v-if="ui.isSaving" :size="18" class="spin-icon" />
            <Save v-else :size="18" />
            <span class="btn-text">{{
              ui.isSaving ? "Saving..." : "Save"
            }}</span>
          </button>
        </div>
      </Teleport>

      <Teleport to="body">
        <Preview
          v-if="showPreview"
          :content="store.currentFileContent || ''"
          @close="showPreview = false"
        />
      </Teleport>
    </ClientOnly>

    <div class="editor-main" @contextmenu.capture="handleContextMenu">
      <div v-if="store.currentFileContent === null" class="loading-overlay">
        <div class="spinner"></div>
      </div>
      <ObsidianEditor
        v-else
        ref="obsidianEditorRef"
        :model-value="store.currentFileContent"
        :pending-content="geminiStore.pendingChange?.content"
        @update:model-value="store.updateContent"
        @save="save"
      />
    </div>

    <AssetPicker
      :visible="showAssetPicker"
      @close="showAssetPicker = false"
      @pick="handleAssetPick"
    />
    
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :actions="contextMenuActions"
      @close="contextMenuVisible = false"
    />

    <MarkdownHelpDialog 
        :is-open="showHelpDialog"
        @close="showHelpDialog = false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "sass:color";
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

   
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    gap: 0.25rem;
    padding-right: 0.5rem;  
    max-width: 100%;
    white-space: nowrap;

     
    :deep(.trigger-btn .label) {
      display: none;
    }
  }
}

.spacer {
  flex: 1;
}



.btn-primary {
  background: linear-gradient(145deg, var(--bg-dark-300), var(--bg-dark-200));
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 500;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  box-shadow: 
    -2px -2px 6px rgba(255, 255, 255, 0.05),
    2px 2px 6px rgba(0, 0, 0, 0.5);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 768px) {
    padding: 0.5rem;
    min-width: 36px;
    justify-content: center;
    min-height: 36px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: linear-gradient(145deg, var(--bg-dark-300), var(--bg-dark-100));
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.05),
      3px 3px 8px rgba(0, 0, 0, 0.6);
    color: var(--color-primary);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 
      inset 2px 2px 5px rgba(0, 0, 0, 0.6),
      inset -2px -2px 5px rgba(255, 255, 255, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);  
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);  
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 500;
  min-height: 36px;
  display: inline-flex;
  align-items: center;

  @media (max-width: 768px) {
    padding: 0.5rem;
    min-width: 36px;
    justify-content: center;
    min-height: 36px;
  }

  &:hover {
    background: var(--bg-dark-200);
    color: var(--text-primary);
    border-color: var(--border-color);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.editor-main {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-dark-200);

  @media (max-width: 768px) {
    border-radius: 0;
  }
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
  transition: background 0.2s, color 0.2s;

  @media (hover: hover) {
    &:hover {
      background: var(--bg-dark-200);
      color: var(--text-primary);
    }
  }
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  background: v-bind("settings.editorBackgroundColor");
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin-icon {
  animation: spin 1s linear infinite;
}

.btn-text {
  margin-left: 0.5rem;

  @media (max-width: 768px) {
    display: none;
  }
}
</style>
