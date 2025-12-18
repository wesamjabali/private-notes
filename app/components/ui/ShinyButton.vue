<script setup lang="ts">
const props = defineProps<{
  text?: string;
  gradientStart?: string;
  gradientEnd?: string;
  disabled?: boolean;
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);

const handleMouseMove = (e: MouseEvent) => {
  if (!buttonRef.value) return;
  
  const rect = buttonRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  buttonRef.value.style.setProperty('--x', `${x}px`);
  buttonRef.value.style.setProperty('--y', `${y}px`);
};

defineExpose({
  $el: buttonRef
});
</script>

<template>
  <button
    ref="buttonRef"
    class="shiny-button"
    :class="{ disabled: disabled }"
    :style="{
      '--gradient-start': gradientStart || 'var(--color-primary)',
      '--gradient-end': gradientEnd || '#7c3aed'
    }"
    @mousemove="handleMouseMove"
    :disabled="disabled"
  >
    <div class="glow"></div>
    <div class="content">
      <slot name="icon"></slot>
      <span v-if="text">{{ text }}</span>
      <slot></slot>
    </div>
  </button>
</template>

<style scoped lang="scss">
.shiny-button {
  --x: 50%;
  --y: 50%;
  
  position: relative;
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  
   
   
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    
    .glow {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }
}

.glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at var(--x) var(--y),
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.2) 20%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.shiny-button::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--radius-md);
  padding: 1px;
  background: radial-gradient(
    circle at var(--x) var(--y),
    rgba(255, 255, 255, 0.6),
    transparent 40%
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.8;
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
</style>
