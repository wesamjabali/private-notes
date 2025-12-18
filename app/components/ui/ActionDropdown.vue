<script setup lang="ts">
import {
    Calendar,
    ChevronDown,
    FileText,
    FolderPlus,
    Plus,
    Upload,
} from "lucide-vue-next";
import { useDailyNote } from "~/composables/useDailyNote";
import { useDropdown } from "~/composables/useDropdown";
import ShinyButton from "./ShinyButton.vue";

defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "new-note"): void;
  (e: "new-folder"): void;
  (e: "upload"): void;
}>();

const { isOpen, triggerRef, menuRef, menuStyle, toggle, close } = useDropdown();

const { openDailyNote } = useDailyNote();

const handleAction = (event: "new-note" | "new-folder" | "upload" | "daily-note") => {
  if (event === "new-note") emit("new-note");
  else if (event === "new-folder") emit("new-folder");
  else if (event === "upload") emit("upload");
  else if (event === "daily-note") openDailyNote();

  close();
};

</script>

<template>
  <div class="action-dropdown">
    <ShinyButton
      ref="triggerRef"
      class="trigger-btn-shiny"
      @click.stop="toggle"
      :disabled="disabled"
      text="New"
      gradient-start="var(--color-primary)"
      gradient-end="#7c3aed"
    >
      <template #icon>
        <Plus :size="18" />
      </template>
      <ChevronDown 
        :size="14" 
        class="chevron ml-1" 
        :class="{ rotate: isOpen }" 
        style="margin-left: 4px; opacity: 0.8;"
      />
    </ShinyButton>

    <Teleport to="body">
      <transition name="dropdown-fade">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="action-dropdown-menu glass-panel"
          :style="menuStyle"
          @click.stop
        >
          <button @click="handleAction('new-note')" class="menu-item">
            <FileText :size="16" class="icon" />
            <span>New Note</span>
          </button>
           <button @click="handleAction('daily-note')" class="menu-item">
            <Calendar :size="16" class="icon" />
            <span>Daily Note</span>
          </button>
          <button @click="handleAction('new-folder')" class="menu-item">
            <FolderPlus :size="16" class="icon" />
            <span>New Folder</span>
          </button>
          <button @click="handleAction('upload')" class="menu-item">
            <Upload :size="16" class="icon" />
            <span>Upload Files</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.action-dropdown {
  position: relative;
  display: inline-block;
}

.trigger-btn-shiny {
   
  min-width: 100px;  
  padding: 0.6rem 1rem !important;  
  
  .chevron {
    transition: transform 0.2s;
  }
  
  .chevron.rotate {
    transform: rotate(180deg);
  }
}
</style>

<style lang="scss">
 
.action-dropdown-menu {
  position: fixed;
  min-width: 180px;
   
   
  background: var(--bg-dark-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  z-index: 9999;
}

.action-dropdown-menu .menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  margin-bottom: 2px;

  &:hover {
    background: var(--bg-dark-300);
    transform: translateX(4px);
    color: var(--color-primary);
  }

  .icon {
    margin-right: 0.75rem;
    opacity: 0.8;
  }
}

 
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.95);
}
</style>
