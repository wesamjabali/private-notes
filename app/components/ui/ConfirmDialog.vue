<template>
  <div v-if="isOpen" class="confirm-dialog-overlay" @click.self="onCancel">
    <div class="confirm-dialog">
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button v-if="cancelText" class="btn-cancel" @click="onCancel">
          {{ cancelText }}
        </button>
        <button
          class="btn-action"
          :class="isDestructive ? 'btn-destructive' : 'btn-confirm'"
          :style="
            isDestructive
              ? {
                  background: '#ef4444',
                  border: '1px solid #ef4444',
                  color: 'white',
                }
              : undefined
          "
          @click="onConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const onConfirm = () => emit("confirm");
const onCancel = () => emit("cancel");

const isDestructive = computed(() => {
  if (props.destructive) return true;
  const label = (props.confirmText || "").toLowerCase();
  return label.includes("delete") || label.includes("discard");
});

const handleKeydown = (e: KeyboardEvent) => {
  if (props.isOpen && e.key === "Escape") {
    onCancel();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.confirm-dialog {
  background: var(--bg-dark-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2rem;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-subtle);
  border: 1px solid var(--border-subtle);
  animation: slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-message {
  margin-bottom: 1.75rem;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 0.95rem;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

button {
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

.btn-cancel {
  background: var(--bg-dark-300);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.btn-cancel:hover {
  background: var(--bg-dark-400);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.btn-action {
  color: white;
}

.btn-confirm {
  background: linear-gradient(135deg, var(--color-primary), #7c3aed);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.btn-confirm:hover {
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
}

.btn-destructive {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: white !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-destructive:hover {
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4) !important;
}
</style>
