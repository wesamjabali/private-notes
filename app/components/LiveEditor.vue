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

// --- WIDGETS ---

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

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super() }
  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-checkbox-wrap'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-checkbox'
    // Prevent editing when clicking the checkbox (visual only for now)
    input.onclick = (e) => e.preventDefault() 
    wrap.appendChild(input)
    return wrap
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr')
    hr.className = 'cm-hr-widget'
    return hr
  }
}

// --- LIVE PREVIEW PLUGIN ---

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

    // Logic Helpers
    const isCursorOnLine = (pos: number) => {
      const line = state.doc.lineAt(pos)
      return cursorPos >= line.from && cursorPos <= line.to
    }
    
    // Check if cursor is strictly inside the node range
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
          const node = nodeRef.node // Access SyntaxNode wrapper for traversing up

          // ------------------------------------------------------------------
          // 1. STYLING (Always applied to content)
          // ------------------------------------------------------------------
          
          if (name.startsWith('ATXHeading')) {
             const level = parseInt(name.slice(-1)) || 1
             const className = `cm-header-${level}`
             // Style the entire line content
             builder.add(doc.lineAt(start).from, doc.lineAt(start).from, Decoration.line({ class: className }))
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
          
          // ------------------------------------------------------------------
          // 2. HIDING / REPLACING MECHANICS (Hybrid)
          // ------------------------------------------------------------------

          // A) BLOCK-LEVEL MARKERS (Reveal on Active Line)
          //    Headers, Blockquotes, Lists, Tables, Horizontal Rules
          
          const blockMarkers = ['HeaderMark', 'QuoteMark', 'ListMark', 'TableDelimiter', 'SetextHeading1', 'SetextHeading2']
          
          if (blockMarkers.includes(name)) {
             // For Setext, the node covers the whole thing, but we specifically want to hide the underline characters
             // if they are their own node. Usually SetextHeading1 contains text + underlines. 
             // Simpler approach: just let user edit basic text.
             if ((name === 'HeaderMark' || name === 'QuoteMark' || name === 'ListMark' || name === 'TableDelimiter') && !isCursorOnLine(start)) {
                 builder.add(start, end, Decoration.replace({}))
                 return
             }
          }

          // Horizontal Rule (--- or ***)
          if (name === 'HorizontalRule') {
             if (!isCursorOnLine(start)) {
                 builder.add(start, end, Decoration.replace({ widget: new HorizontalRuleWidget() }))
                 return
             }
          }

          // Task Lists: [ ] or [x]
          if (name === 'TaskMarker') { 
              // Usually inside a ListItem -> Paragraph -> TaskMarker? Or just ListItem -> TaskMarker
              // Structure is typically: ListItem > TaskMarker
              if (!isCursorOnLine(start)) {
                  const checked = view.state.sliceDoc(start, end).includes('x') || view.state.sliceDoc(start, end).includes('X')
                  builder.add(start, end, Decoration.replace({ widget: new CheckboxWidget(checked) }))
                  return
              }
          }
          
          // Fenced Code: Hide fences (CodeMark/CodeInfo) if line not active
          if (name === 'CodeMark' || name === 'CodeInfo') {
              const parent = node.parent
              if (parent && parent.name === 'FencedCode') {
                  if (!isCursorOnLine(start)) {
                      builder.add(start, end, Decoration.replace({}))
                  }
                  return
              }
          }


          // B) INLINE MARKERS (Reveal on Cursor Inside)
          //    Bold, Italic, Strikethrough, Link, InlineCode

          const inlineMarkers = ['EmphasisMark', 'StrongEmphasisMark', 'StrikethroughMark', 'LinkMark', 'URL']
          
          if (inlineMarkers.includes(name)) {
              let parent = node.parent
              // Traverse up if needed to find the container element (e.g. StrongEmphasis)
              // But usually parent is immediate.
              if (parent) {
                  // If we are in InlineCode context, wait for CodeMark check below (or handle here if generic)
                  // Specific checks:
                  if (parent.name === 'Emphasis' || parent.name === 'StrongEmphasis' || parent.name === 'Strikethrough' || parent.name === 'Link') {
                      if (!isCursorInNode(parent)) {
                          builder.add(start, end, Decoration.replace({}))
                      }
                  }
              }
              return
          }
          
          // Inline Code Markers (` `)
          // Note: CodeMark is used for both FencedCode and InlineCode.
          // We handled FencedCode above. Now check InlineCode.
          if (name === 'CodeMark' && node.parent?.name === 'InlineCode') {
               if (!isCursorInNode(node.parent)) {
                   builder.add(start, end, Decoration.replace({}))
               }
               return
          }

          // C) IMAGES (Render Widget if NOT Cursor Inside)
          if (name === 'Image') {
              if (!isCursorInNode(node)) {
                  const text = state.sliceDoc(start, end)
                  // Regex match ![alt](src)
                  const match = text.match(/!\[(.*?)\]\((.*?)\)/)
                  if (match) {
                      builder.add(start, end, Decoration.replace({ 
                          widget: new ImageWidget(match[2], match[1]) 
                      }))
                  }
                  return false // Skip children
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

// --- EXTENSIONS SETUP ---

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
