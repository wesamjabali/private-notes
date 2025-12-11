<script setup lang="ts">
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGitHubStore } from '~/stores/github'
import { livePreviewExtension } from '~/utils/LivePreviewExtension'
import { obsidianStyles } from '~/utils/ObsidianTheme'
import { tableEditingExtension } from '~/utils/TableEditingExtension'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const editorRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

const store = useGitHubStore()

// Minimal setup similar to basicSetup but tailored
const extensions = [
  history(),
  highlightSelectionMatches(),
  closeBrackets(),
  autocompletion(),
  keymap.of([
    ...historyKeymap,
    ...searchKeymap,
    ...lintKeymap,
    ...completionKeymap,
    ...closeBracketsKeymap,
    indentWithTab,
    // Custom keymap for Save commonly used in editors
    {
      key: 'Mod-s',
      run: () => {
        emit('save')
        return true
      }
    }
  ]),
  markdown({ 
    base: markdownLanguage,
    codeLanguages: languages
  }),
  obsidianStyles,
  livePreviewExtension,
  tableEditingExtension,
  EditorView.domEventHandlers({
      drop(event, view) {
          const files = event.dataTransfer?.files
          if (!files || files.length === 0) return false

          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos === null) return false

          event.preventDefault()

          // Handle uploads
          for (let i = 0; i < files.length; i++) {
              const file = files.item(i)
              if (!file) continue
              // Allow images and videos
              if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue 

              // Generate path
              const timestamp = new Date().toISOString().replace(/[-:.]/g, '').replace('T', '').split('.')[0]
              const ext = file.name.split('.').pop()
              const filename = `${timestamp}.${ext}`
              
              // Determine current folder
              const currentPath = store.currentFilePath || ''
              const currentDir = currentPath.split('/').slice(0, -1).join('/')
              const attachmentDir = currentDir ? `${currentDir}/attachments` : 'attachments'
              const fullPath = `${attachmentDir}/${filename}`
              
              console.log(`[ObsidianEditor] Uploading drop: ${fullPath} (${file.type})`)

              // Upload
              store.uploadFile(fullPath, file).then((result) => {
                  if (!result) {
                      console.error('[ObsidianEditor] Upload failed: No result returned (repo not selected?)')
                      return
                  }
                  
                  // Insert link
                  const insertText = `![](${fullPath})`
                  
                  const transaction = view.state.update({
                      changes: { from: pos, insert: insertText }
                  })
                  view.dispatch(transaction)
              }).catch(err => {
                  console.error('[ObsidianEditor] Failed to upload dropped file', err)
              })
          }
          
          return true
      }
  }),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      emit('update:modelValue', update.state.doc.toString())
    }
  })
]



const router = useRouter()
// We need to define the handler outside onMounted to use 'router' which is captured from setup scope
const handleNavigate = (e: Event) => {
    const detail = (e as CustomEvent).detail
    if (detail && typeof detail === 'string') {
        router.push(detail)
    }
}

onMounted(() => {
  if (!editorRef.value) return

  const state = EditorState.create({
    doc: props.modelValue,
    extensions
  })

  editorView = new EditorView({
    state,
    parent: editorRef.value
  })

  editorRef.value.addEventListener('navigate-file', handleNavigate)
})

onBeforeUnmount(() => {
  if (editorRef.value) {
      editorRef.value.removeEventListener('navigate-file', handleNavigate)
  }
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

// Watch for external content changes (e.g. loading a new file)
watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView) {
      const currentValue = editorView.state.doc.toString()
      if (newValue !== currentValue) {
        editorView.dispatch({
          changes: { from: 0, to: currentValue.length, insert: newValue }
        })
      }
    }
  }
)
</script>

<template>
  <div class="obsidian-editor" ref="editorRef"></div>
</template>

<style>
.obsidian-editor {
  height: 100%;
  width: 100%;
  overflow: hidden; /* Scroll handled by CodeMirror */
}

/* Ensure CodeMirror takes full height */
.cm-editor {
  height: 100%;
}

.cm-scroller {
  overflow: auto;
}
</style>
