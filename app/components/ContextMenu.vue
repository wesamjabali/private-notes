<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  actions: { label: string, icon?: string, action: () => void, danger?: boolean }[]
}>()

const emit = defineEmits(['close'])
const menuRef = ref<HTMLElement | null>(null)

// Adjust position to keep in viewport
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

watch(() => [props.x, props.y, props.visible], async () => {
    if (props.visible) {
        adjustedX.value = props.x
        adjustedY.value = props.y
        
        await nextTick()
        if (menuRef.value) {
            const rect = menuRef.value.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight
            
            if (rect.right > viewportWidth) {
                adjustedX.value = props.x - rect.width
            }
            if (rect.bottom > viewportHeight) {
                adjustedY.value = props.y - rect.height
            }
        }
    }
})

const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
        emit('close')
    }
}

onMounted(() => {
    // Timeout to avoid catching the initial click that opened it if it was a left click (not likely for context menu)
    setTimeout(() => {
        window.addEventListener('click', handleClickOutside)
        window.addEventListener('contextmenu', handleClickOutside)
    }, 0)
})

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside)
    window.removeEventListener('contextmenu', handleClickOutside)
})

const handleAction = (action: () => void) => {
    action()
    emit('close')
}
</script>

<template>
  <div 
     v-if="visible" 
     ref="menuRef"
     class="context-menu"
     :style="{ top: adjustedY + 'px', left: adjustedX + 'px' }"
  >
     <div 
        v-for="action in actions" 
        :key="action.label"
        class="menu-item"
        :class="{ 'danger': action.danger }"
        @click="handleAction(action.action)"
     >
        <span class="icon">{{ action.icon }}</span>
        <span class="label">{{ action.label }}</span>
     </div>
  </div>
</template>

<style scoped>
.context-menu {
    position: fixed;
    z-index: 9999;
    background: var(--bg-dark-300);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    min-width: 180px;
    padding: 0.5rem;
    color: var(--text-primary);
    overflow: hidden;
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    border-radius: var(--radius-sm);
}

.menu-item:hover {
    background: var(--bg-dark-400);
    transform: translateX(2px);
}

.menu-item.danger {
    color: var(--color-accent); /* distinct from error red, fit theme */
}

.menu-item.danger:hover {
    background: hsla(var(--hue-accent), 50%, 50%, 0.1);
}

.icon {
    width: 20px;
    display: inline-block;
    margin-right: 0.75rem;
    text-align: center;
    opacity: 0.7;
}

.menu-item:hover .icon {
    opacity: 1;
}
</style>
