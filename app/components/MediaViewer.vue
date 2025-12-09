
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
  path: string
}>()

const ext = computed(() => {
  const parts = props.path.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
})

const mimeType = computed(() => {
  const e = ext.value
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'].includes(e)) {
    return `image/${e === 'jpg' ? 'jpeg' : e === 'svg' ? 'svg+xml' : e}`
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv'].includes(e)) {
    if (e === 'mov') return 'video/quicktime'
    if (e === 'mkv') return 'video/x-matroska'
    return `video/${e}`
  }
  return 'application/octet-stream'
})

const isVideo = computed(() => {
  return mimeType.value.startsWith('video/')
})

const src = computed(() => {
  return `data:${mimeType.value};base64,${props.content}`
})
</script>

<template>
  <div class="media-viewer flex-center">
    <div v-if="content" class="media-content">
      <video v-if="isVideo" :src="src" controls class="media-element"></video>
      <img v-else :src="src" :alt="path" class="media-element">
    </div>
    <div v-else class="loading">
      Loading media...
    </div>
  </div>
</template>

<style scoped lang="scss">
.media-viewer {
  width: 100%;
  height: 100%;
  padding: 2rem;
  overflow: auto;
  background: var(--bg-dark-200);
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: center;
  align-items: center;
}

.media-element {
  max-width: 100%;
  max-height: 90vh;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
