import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";


export const obsidianColors = {
  backgroundPrimary: "#1e1e1e", 
  backgroundSecondary: "#2a2a2a", 
  textNormal: "#dcddde", 
  textFaint: "#999999", 
  textAccent: "#a882ff", 
  interactiveAccent: "#7b53db", 
  selection: "rgba(123, 83, 219, 0.3)", 
  caret: "#a882ff", 
  lineHighlight: "rgba(255, 255, 255, 0.05)",

  
  keyword: "#ff7b72", 
  atom: "#d2a8ff", 
  number: "#79c0ff", 
  definition: "#d2a8ff", 
  variable: "#dcddde", 
  string: "#a5d6ff", 
  comment: "#8b949e", 
  meta: "#79c0ff", 
  tag: "#7ee787", 
  attribute: "#79c0ff", 
};

export const obsidianHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: obsidianColors.keyword },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: obsidianColors.variable,
  },
  {
    tag: [t.processingInstruction, t.string, t.inserted],
    color: obsidianColors.string,
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: obsidianColors.definition,
  },
  {
    tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: obsidianColors.atom,
  },
  { tag: [t.definition(t.name), t.separator], color: obsidianColors.variable },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: obsidianColors.number,
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: obsidianColors.keyword,
  },
  { tag: [t.meta, t.comment], color: obsidianColors.comment },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: obsidianColors.textFaint, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: obsidianColors.textNormal },
  {
    tag: [t.atom, t.bool, t.special(t.variableName)],
    color: obsidianColors.atom,
  },
  { tag: [t.tagName], color: obsidianColors.tag },
  { tag: [t.attributeName], color: obsidianColors.attribute },
]);

export const obsidianTheme = EditorView.theme(
  {
    "&": {
      color: "var(--editor-text, #dcddde)",
      backgroundColor: "var(--editor-bg, #1e1e1e)",
      fontSize: "var(--editor-font-size, 16px)",
      lineHeight: "1.5",
      fontFamily:
        'var(--font-text, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--text-accent, #a882ff)",
      padding: "40px 60px", 
      maxWidth: "800px",
      margin: "0 auto",
    },
    "@media (max-width: 768px)": {
      ".cm-content": {
        padding: "20px 15px",
      },
      ".cm-table-add-btn": {
        width: "28px",
        height: "28px",
        fontSize: "20px",
      },
      ".cm-table-menu-item": {
        padding: "12px 16px",
      },
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--text-accent, #a882ff)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "var(--interactive-accent, #7b53db) !important",
        opacity: "0.3",
      },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    
    ".cm-header-1": { fontSize: "1.6em", fontWeight: "bold" },
    ".cm-header-2": { fontSize: "1.4em", fontWeight: "bold" },
    ".cm-header-3": { fontSize: "1.3em", fontWeight: "bold" },
    ".cm-header-4": { fontSize: "1.2em", fontWeight: "bold" },
    ".cm-header-5": { fontSize: "1.1em", fontWeight: "bold" },
    ".cm-header-6": {
      fontSize: "1.1em",
      fontWeight: "bold",
      color: "var(--text-faint)",
    },

    
    ".cm-md-header": {
      
      lineHeight: "1.3",
      marginBottom: "0.25em",
    },
    ".cm-md-bold": {
      fontWeight: "bold",
      color: "var(--text-normal)",
    },
    ".cm-md-italic": {
      fontStyle: "italic",
    },
    ".cm-md-strikethrough": {
      textDecoration: "line-through",
      opacity: "0.7",
    },
    ".cm-text-faint": {
      color: "var(--text-faint, #999999)",
    },
    
    ".cm-list-mark": {
      color: "var(--text-faint, #999)",
    },
    ".cm-list-bullet": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "18px", 
      height: "100%",
      verticalAlign: "middle",
      marginRight: "4px",
      transform: "translateY(-1px)", 
    },
    ".cm-list-bullet::after": {
      content: '""', 
      width: "5px",
      height: "5px",
      borderRadius: "50%",
      backgroundColor: "var(--text-faint, #999)",
      display: "block",
    },
    ".cm-list-indent": {
      
      letterSpacing: "2px", 
      opacity: "0.5", 
    },
    ".cm-quote-border": {
      borderLeft: "4px solid var(--interactive-accent, #7b53db)",
      marginRight: "0.5em",
      display: "inline-block",
      height: "1.2em",
      verticalAlign: "text-bottom",
      opacity: "0.8",
    },
    ".cm-md-quote": {
      borderLeft: "4px solid var(--interactive-accent, #7b53db)",
      paddingLeft: "0.5em",
      opacity: "0.8",
    },
    ".cm-md-link": {
      color: "var(--text-accent)",
      textDecoration: "none",
      cursor: "pointer",
    },
    ".cm-md-link:hover": {
      textDecoration: "underline",
    },

    ".cm-md-sup": {
      fontSize: "0.8em",
      verticalAlign: "super",
      color: "var(--text-normal)",
    },
    ".cm-md-sub": {
      fontSize: "0.8em",
      verticalAlign: "sub",
      color: "var(--text-normal)",
    },

    ".cm-md-inline-code": {
      fontFamily: 'var(--editor-code-font-family, "JetBrains Mono", monospace)',
      fontSize: "var(--editor-code-font-size, 0.85em)",
      backgroundColor: "rgba(255,255,255,0.05)",
      color: "#ff7b72",
      padding: "0.1em 0.3em",
      borderRadius: "4px",
    },

    
    ".cm-code-header-widget": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#2a2a2a",
      borderTopLeftRadius: "8px",
      borderTopRightRadius: "8px",
      borderBottomLeftRadius: "0",
      borderBottomRightRadius: "0",
      padding: "6px 12px",
      fontFamily: "var(--font-mono, monospace)",
      marginBottom: "0",
      marginTop: "0", 
      borderBottom: "1px solid #333",
      minWidth: "100%",
      width: "100%",
      boxSizing: "border-box",
    },

    ".cm-hidden-line": {
      display: "none",
    },

    ".cm-code-header-left": {
      display: "flex",
      alignItems: "center",
    },

    ".cm-code-lang": {
      color: "#888",
      fontSize: "0.8em",
      textTransform: "uppercase",
      fontWeight: "bold",
      letterSpacing: "0.05em",
    },

    ".cm-code-copy-btn": {
      backgroundColor: "transparent",
      border: "1px solid #444",
      borderRadius: "4px",
      color: "#aaa",
      cursor: "pointer",
      fontSize: "0.75em",
      padding: "2px 8px",
      transition: "all 0.2s",
      fontFamily: "inherit",
    },
    ".cm-code-copy-btn:hover": {
      backgroundColor: "#333",
      color: "#fff",
      borderColor: "#666",
    },
    ".cm-code-copy-btn.copied": {
      borderColor: "var(--interactive-accent, #7b53db)",
      color: "var(--interactive-accent, #7b53db)",
    },

    
    ".cm-md-code-line": {
      backgroundColor: "#252525", 
      display: "block", 
      fontFamily: 'var(--editor-code-font-family, "JetBrains Mono", monospace)', 
      fontSize: "var(--editor-code-font-size, inherit)",
    },
    ".cm-md-code-start": {
      borderTopLeftRadius: "0",
      borderTopRightRadius: "0", 
      paddingTop: "4px",
    },
    ".cm-md-code-end": {
      borderBottomLeftRadius: "8px",
      borderBottomRightRadius: "8px",
      paddingBottom: "4px",
    },

    
    ".cm-table-widget": {
      margin: "0", 
      borderRadius: "8px",
      overflow: "visible",
      backgroundColor: "#252525",
      border: "1px solid #3a3a3a",
      position: "relative",
      paddingTop: "24px", 
      paddingLeft: "24px", 
      paddingRight: "24px", 
      paddingBottom: "24px", 
    },
    ".cm-table-wrapper": {
      overflowX: "auto",
      padding: "0",
    },
    ".cm-table": {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.95rem",
    },

    
    ".cm-table-add-btn": {
      position: "absolute",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: "var(--interactive-accent, #7b53db)",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: "16px",
      lineHeight: "1",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "10",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      transition: "transform 0.1s, background 0.15s",
    },
    ".cm-table-add-btn:hover": {
      transform: "scale(1.15)",
      background: "#8a63e8",
    },

    
    ".cm-table-hover-line": {
      position: "absolute",
      background: "var(--interactive-accent, #7b53db)",
      pointerEvents: "none",
      zIndex: "5",
      opacity: "0.6",
    },
    ".cm-table-hover-line-horizontal": {
      height: "2px",
      left: "16px",
      right: "0",
    },
    ".cm-table-hover-line-vertical": {
      width: "2px",
      top: "16px",
      bottom: "0",
    },

    
    ".cm-table-header-row th": {
      backgroundColor: "#2a2a2a",
      fontWeight: "bold",
      padding: "0.6rem 0.75rem",
      borderBottom: "2px solid #555",
      textAlign: "left",
    },

    
    ".cm-table-data-row td": {
      padding: "0.5rem 0.75rem",
      borderBottom: "1px solid #333",
    },
    ".cm-table-data-row:last-of-type td": {
      borderBottom: "none",
    },
    ".cm-table-data-row:hover": {
      backgroundColor: "rgba(255,255,255,0.02)",
    },

    
    ".cm-table-cell": {
      minWidth: "80px",
      outline: "none",
      cursor: "text",
    },
    ".cm-table-cell:focus": {
      backgroundColor: "#333",
      boxShadow: "inset 0 0 0 2px var(--interactive-accent, #7b53db)",
      borderRadius: "2px",
    },

    
    ".cm-table-context-menu": {
      background: "var(--bg-dark-300, #1e1e1e)",
      border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
      borderRadius: "var(--radius-md, 0.75rem)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      minWidth: "180px",
      padding: "0.5rem",
      fontFamily: "inherit",
      fontSize: "0.9rem",
      color: "var(--text-primary, #dcddde)",
    },
    ".cm-table-menu-item": {
      display: "flex",
      alignItems: "center",
      padding: "0.6rem 0.75rem",
      cursor: "pointer",
      borderRadius: "var(--radius-sm, 0.5rem)",
      color: "var(--text-primary, #dcddde)",
      transition: "all 0.2s",
    },
    ".cm-table-menu-item:hover": {
      background: "var(--bg-dark-400, #2a2a2a)",
      transform: "translateX(2px)",
    },
    ".cm-table-menu-icon": {
      width: "20px",
      marginRight: "0.75rem",
      textAlign: "center",
      opacity: "0.7",
    },
    ".cm-table-menu-item:hover .cm-table-menu-icon": {
      opacity: "1",
    },
    ".cm-table-menu-danger": {
      color: "var(--color-accent, #ff7b72)",
    },
    ".cm-table-menu-danger:hover": {
      background: "hsla(var(--hue-accent, 330), 50%, 50%, 0.1)",
    },
    ".cm-table-menu-separator": {
      height: "1px",
      background: "var(--border-subtle, rgba(255,255,255,0.1))",
      margin: "6px 8px",
    },
    
    ".cm-frontmatter-table": {
      display: "table",
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0",
      marginBottom: "0", 
      fontSize: "0.85rem",
      fontFamily: "var(--font-mono, monospace)",
      border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
      borderRadius: "6px",
      overflow: "hidden",
      background: "var(--bg-dark-300, #252525)",
    },
    ".cm-frontmatter-row": {
      display: "table-row",
    },
    ".cm-frontmatter-key": {
      display: "table-cell",
      textAlign: "left",
      padding: "4px 12px",
      color: "var(--text-muted, #999)",
      background: "rgba(255,255,255,0.03)",
      borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.05))",
      fontWeight: "bold",
      width: "1%",
      whiteSpace: "nowrap",
      verticalAlign: "top",
    },
    ".cm-frontmatter-val": {
      display: "table-cell",
      textAlign: "left",
      padding: "4px 12px",
      color: "var(--text-accent, #a882ff)",
      borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.05))",
    },
    ".cm-frontmatter-row:last-child .cm-frontmatter-key, .cm-frontmatter-row:last-child .cm-frontmatter-val":
      {
        borderBottom: "none",
      },
  },
  { dark: true }
);

export const obsidianStyles = [
  obsidianTheme,
  syntaxHighlighting(obsidianHighlightStyle),
];
