<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

interface ContextAction {
  label: string;
  icon?: any;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  children?: ContextAction[];
}

const props = defineProps<{
  visible: boolean;
  x?: number;
  y?: number;
  actions: ContextAction[];
  triggerRect?: DOMRect | null;
  isSubmenu?: boolean;
}>();

const emit = defineEmits(["close", "mouseenter", "mouseleave"]);
const menuRef = ref<HTMLElement | null>(null);


const menuStyle = ref({ top: '0px', left: '0px', maxHeight: 'none' });


const activeSubmenuIndex = ref<number | null>(null);
const activeSubmenuTriggerRect = ref<DOMRect | null>(null);


const hoverTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const closeTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const isHoveringSelf = ref(false);
const isHoveringSubmenu = ref(false);


watch(() => props.visible, (newVal) => {
    if (newVal) {
        activeSubmenuIndex.value = null;
        isHoveringSelf.value = false;
        isHoveringSubmenu.value = false;
        if (closeTimeout.value) clearTimeout(closeTimeout.value);
        if (hoverTimeout.value) clearTimeout(hoverTimeout.value);
        
        nextTick(updatePosition);
    }
});

const updatePosition = async () => {
    if (!props.visible || !menuRef.value) return;
    
    await nextTick();
    if (!menuRef.value) return;

    const rect = menuRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const PADDING = 10;
    
    if (props.isSubmenu && props.triggerRect) {
         
         const trigger = props.triggerRect;
         let left = trigger.right;
         let top = trigger.top;

         
         if (left + rect.width > viewportWidth - PADDING) {
             left = trigger.left - rect.width;
             if (left < PADDING) left = PADDING;
         }

         
         const maxHeight = Math.max(100, viewportHeight - top - PADDING);
         
         menuStyle.value = {
             top: `${top}px`,
             left: `${left}px`,
             maxHeight: `${maxHeight}px`
         };
    } else {
        
        let newX = props.x || 0;
        let newY = props.y || 0;

        if (newX + rect.width > viewportWidth - PADDING) {
          newX = (props.x || 0) - rect.width;
        }
        if (newX < PADDING) newX = PADDING;

        if (newY + rect.height > viewportHeight - PADDING) {
            newY = (props.y || 0) - rect.height;
        }
        if (newY < PADDING) newY = PADDING;

        menuStyle.value = {
             top: `${newY}px`,
             left: `${newX}px`,
             maxHeight: `${Math.max(100, viewportHeight - PADDING * 2)}px`
        };
    }
};

watch(() => [props.x, props.y, props.visible, props.triggerRect], updatePosition);

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
      
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      
      emit("close");
  }
};

onMounted(() => {
    updatePosition();
    if (!props.isSubmenu) {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', handleClickOutside);
    }
});

onUnmounted(() => {
    if (!props.isSubmenu) {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
    }
});

const handleAction = (action: ContextAction) => {
  if (action.disabled) return;
  if (action.children) return; 
  if (action.action) {
    action.action();
    emit("close");
  }
};

const handleMouseEnterItem = (index: number, event: MouseEvent) => {
    
    if (hoverTimeout.value) {
        clearTimeout(hoverTimeout.value);
        hoverTimeout.value = null;
    }

    const target = event.currentTarget as HTMLElement;

    
    hoverTimeout.value = setTimeout(() => {
        if (activeSubmenuIndex.value === index) return;

        if (target) {
            activeSubmenuTriggerRect.value = target.getBoundingClientRect();
        }
        activeSubmenuIndex.value = index;
    }, 200); 
};


const handleSubmenuEnter = () => {
    isHoveringSubmenu.value = true;
    if (closeTimeout.value) {
        clearTimeout(closeTimeout.value);
        closeTimeout.value = null;
    }
    
    if (hoverTimeout.value) {
        clearTimeout(hoverTimeout.value);
        hoverTimeout.value = null;
    }
    
    if (props.isSubmenu) emit("mouseenter");
};

const handleSubmenuLeave = () => {
    isHoveringSubmenu.value = false;
    startCloseTimeout();
    
    if (props.isSubmenu) emit("mouseleave");
};

const handleMenuEnter = () => {
    isHoveringSelf.value = true;
    if (closeTimeout.value) {
        clearTimeout(closeTimeout.value);
        closeTimeout.value = null;
    }
    if (props.isSubmenu) emit("mouseenter");
};

const handleMenuLeave = () => {
    isHoveringSelf.value = false;
    startCloseTimeout();
    if (props.isSubmenu) emit("mouseleave");
};

const startCloseTimeout = () => {
    if (closeTimeout.value) clearTimeout(closeTimeout.value);
    
    closeTimeout.value = setTimeout(() => {
        
        if (!isHoveringSelf.value && !isHoveringSubmenu.value) {
             
             
             
             if (props.isSubmenu) {
                 
                 
                 
                 
                 
                 
                 
                 
                 
                 
                 
                 
                 emit("close");
             } else {
                 emit("close");
             }
        }
    }, 500);
};

</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :class="{ 'submenu-popup': isSubmenu }"
      :style="menuStyle"
      @contextmenu.prevent
      @mouseenter="handleMenuEnter"
      @mouseleave="handleMenuLeave"
    >
      <div
        v-for="(action, index) in actions"
        :key="action.label"
        class="menu-item-wrapper"
        @mouseenter="handleMouseEnterItem(index, $event)"
      >
        <div
            class="menu-item"
            :class="{ danger: action.danger, 'has-submenu': !!action.children }"
            @click="handleAction(action)"
        >
            <component
            :is="action.icon"
            v-if="
                typeof action.icon === 'object' || typeof action.icon === 'function'
            "
            class="icon"
            />
            <span v-else-if="action.icon" class="icon">{{ action.icon }}</span>
            <span class="label">{{ action.label }}</span>
            <ChevronRight v-if="action.children" :size="14" class="submenu-icon" />
        </div>
      </div>
    </div>
    
    
    <ContextMenu
        v-if="visible && activeSubmenuIndex !== null && actions[activeSubmenuIndex]?.children"
        :key="activeSubmenuIndex"
        :visible="true"
        :is-submenu="true"
        :actions="actions[activeSubmenuIndex]?.children || []"
        :triggerRect="activeSubmenuTriggerRect"
        @close="emit('close')" 
        @mouseenter="handleSubmenuEnter"
        @mouseleave="handleSubmenuLeave"
    />
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 999999;
  background: var(--bg-dark-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  min-width: 180px;
  max-width: 250px;
  padding: 0.5rem;
  color: var(--text-primary);
  overflow-y: auto; 
  overscroll-behavior: contain;
  animation: contextMenuIn 0.15s ease-out;
}

.submenu-popup {
    z-index: 1000000;
}

@keyframes contextMenuIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item-wrapper {
    position: relative;
    width: 100%;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: var(--radius-sm);
  width: 100%;
  box-sizing: border-box;
}

.menu-item:hover {
  background: var(--bg-dark-400);
  color: var(--text-primary);
  transform: translateX(2px);
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.icon {
  width: 20px;
  display: inline-block;
  margin-right: 0.75rem;
  text-align: center;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.menu-item:hover .icon {
  opacity: 1;
}

.submenu-icon {
    margin-left: auto;
    opacity: 0.5;
}
</style>

