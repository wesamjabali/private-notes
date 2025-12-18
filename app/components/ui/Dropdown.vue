<script setup lang="ts">
import { ChevronDown, ChevronRight } from "lucide-vue-next";
import { useDropdown } from "~/composables/useDropdown";


export interface DropdownItem {
  label: string;
  icon?: any;
  action?: () => void; 
  disabled?: boolean;
  danger?: boolean;
  labelStyle?: string | Record<string, string>;
  labelClass?: string;
  children?: DropdownItem[]; 
}

const props = defineProps<{
  label?: string;
  icon?: any;
  items: DropdownItem[];
  disabled?: boolean;
  title?: string;
  labelStyle?: string | Record<string, string>;
  labelClass?: string;
}>();

const { isOpen, triggerRef, menuRef, menuStyle, toggle, close } = useDropdown();


const activeSubmenuIndex = ref<number | null>(null);
const submenuStyle = ref({ top: '0px', left: '0px', maxHeight: 'none' });


watch(isOpen, (val) => {
    if (!val) activeSubmenuIndex.value = null;
});

const handleWindowChange = () => {
  
  
  if (!isOpen.value) return;
  
  
};

const handleMouseEnter = (index: number, event: MouseEvent) => {
    activeSubmenuIndex.value = index;
    const item = props.items[index];
    if (!item?.children) return;

    const target = event.currentTarget as HTMLElement;
    if (target) {
        const rect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const PADDING = 16;
        const SUBMENU_WIDTH = 180;
        
        const estimatedHeight = item.children.length * 36 + 20;
        const maxHeight = Math.min(estimatedHeight, viewportHeight - PADDING * 2);
        
        let left: number;
        let top: number;
        
        
        
        const isMobile = viewportWidth < 500;
        
        if (isMobile) {
            
            left = Math.max(PADDING, (viewportWidth - SUBMENU_WIDTH) / 2);
            top = rect.bottom + 8;
            
            
            if (top + maxHeight > viewportHeight - PADDING) {
                top = rect.top - maxHeight - 8;
            }
            
            
            if (top < PADDING) {
                top = PADDING;
            }
        } else {
            
            left = rect.right;
            top = rect.top;
            
            
            if (left + SUBMENU_WIDTH > viewportWidth - PADDING) {
                left = rect.left - SUBMENU_WIDTH;
            }
            
            
            if (left < PADDING) {
                left = PADDING;
            }
            
            
            if (top + maxHeight > viewportHeight - PADDING) {
                top = Math.max(PADDING, viewportHeight - maxHeight - PADDING);
            }
        }

        submenuStyle.value = {
            top: `${top}px`,
            left: `${left}px`,
            maxHeight: `${maxHeight}px`
        };
    }
};


 

const handleAction = (item: DropdownItem) => {
  if (item.disabled) return;
  if (item.children) return; 
  
  if (item.action) item.action();
  close();
};


</script>

<template>
  <div class="custom-dropdown">
    <button
      ref="triggerRef"
      class="trigger-btn"
      @click.stop="toggle"
      :class="{ active: isOpen, 'icon-only': !label }"
      :disabled="disabled"
      :title="title"
    >
      <component :is="icon" v-if="icon" :size="20" class="main-icon" />
      <span
        v-if="label"
        class="label"
        :style="labelStyle"
        :class="labelClass"
        >{{ label }}</span
      >
      <ChevronDown :size="14" class="chevron" :class="{ rotate: isOpen }" />
    </button>

    <Teleport to="body">
      <transition name="dropdown-fade">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="dropdown-menu glass-panel"
          :style="menuStyle"
          @click.stop
        >
          <div
             class="menu-item-wrapper"
             v-for="(item, index) in items"
             :key="index"
             @mouseenter="handleMouseEnter(index, $event)"
          >
            <button
                @click="handleAction(item)"
                class="menu-item"
                :class="{ 'text-danger': item.danger, 'has-submenu': !!item.children }"
                :disabled="item.disabled"
            >
                <component
                :is="item.icon"
                v-if="item.icon"
                :size="16"
                class="icon"
                />
                <span :style="item.labelStyle" :class="item.labelClass">{{
                item.label
                }}</span>
                <ChevronRight v-if="item.children" :size="14" class="submenu-icon"/>
            </button>
          </div>
        </div>
      </transition>
      
       
       
       
       
       
       
       
      <transition name="dropdown-fade">
         <div
            v-if="isOpen && activeSubmenuIndex !== null && items[activeSubmenuIndex]?.children"
            class="dropdown-menu glass-panel submenu"
            :style="submenuStyle"
            @click.stop
         >
            <button
                v-for="(child, cIndex) in items[activeSubmenuIndex]?.children"
                :key="cIndex"
                @click="handleAction(child)"
                class="menu-item"
                :class="{ 'text-danger': child.danger }"
                :disabled="child.disabled"
            >
                <component
                :is="child.icon"
                v-if="child.icon"
                :size="16"
                class="icon"
                />
                <span :style="child.labelStyle" :class="child.labelClass">{{
                child.label
                }}</span>
            </button>
         </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.custom-dropdown {
  position: relative;
  display: inline-block;
}

.trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  min-height: 36px;
  min-width: 0;  
  max-width: 100%;  
  justify-content: center;

  &:hover {
    background: var(--bg-dark-300);
    color: var(--text-primary);
  }

  &:active,
  &.active {
    background: var(--bg-dark-400);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chevron {
    transition: transform 0.2s;
    opacity: 0.6;
    margin-left: -2px;
    flex-shrink: 0;  
  }

  &.icon-only .chevron {
    margin-left: 0;
  }

  .chevron.rotate {
    transform: rotate(180deg);
  }

  .label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;  
    min-width: 0;  
    text-align: left;  
  }
}
</style>

<style lang="scss">
 
.dropdown-menu {
  position: fixed;
  min-width: 180px;
  max-width: min(400px, calc(100vw - 20px));  
  background: var(--bg-dark-300);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  z-index: 9999;
  overflow-y: auto;
}

.dropdown-menu .menu-item {
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
  transition: all 0.2s;
  text-align: left;
  min-width: 0;  

  &:hover:not(:disabled) {
    background: var(--bg-dark-400);
    transform: translateX(2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    margin-right: 0.75rem;
    opacity: 0.8;
    flex-shrink: 0;  
  }

   
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;  
  }

  &.text-danger {
    color: var(--color-error, #ff4d4f);
    .icon {
      color: var(--color-error, #ff4d4f);
    }
    &:hover:not(:disabled) {
      background: rgba(255, 77, 79, 0.1);
    }
  }
}

 
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.submenu-icon {
    margin-left: auto;
    opacity: 0.5;
}

.submenu {
    z-index: 10000;  
}
</style>
