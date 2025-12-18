<script setup lang="ts">
import { computed } from "vue";
import { useGitStore } from "~/stores/git";

const props = defineProps<{
  content: string | null;
  path: string;
}>();

const ext = computed(() => {
  const parts = props.path.split(".");
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() || "" : "";
});

const mimeType = computed(() => {
  const e = ext.value;
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"].includes(e)) {
    return `image/${e === "jpg" ? "jpeg" : e === "svg" ? "svg+xml" : e}`;
  }
  if (["pdf"].includes(e)) {
    return "application/pdf";
  }
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv"].includes(e)) {
    if (e === "mov") return "video/quicktime";
    if (e === "mkv") return "video/x-matroska";
    return `video/${e}`;
  }
  return "application/octet-stream";
});

const isVideo = computed(() => {
  return mimeType.value.startsWith("video/");
});

const isPdf = computed(() => {
  return mimeType.value === "application/pdf";
});

const store = useGitStore();

const src = computed(() => {
  if (!props.content) return "";
  try {
    const isBrowser = store.providerName === 'browser';
    const b64 = isBrowser ? props.content : btoa(props.content);
    return `data:${mimeType.value};base64,${b64}`;
  } catch (e) {
    console.error("Failed to encode media content", e);
    return "";
  }
});
</script>

<template>
  <div class="media-viewer flex-center">
    <div v-if="content" class="media-content" :class="{ 'pdf-container': isPdf }">
      <video v-if="isVideo" :src="src" controls class="media-element"></video>
      <iframe v-else-if="isPdf" :src="src" class="media-element pdf-viewer" type="application/pdf"></iframe>
      <img v-else :src="src" :alt="path" class="media-element" />
    </div>
    <div v-else class="loading">Loading media...</div>
  </div>
</template>

<style scoped lang="scss">
.media-viewer {
  width: 100%;
  height: 100%;
  padding: 2rem;
  overflow: auto;
   
  background: var(--bg-dark-100);
  background: radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.03) 0%, transparent 20%),
              radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.03) 0%, transparent 20%),
              var(--bg-dark-100);
  
  display: flex;
  justify-content: center;
  align-items: center;
}

.media-element {
  max-width: 100%;
  max-height: 90vh;
  border-radius: var(--radius-md);
  
   
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.4), 
    -4px -4px 16px rgba(255, 255, 255, 0.05);
  border: 4px solid var(--bg-dark-300);  
  background: var(--bg-dark-300);  
}

.pdf-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  
   
  .media-element {
    width: 100%;
    height: 100%;
    min-height: 80vh;
    border: none;
    background: #fff;  
    border-radius: var(--radius-sm);
  }
}

.loading {
    color: var(--text-muted);
    font-size: 0.9rem;
    font-style: italic;
}
</style>
