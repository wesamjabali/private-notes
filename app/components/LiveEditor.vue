<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useGitHubStore } from '~/stores/github'
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, type Range } from '@codemirror/state'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const store = useGitHubStore()

// --- HELPER: Path Resolution ---
async function resolveAndFetch(storeInstance: ReturnType<typeof useGitHubStore>, rawPath: string): Promise<{ content: string; path: string } | null> {
    // ... logic ...
    // Note: implementation is same, just using argument
    const findFile = (path: string) => {
        let p = decodeURIComponent(path)
        if (p.startsWith('./')) p = p.slice(2)
        if (p.startsWith('/')) p = p.slice(1)
        return p
    }

    const attempts: string[] = []
    const cleanPath = findFile(rawPath)
    const currentDir = storeInstance.currentFilePath?.split('/').slice(0, -1).join('/') || ''
    
    // A) Relative to current file
    attempts.push(currentDir ? `${currentDir}/${cleanPath}` : cleanPath)
    
    // B) Overlap Join (Smart Context)
    if (currentDir) {
          const dirParts = currentDir.split('/')
          for (let i = 0; i < dirParts.length; i++) {
              const suffix = dirParts.slice(i).join('/')
              if (cleanPath.startsWith(suffix + '/')) { 
                  const prefix = dirParts.slice(0, i).join('/')
                  const joined = prefix ? `${prefix}/${cleanPath}` : cleanPath
                  attempts.push(joined)
                  break 
              }
          }
    }

    // C) Main Folder
    if (storeInstance.mainFolder) {
        attempts.push(`${storeInstance.mainFolder}/${cleanPath}`)
    }

    // D) Repo Root
    attempts.push(cleanPath)
    
    // E) Heuristics
    if (!cleanPath.startsWith('src/')) {
        attempts.push(`src/content/notes/${cleanPath}`)
        attempts.push(`src/content/${cleanPath}`)
        attempts.push(`src/${cleanPath}`)
        attempts.push(`content/${cleanPath}`)
    }

    const uniqueAttempts = [...new Set(attempts)]
    
    // 1. Exact/Heuristic
    for (const p of uniqueAttempts) {
        const content = await storeInstance.getRawContent(p)
        if (content) return { content, path: p }
    }

    // 2. Fuzzy Search
    let bestMatch: string | null = null
    const searchTree = (nodes: any[]) => {
        for (const node of nodes) {
            if (node.type === 'blob') {
                if (node.path.includes(cleanPath)) {
                    if (node.path.endsWith(cleanPath)) {
                         if (!bestMatch || node.path.length < bestMatch.length) bestMatch = node.path
                    } else {
                         if (!bestMatch) bestMatch = node.path
                    }
                }
            }
            if (node.children) searchTree(node.children)
        }
    }
    
    if (storeInstance.fileTree) searchTree(storeInstance.fileTree)
    
    if (bestMatch) {
         console.log(`[MediaWidget] Fuzzy match: '${rawPath}' -> '${bestMatch}'`)
         const content = await storeInstance.getRawContent(bestMatch)
         if (content) return { content, path: bestMatch }
    }
    
    return null
}

// ... Widgets same as before ...

// --- LIVE PREVIEW PLUGIN ---

const livePreviewPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  // Using captured store

  constructor(view: EditorView) {
    this.decorations = this.compute(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.compute(update.view)
    }
  }

  compute(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>()
    const { state } = view
    const selection = state.selection.main
    const cursorPos = selection.head

    // Logic Helpers
    const isCursorOnLine = (pos: number) => {
      const line = state.doc.lineAt(pos)
      return cursorPos >= line.from && cursorPos <= line.to
    }
    
    const isCursorInNode = (node: { from: number, to: number }) => {
      return cursorPos >= node.from && cursorPos <= node.to
    }

    const { doc } = state

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (nodeRef) => {
          const name = nodeRef.name
          const start = nodeRef.from
          const end = nodeRef.to
          const node = nodeRef.node 

          // Style and Block Markers (omitted for brevity in replacement, but must verify chunk matches)
          // Actually, I need to include the loop body to ensure correct replacement.
          // Since I am replacing the whole logic, I should keep it robust.
          
          if (name.startsWith('ATXHeading')) {
             const level = parseInt(name.slice(-1)) || 1
             builder.add(doc.lineAt(start).from, doc.lineAt(start).from, Decoration.line({ class: `cm-header-${level}` }))
          }

          if (name === 'SetextHeading1') builder.add(doc.lineAt(start).from, doc.lineAt(start).from, Decoration.line({ class: 'cm-header-1' }))
          if (name === 'SetextHeading2') builder.add(doc.lineAt(start).from, doc.lineAt(start).from, Decoration.line({ class: 'cm-header-2' }))

          if (name === 'Emphasis') builder.add(start, end, Decoration.mark({ class: 'cm-italic' }))
          if (name === 'StrongEmphasis') builder.add(start, end, Decoration.mark({ class: 'cm-bold' }))
          if (name === 'Strikethrough') builder.add(start, end, Decoration.mark({ class: 'cm-strikethrough' }))
          if (name === 'InlineCode') builder.add(start, end, Decoration.mark({ class: 'cm-inline-code' }))
          if (name === 'LinkLabel') builder.add(start, end, Decoration.mark({ class: 'cm-link-text' }))
          if (name === 'ListMark') builder.add(start, end, Decoration.mark({ class: 'cm-list-mark' }))
          if (name === 'QuoteMark') builder.add(start, end, Decoration.mark({ class: 'cm-quote-mark' }))
          
          const blockMarkers = ['HeaderMark', 'QuoteMark', 'ListMark', 'TableDelimiter', 'SetextHeading1', 'SetextHeading2']
          if (blockMarkers.includes(name)) {
             if ((name === 'HeaderMark' || name === 'QuoteMark' || name === 'ListMark' || name === 'TableDelimiter') && !isCursorOnLine(start)) {
                 builder.add(start, end, Decoration.replace({}))
                 return
             }
          }

          if (name === 'HorizontalRule' && !isCursorOnLine(start)) {
                 builder.add(start, end, Decoration.replace({ widget: new HorizontalRuleWidget() }))
                 return
          }

          if (name === 'TaskMarker' && !isCursorOnLine(start)) {
              const checked = view.state.sliceDoc(start, end).toLowerCase().includes('x')
              builder.add(start, end, Decoration.replace({ widget: new CheckboxWidget(checked) }))
              return
          }
          
          if ((name === 'CodeMark' || name === 'CodeInfo') && node.parent?.name === 'FencedCode' && !isCursorOnLine(start)) {
              builder.add(start, end, Decoration.replace({}))
              return
          }


          const inlineMarkers = ['EmphasisMark', 'StrongEmphasisMark', 'StrikethroughMark', 'LinkMark', 'URL']
          if (inlineMarkers.includes(name)) {
              const parent = node.parent
              if (parent && ['Emphasis', 'StrongEmphasis', 'Strikethrough', 'Link'].includes(parent.name)) {
                  if (!isCursorInNode(parent)) {
                       builder.add(start, end, Decoration.replace({}))
                  }
              }
              return
          }
          
          if (name === 'CodeMark' && node.parent?.name === 'InlineCode' && !isCursorInNode(node.parent)) {
                builder.add(start, end, Decoration.replace({}))
                return
          }

          if (name === 'Image') {
              if (!isCursorInNode(node)) {
                  const text = state.sliceDoc(start, end)
                  const match = text.match(/!\[(.*?)\]\(\s*(.*?)\s*\)/)
                  if (match) {
                      builder.add(start, end, Decoration.replace({ 
                          widget: new MediaWidget(match[2], match[1], store) 
                      }))
                  } else {
                      console.warn('Image Node found but Regex failed:', text)
                  }
                  return false
              }
          }
        }
      })
    }
    return builder.finish()
  }
}, {
  decorations: v => v.decorations
})

// --- EVENT HANDLERS ---
const clickListener = EditorView.domEventHandlers({
    mousedown(event, view) {
        const target = event.target as HTMLElement
        const pos = view.posAtDOM(target)
        if (pos === null) return
        
        const { state } = view
        const tree = syntaxTree(state)
        let node = tree.resolveInner(pos, 1) 
        
        while (node && node.name !== 'Link' && node.parent) {
            node = node.parent
        }
        
        if (node && node.name === 'Link') {
             let urlNode = node.getChild('URL')
             if (urlNode) {
                 const isModifier = event.metaKey || event.ctrlKey
                 
                 if (isModifier) {
                     event.preventDefault()
                     const url = state.sliceDoc(urlNode.from, urlNode.to)
                     
                     resolveAndFetch(store, url).then(result => {
                         if (result) {
                             store.openFile(result.path)
                         } else {
                             console.warn('Could not resolve link:', url)
                         }
                     })
                 }
             }
        }
    }
})

// --- EXTENSIONS SETUP ---

const extensions = [
  markdown({ codeLanguages: languages }),
  oneDark,
  EditorView.lineWrapping, 
  livePreviewPlugin,
  clickListener,
  EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "16px",
      backgroundColor: "transparent",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-body) !important" // Main font
    },
    ".cm-content": {
        padding: "2rem 0",
        maxWidth: "900px",
        margin: "0 auto",
    },
    ".cm-line": {
        padding: "0 0.5rem" // Slight padding for selection feel
    },
    ".cm-activeLine": {
        backgroundColor: "transparent" // Remove default highlight
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-primary)"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(var(--hue-primary), 70%, 60%, 0.3)"
    }
  })
]

const view = shallowRef<EditorView>()

const handleReady = (payload: { view: EditorView }) => {
  view.value = payload.view
}

// Save Shortcut
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    emit('save')
  }
}

const handleChange = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="live-editor" @keydown="handleKeydown">
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      @ready="handleReady"
      @update:model-value="handleChange"
      class="cm-component"
    />
  </div>
</template>

<style scoped lang="scss">
.live-editor {
  width: 100%;
  height: 100%;
  
  :deep(.cm-component) {
    height: 100%;
  }
  
  // Custom Live Preview Styles
  
  // Headers - Using Outline/Sans font
  :deep(.cm-header-1) { font-family: var(--font-sans); font-size: 2.2em; font-weight: 600; color: white; margin-top: 1em; line-height: 1.2; }
  :deep(.cm-header-2) { font-family: var(--font-sans); font-size: 1.8em; font-weight: 600; color: white; margin-top: 1em; line-height: 1.25; }
  :deep(.cm-header-3) { font-family: var(--font-sans); font-size: 1.5em; font-weight: 600; color: white; margin-top: 0.8em; }
  :deep(.cm-header-4) { font-family: var(--font-sans); font-size: 1.25em; font-weight: 600; }
  :deep(.cm-header-5) { font-family: var(--font-sans); font-size: 1.1em; font-weight: 600; }
  :deep(.cm-header-6) { font-family: var(--font-sans); font-size: 1em; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  
  // Text Styles
  :deep(.cm-bold) { font-weight: 600; color: var(--color-primary); } 
  :deep(.cm-italic) { font-style: italic; color: var(--text-secondary); }
  :deep(.cm-strikethrough) { text-decoration: line-through; opacity: 0.6; }
  
  // Links
  :deep(.cm-link-text) { 
    color: var(--color-primary); 
    text-decoration: underline; 
    cursor: pointer;
    font-weight: 500;
  }
  
  // Code
  :deep(.cm-inline-code) {
    background: var(--bg-dark-300);
    border-radius: 4px;
    padding: 0.1em 0.3em;
    font-family: var(--font-mono);
    color: var(--color-accent); 
    font-size: 0.9em;
  }
  
  // List
  :deep(.cm-list-mark) {
    color: var(--color-primary);
    font-weight: bold;
    font-family: var(--font-mono);
  }
  
  // Blockquote
  :deep(.cm-quote-mark) {
    color: var(--text-muted);
    font-weight: bold;
  }
  
  // Widgets
  :deep(.cm-checkbox-wrap) {
    margin-right: 0.5em;
    vertical-align: middle;
  }
  
  :deep(.cm-hr-widget) {
    border: none;
    border-top: 2px solid var(--bg-dark-300);
    margin: 1.5em 0;
  }
}
</style>
