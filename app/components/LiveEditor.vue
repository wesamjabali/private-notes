<script setup lang="ts">
import { ref, shallowRef } from 'vue'
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

// Widget to render images in preview mode
class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super() }
  toDOM() {
    const img = document.createElement('img')
    img.src = this.src
    img.alt = this.alt
    img.title = this.alt
    img.style.maxWidth = '100%'
    img.style.maxHeight = '300px'
    img.style.borderRadius = 'var(--radius-md)'
    img.style.display = 'block'
    img.style.margin = '1em 0'
    return img
  }
}

// Live Preview Plugin
const livePreviewPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

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

    // Helper: Check if cursor is on the same line as this node
    const isCursorOnLine = (pos: number) => {
      const line = state.doc.lineAt(pos)
      return cursorPos >= line.from && cursorPos <= line.to
    }

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          const name = node.type.name
          const start = node.from
          const end = node.to
          
          const lineActive = isCursorOnLine(start)
          // strict check: cursor inside [start, end]
          const cursorInNode = cursorPos >= start && cursorPos <= end

          // --- STYLING (Always applied) ---
          
          if (name.startsWith('ATXHeading')) {
             const level = parseInt(name.slice(-1)) || 1
             const className = `cm-header-${level}`
             const line = state.doc.lineAt(start)
             builder.add(line.from, line.from, Decoration.line({ class: className }))
          }

          if (name === 'Emphasis') {
             builder.add(start, end, Decoration.mark({ class: 'cm-italic' }))
          }
          if (name === 'StrongEmphasis') {
             builder.add(start, end, Decoration.mark({ class: 'cm-bold' }))
          }
          if (name === 'InlineCode') {
             builder.add(start, end, Decoration.mark({ class: 'cm-inline-code' }))
          }
           if (name === 'LinkLabel') { 
               builder.add(start, end, Decoration.mark({ class: 'cm-link-text' }))
          }
          if (name === 'ListMark') {
             builder.add(start, end, Decoration.mark({ class: 'cm-list-mark' }))
          }
          if (name === 'QuoteMark') {
             builder.add(start, end, Decoration.mark({ class: 'cm-quote-mark' }))
          }

          // --- HIDING MECHANICS (Hybrid) ---

          // INLINE ELEMENTS (Bold, Italic, Link, InlineCode, Image)
          // Hide markers if cursor is NOT inside the element
          if (['Emphasis', 'StrongEmphasis', 'InlineCode', 'Link', 'Image'].includes(name)) {
             if (!cursorInNode) {
                 if (name === 'Emphasis' || name === 'StrongEmphasis') {
                     node.iterate({
                         enter: (child) => {
                             if (['EmphasisMark', 'StrongEmphasisMark'].includes(child.type.name)) {
                                 builder.add(child.from, child.to, Decoration.replace({}))
                             }
                         }
                     })
                 }
                 
                 if (name === 'InlineCode') {
                     node.iterate({
                         enter: (child) => {
                             if (child.type.name === 'CodeMark') {
                                 builder.add(child.from, child.to, Decoration.replace({}))
                             }
                         }
                     })
                 }
                 
                 if (name === 'Link') {
                     node.iterate({
                         enter: (child) => {
                             if (child.type.name === 'LinkMark' || child.type.name === 'URL') {
                                  builder.add(child.from, child.to, Decoration.replace({}))
                             }
                         }
                     })
                 }

                 if (name === 'Image') {
                    let src = ''
                    let alt = ''
                    node.iterate({
                       enter: (child) => {
                           if (child.type.name === 'URL') src = view.state.doc.sliceString(child.from, child.to)
                           if (child.type.name === 'LinkLabel') alt = view.state.doc.sliceString(child.from, child.to)
                       }
                    })
                    // Replace the whole image syntax with the widget
                    builder.add(start, end, Decoration.replace({
                        widget: new ImageWidget(src, alt)
                    }))
                    return false // Don't process children to avoid conflicts
                 }
             }
          }

          // BLOCK ELEMENTS (Heading, Blockquote, FencedCode, Lists)
          // Hide markers if line is NOT active
          
          if (name.startsWith('ATXHeading')) {
              if (!lineActive) {
                   node.iterate({
                       enter: (child) => {
                           if (child.type.name === 'HeaderMark') {
                               builder.add(child.from, child.to, Decoration.replace({}))
                           }
                       }
                   })
              }
          }
          
          if (name === 'Blockquote') {
              if (!lineActive) {
                  node.iterate({
                       enter: (child) => {
                           if (child.type.name === 'QuoteMark') {
                               builder.add(child.from, child.to, Decoration.replace({}))
                           }
                       }
                   })
              }
          }

          if (name === 'FencedCode') {
              if (!lineActive) {
                   node.iterate({
                       enter: (child) => {
                           if (child.type.name === 'CodeMark' || child.type.name === 'CodeInfo') {
                               builder.add(child.from, child.to, Decoration.replace({}))
                           }
                       }
                   })
              }
          }
          
          if (name === 'ListItem') {
               if (!lineActive) {
                    node.iterate({
                       enter: (child) => {
                           if (child.type.name === 'ListMark') {
                               builder.add(child.from, child.to, Decoration.replace({}))
                           }
                       }
                   })
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

const extensions = [
  markdown({ codeLanguages: languages }),
  oneDark,
  EditorView.lineWrapping, 
  livePreviewPlugin,
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
    ".cm-activeLine": {
        backgroundColor: "transparent" // Remove default highlight to be cleaner
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-primary)"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(var(--hue-primary), 70%, 60%, 0.3)" // Approximate primary color alpha
    }
  })
]

const view = shallowRef<EditorView>()

const handleReady = (payload: { view: EditorView }) => {
  view.value = payload.view
}

// Add shortcut for save
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
  :deep(.cm-header-1) { font-family: var(--font-sans); font-size: 2.2em; font-weight: 600; color: white; margin-top: 1em; }
  :deep(.cm-header-2) { font-family: var(--font-sans); font-size: 1.8em; font-weight: 600; color: white; margin-top: 1em; }
  :deep(.cm-header-3) { font-family: var(--font-sans); font-size: 1.5em; font-weight: 600; color: white; margin-top: 0.8em; }
  :deep(.cm-header-4) { font-family: var(--font-sans); font-size: 1.25em; font-weight: 600; }
  :deep(.cm-header-5) { font-family: var(--font-sans); font-size: 1.1em; font-weight: 600; }
  
  // Text Styles
  :deep(.cm-bold) { font-weight: 600; color: var(--color-primary); } 
  :deep(.cm-italic) { font-style: italic; color: var(--text-secondary); }
  
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
    color: var(--color-accent); // Just to pop a bit
    font-size: 0.9em;
  }
  
  // List
  :deep(.cm-list-mark) {
    color: var(--color-primary);
    font-weight: bold;
  }
  
  // Blockquote
  :deep(.cm-quote-mark) {
    color: var(--text-muted);
    font-weight: bold;
  }
}
</style>
