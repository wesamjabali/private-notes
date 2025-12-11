<script setup lang="ts">
import { useGeminiStore } from "~/stores/gemini";
import { useGitHubStore } from "~/stores/github";
import ObsidianEditor from "./ObsidianEditor.vue";

const store = useGitHubStore();
const geminiStore = useGeminiStore();

const save = async () => {
  await store.saveCurrentFile();
};

const revert = async () => {
  if (
    confirm(
      "Are you sure you want to discard your local changes? This cannot be undone."
    )
  ) {
    await store.revertFile();
  }
};
</script>

<template>
  <div class="editor-container">
    <ClientOnly>
      <Teleport to="#header-actions">
        <div class="actions">
          <span v-if="store.isDirty" class="dirty-indicator">• Unsaved</span>
          <button
            v-if="store.isDirty"
            class="btn-secondary"
            @click="revert"
            :disabled="store.isLoading"
          >
            Revert
          </button>
          <button
            class="btn-primary"
            @click="save"
            :disabled="!store.isDirty || store.isLoading"
          >
            {{ store.isLoading ? "Saving..." : "Save" }}
          </button>
        </div>
      </Teleport>
    </ClientOnly>

    <div class="editor-main">
      <ObsidianEditor
        v-if="store.currentFileContent !== null"
        :model-value="store.currentFileContent"
        :pending-content="geminiStore.pendingChange?.content"
        @update:model-value="store.updateContent"
        @save="save"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
}

.dirty-indicator {
  color: var(--color-accent);
  font-size: 0.9rem;
  font-family: var(--font-mono);

  @media (max-width: 768px) {
    display: none;
  }
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  &:hover {
    background: lighten(hsl(260, 70%, 60%), 5%);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: transparent;
  color: var(--color-text-muted);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  cursor: pointer;

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  &:hover {
    background: var(--bg-dark-200);
    color: var(--color-text);
    border-color: var(--color-text-muted);
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
  border-radius: var(--radius-lg);
  background: var(--bg-dark-200);

  @media (max-width: 768px) {
    border-radius: 0;
  }
}
</style>
