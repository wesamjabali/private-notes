import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Exact Obsidian Default Dark variables
export const obsidianColors = {
  backgroundPrimary: '#1e1e1e', // --background-primary
  backgroundSecondary: '#2a2a2a', // --background-secondary
  textNormal: '#dcddde', // --text-normal
  textFaint: '#999999', // --text-faint
  textAccent: '#a882ff', // --text-accent (Obsidian Purple)
  interactiveAccent: '#7b53db', // --interactive-accent
  selection: 'rgba(123, 83, 219, 0.3)', // selection color
  caret: '#a882ff', // caret color
  lineHighlight: 'rgba(255, 255, 255, 0.05)',
  
  // Syntax specific
  keyword: '#ff7b72', // Pinkish/Red
  atom: '#d2a8ff', // Purple
  number: '#79c0ff', // Blue
  definition: '#d2a8ff', // Purple
  variable: '#dcddde', // Text Normal
  string: '#a5d6ff', // Light Blue
  comment: '#8b949e', // Gray
  meta: '#79c0ff', // Blue
  tag: '#7ee787', // Green
  attribute: '#79c0ff', // Blue
}

export const obsidianHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: obsidianColors.keyword },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: obsidianColors.variable },
  { tag: [t.processingInstruction, t.string, t.inserted], color: obsidianColors.string },
  { tag: [t.function(t.variableName), t.labelName], color: obsidianColors.definition },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: obsidianColors.atom },
  { tag: [t.definition(t.name), t.separator], color: obsidianColors.variable },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: obsidianColors.number },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: obsidianColors.keyword },
  { tag: [t.meta, t.comment], color: obsidianColors.comment },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: obsidianColors.textFaint, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: obsidianColors.textNormal },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: obsidianColors.atom },
  { tag: [t.tagName], color: obsidianColors.tag },
  { tag: [t.attributeName], color: obsidianColors.attribute },
])

export const obsidianTheme = EditorView.theme({
  '&': {
    color: 'var(--text-normal, #dcddde)',
    backgroundColor: 'var(--background-primary, #1e1e1e)',
    fontSize: '16px',
    lineHeight: '1.5',
    fontFamily: 'var(--font-text, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
    height: '100%'
  },
  '.cm-content': {
    caretColor: 'var(--text-accent, #a882ff)',
    padding: '40px 60px', // Minimal padding as requested
    maxWidth: '800px',
    margin: '0 auto'
  },
  '@media (max-width: 768px)': {
      '.cm-content': {
          padding: '20px 15px'
      },
      '.cm-table-add-btn': {
          width: '28px',
          height: '28px',
          fontSize: '20px'
      },
      '.cm-table-menu-item': {
          padding: '12px 16px'
      }
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--text-accent, #a882ff)'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--interactive-accent, #7b53db) !important',
    opacity: '0.3'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent'
  },
  // Headers (Visual styling, logic handles sizes)
  '.cm-header-1': { fontSize: '1.6em', fontWeight: 'bold' },
  '.cm-header-2': { fontSize: '1.4em', fontWeight: 'bold' },
  '.cm-header-3': { fontSize: '1.3em', fontWeight: 'bold' },
  '.cm-header-4': { fontSize: '1.2em', fontWeight: 'bold' },
  '.cm-header-5': { fontSize: '1.1em', fontWeight: 'bold' },
  '.cm-header-6': { fontSize: '1.1em', fontWeight: 'bold', color: 'var(--text-faint)' },
  
  // Custom classes we'll use in LivePreviewExtension
  '.cm-md-header': {
    // Base style for headers
    lineHeight: '1.3',
    marginBottom: '0.25em'
  },
  '.cm-md-bold': {
    fontWeight: 'bold',
    color: 'var(--text-normal)'
  },
  '.cm-md-italic': {
    fontStyle: 'italic'
  },
  '.cm-md-strikethrough': {
    textDecoration: 'line-through',
    opacity: '0.7'
  },
  '.cm-md-link': {
    color: 'var(--text-accent)',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  '.cm-md-link:hover': {
    textDecoration: 'underline'
  },
  
  // Custom Code Block Styles
  '.cm-md-code-line': {
    backgroundColor: '#252525', // Slightly lighter than bg (#1e1e1e)
    display: 'block', // Ensure it takes full width (Decoration.line applies to the wrapper usually)
    fontFamily: 'var(--font-mono, monospace)', // Use monospace
  },
  '.cm-md-code-start': {
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    paddingTop: '4px'
  },
  '.cm-md-code-end': {
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
    paddingBottom: '4px'
  },
  
  // Table Widget Styles - Obsidian-style with floating controls
  '.cm-table-widget': {
    margin: '1em 0',
    borderRadius: '8px',
    overflow: 'visible',
    backgroundColor: '#252525',
    border: '1px solid #3a3a3a',
    position: 'relative',
    paddingTop: '24px',  // Space for top edge hover
    paddingLeft: '24px', // Space for left edge hover  
    paddingRight: '24px', // Space for right edge hover
    paddingBottom: '24px' // Space for bottom edge hover
  },
  '.cm-table-wrapper': {
    overflowX: 'auto',
    padding: '0'
  },
  '.cm-table': {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.95rem'
  },
  
  // Floating add button - absolute positioned
  '.cm-table-add-btn': {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--interactive-accent, #7b53db)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'transform 0.1s, background 0.15s'
  },
  '.cm-table-add-btn:hover': {
    transform: 'scale(1.15)',
    background: '#8a63e8'
  },
  
  // Hover line indicator
  '.cm-table-hover-line': {
    position: 'absolute',
    background: 'var(--interactive-accent, #7b53db)',
    pointerEvents: 'none',
    zIndex: '5',
    opacity: '0.6'
  },
  '.cm-table-hover-line-horizontal': {
    height: '2px',
    left: '16px',
    right: '0'
  },
  '.cm-table-hover-line-vertical': {
    width: '2px',
    top: '16px',
    bottom: '0'
  },
  
  // Table header row
  '.cm-table-header-row th': {
    backgroundColor: '#2a2a2a',
    fontWeight: 'bold',
    padding: '0.6rem 0.75rem',
    borderBottom: '2px solid #555',
    textAlign: 'left'
  },
  
  // Table data rows
  '.cm-table-data-row td': {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #333'
  },
  '.cm-table-data-row:last-of-type td': {
    borderBottom: 'none'
  },
  '.cm-table-data-row:hover': {
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  
  // Table cells - editable
  '.cm-table-cell': {
    minWidth: '80px',
    outline: 'none',
    cursor: 'text'
  },
  '.cm-table-cell:focus': {
    backgroundColor: '#333',
    boxShadow: 'inset 0 0 0 2px var(--interactive-accent, #7b53db)',
    borderRadius: '2px'
  },
  
  // Context menu styles - matching sidebar ContextMenu.vue
  '.cm-table-context-menu': {
    background: 'var(--bg-dark-300, #1e1e1e)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
    borderRadius: 'var(--radius-md, 0.75rem)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    minWidth: '180px',
    padding: '0.5rem',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    color: 'var(--text-primary, #dcddde)'
  },
  '.cm-table-menu-item': {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm, 0.5rem)',
    color: 'var(--text-primary, #dcddde)',
    transition: 'all 0.2s'
  },
  '.cm-table-menu-item:hover': {
    background: 'var(--bg-dark-400, #2a2a2a)',
    transform: 'translateX(2px)'
  },
  '.cm-table-menu-icon': {
    width: '20px',
    marginRight: '0.75rem',
    textAlign: 'center',
    opacity: '0.7'
  },
  '.cm-table-menu-item:hover .cm-table-menu-icon': {
    opacity: '1'
  },
  '.cm-table-menu-danger': {
    color: 'var(--color-accent, #ff7b72)'
  },
  '.cm-table-menu-danger:hover': {
    background: 'hsla(var(--hue-accent, 330), 50%, 50%, 0.1)'
  },
  '.cm-table-menu-separator': {
    height: '1px',
    background: 'var(--border-subtle, rgba(255,255,255,0.1))',
    margin: '6px 8px'
  },
}, { dark: true })

export const obsidianStyles = [
  obsidianTheme,
  syntaxHighlighting(obsidianHighlightStyle)
]
