<template>
  <div class="app-root" :class="{ 'is-pwa': isPwa }">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <EditorTemplateSelector />
    <ConfirmDialog
      :is-open="ui.confirmDialog.isOpen"
      :title="ui.confirmDialog.title"
      :message="ui.confirmDialog.message"
      :confirm-text="ui.confirmDialog.confirmText"
      :cancel-text="ui.confirmDialog.cancelText"
      :destructive="ui.confirmDialog.destructive"
      @confirm="ui.closeConfirmDialog(true)"
      @cancel="ui.closeConfirmDialog(false)"
    />
    <div v-if="!isOnSettingsPage" class="settings-trigger">
      <NuxtLink to="/settings" class="settings-icon"
        ><Settings :size="24"
      /></NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDocumentVisibility, useMediaQuery } from "@vueuse/core";
import "katex/dist/katex.min.css";
import { Settings } from "lucide-vue-next";
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import { useGitStore } from "~/stores/git";
import { useSettingsStore } from "~/stores/settings";
import { useUIStore } from "~/stores/ui";

const settings = useSettingsStore();
const ghStore = useGitStore();
const ui = useUIStore();
const route = useRoute();


const isStandalone = useMediaQuery("(display-mode: standalone)");
const isPwa = computed(() => {
  
   
  const isIosStandalone =
    typeof window !== "undefined" && (window.navigator as any)?.standalone;
  return isStandalone.value || isIosStandalone;
});

const visibility = useDocumentVisibility();

watch(visibility, (current, previous) => {
  if (current === "visible" && previous === "hidden") {
    ghStore.refreshCurrentRepo();
  }
});


onMounted(async () => {
  
  if (ghStore.currentRepo) {
    await settings.loadSettings();
  }
});


watch(
  () => ghStore.currentRepo,
  async (newRepo) => {
    if (newRepo) {
      await settings.loadSettings();
    }
  }
);


const applyStyles = () => {
  const root = document.documentElement;
  root.style.setProperty("--ui-scale", settings.uiScale.toString());
  root.style.setProperty("--header-size", `${settings.headerSize}rem`);
  root.style.setProperty("--text-size", `${settings.textSize}rem`);
  root.style.setProperty("--editor-font-size", `${settings.editorFontSize}px`);
  root.style.setProperty("--editor-bg", settings.editorBackgroundColor);
  root.style.setProperty("--editor-text", settings.editorTextColor);
  root.style.setProperty("--accent-color", settings.accentColor);
  root.style.setProperty("--text-accent", settings.accentColor);
  root.style.setProperty("--interactive-accent", settings.accentColor);
  root.style.setProperty("--color-primary", settings.accentColor);
  root.style.setProperty("--sidebar-width", `${settings.sidebarWidth}px`);
  root.style.setProperty(
    "--preview-font-size",
    `${settings.previewFontSize}px`
  );

  
  root.style.fontSize = `calc(16px * ${settings.uiScale})`;
};


watch(
  () => [
    settings.uiScale,
    settings.headerSize,
    settings.textSize,
    settings.editorFontSize,
    settings.editorBackgroundColor,
    settings.editorTextColor,
    settings.accentColor,
    settings.sidebarWidth,
    settings.previewFontSize,
  ],
  applyStyles,
  { immediate: true }
);

const isOnSettingsPage = computed(() => {
  
  const isLoginScreen = route.path === "/" && !ghStore.token;
  return route.path === "/settings" || route.path.startsWith("/repo/") || isLoginScreen;
});
</script>

<style scoped>
.settings-trigger {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 50;
}

.settings-icon {
  font-size: 1.5rem;
  background: var(--bg-dark-glass);
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  text-decoration: none;
  border: 1px solid var(--border-subtle);
  transition: transform 0.2s;
}

.settings-icon:hover {
  transform: rotate(90deg);
}
</style>
