import { syntaxTree } from "@codemirror/language";
import {
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";

 



function isCursorInside(state: EditorState, from: number, to: number): boolean {
  const selection = state.selection.main;
  return selection.head >= from && selection.head <= to;
}


function isCursorOnLine(
  state: EditorState,
  lineStart: number,
  lineEnd: number
): boolean {
  const selection = state.selection.main;
  return selection.head >= lineStart && selection.head <= lineEnd;
}

 

import katex from "katex";
import mermaid from "mermaid";
import { useGitStore } from "~/stores/git";
import { tableEditingExtension } from "./TableEditingExtension";

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
});

class FrontmatterWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  override eq(other: FrontmatterWidget) {
    return other.text === this.text;
  }

  override toDOM(view: EditorView) {
    const container = document.createElement("div");
    container.className = "cm-frontmatter-table";

    
    
    const lines = this.text.split("\n");
    
    
    const contentLines = lines.filter(
      (l) => l.trim() !== "---" && l.trim().length > 0
    );

    contentLines.forEach((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return;

      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      const row = document.createElement("div");
      row.className = "cm-frontmatter-row";

      const keyCell = document.createElement("div");
      keyCell.className = "cm-frontmatter-key";
      keyCell.textContent = key;

      const valCell = document.createElement("div");
      valCell.className = "cm-frontmatter-val";
      valCell.textContent = val;

      row.appendChild(keyCell);
      row.appendChild(valCell);
      container.appendChild(row);
    });

    const wrapper = document.createElement("div");
    wrapper.style.paddingBottom = "1.5em"; 
    wrapper.appendChild(container);

    
    container.onclick = (e) => {
      e.preventDefault();
      try {
        const pos = view.posAtDOM(container);
        view.dispatch({
          selection: { anchor: pos, head: pos },
          scrollIntoView: true,
        });
        view.focus();
      } catch (err) {
        
      }
    };

    return wrapper;
  }
}

class MediaWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof MediaWidget &&
      this.src === other.src &&
      this.alt === other.alt
    );
  }

  override toDOM(view: EditorView) {
    const container = document.createElement("div");
    container.className = "cm-md-media-container";
    container.style.display = "block";
    container.style.padding = "0.5em 0"; 
    container.style.textAlign = "center"; 

    const store = useGitStore();

    const load = async () => {
      
      if (this.src.startsWith("http") || this.src.startsWith("data:")) {
        const img = document.createElement("img");
        img.src = this.src;
        img.alt = this.alt;
        img.className = "cm-md-image";
        img.style.maxWidth = "100%";
        img.style.borderRadius = "4px";
        img.style.cursor = "pointer";
        
        
        img.onclick = (e) => {
          e.preventDefault();
          try {
            const pos = view.posAtDOM(container);
            view.dispatch({
              selection: { anchor: pos + 1, head: pos + 1 },
              scrollIntoView: true,
            });
            view.focus();
          } catch (err) {
            
          }
        };
        
        container.appendChild(img);
        return;
      }

      
      const result = await store.resolveFileUrl(this.src);
      if (result) {
        if (result.mime.startsWith("video/")) {
          const video = document.createElement("video");
          video.src = result.url;
          video.controls = true;
          video.className = "cm-md-video";
          video.style.maxWidth = "100%";
          video.style.borderRadius = "4px";
          video.style.cursor = "pointer";
          
          
          video.onclick = (e) => {
            e.preventDefault();
            try {
              const pos = view.posAtDOM(container);
              view.dispatch({
                selection: { anchor: pos + 1, head: pos + 1 },
                scrollIntoView: true,
              });
              view.focus();
            } catch (err) {
              
            }
          };
          
          container.appendChild(video);
        } else {
          
          const img = document.createElement("img");
          img.src = result.url;
          img.alt = this.alt;
          img.className = "cm-md-image";
          img.style.maxWidth = "100%";
          img.style.borderRadius = "4px";
          img.style.cursor = "pointer";
          
          
          img.onclick = (e) => {
            e.preventDefault();
            try {
              const pos = view.posAtDOM(container);
              view.dispatch({
                selection: { anchor: pos + 1, head: pos + 1 },
                scrollIntoView: true,
              });
              view.focus();
            } catch (err) {
              
            }
          };
          
          container.appendChild(img);
        }
      } else {
        
        const span = document.createElement("span");
        span.textContent = `[Media not found: ${this.src}]`;
        span.style.color = "#888";
        span.style.fontSize = "0.9em";
        container.appendChild(span);
      }
    };

    load();
    return container;
  }
}

class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof LinkWidget &&
      this.text === other.text &&
      this.url === other.url
    );
  }

  override toDOM(view: EditorView) {
    const a = document.createElement("a");
    a.className = "cm-md-link";
    a.style.cursor = "pointer";
    a.style.color = "#a882ff";

    
    const imgMatch = this.text.trim().match(/^!\[(.*?)\]\s*\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1] || "";
      const src = imgMatch[2] || "";
      const img = document.createElement("img");
      img.alt = alt;
      img.className = "cm-md-image";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "4px";

      
      if (src.startsWith("http") || src.startsWith("data:")) {
        img.src = src;
      } else {
        
        const store = useGitStore();
        store.resolveFileUrl(src).then((res) => {
          if (res) img.src = res.url;
          else img.src = src; 
        });
      }
      a.appendChild(img);
    } else {
      a.textContent = this.text;
    }

    
    
    const store = useGitStore();

    
    a.href = "#";

    
    const isExternal = this.url.match(/^[]+:\/\//);

    if (isExternal) {
      a.href = this.url;
      a.title = this.url;
      a.target = "_blank";
    }

    const resolve = async () => {
      if (!isExternal) {
        const node = store.findNodeByPath(this.url);
        if (node && store.currentRepo) {
          
          
          const repoFullName = store.currentRepo.full_name;
          const href = `/repo/${repoFullName}/${node.path}`;
          a.href = href;
        } else {
          
          
          a.title = "File not found";
        }
      }
    };
    resolve();

    a.onmousedown = (e) => {
      
      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (isModifierPressed) {
        if (isExternal) {
          
          return;
        } else {
          e.preventDefault();
          const href = a.getAttribute("href");
          if (href && href !== "#") {
            
            const event = new CustomEvent("navigate-file", { detail: href });
            view.dom.dispatchEvent(event);
          }
        }
      } else {
        
        
        if (e.button !== 0) return;

        e.preventDefault();
        try {
          
          const pos = view.posAtDOM(a);
          view.dispatch({
            selection: { anchor: pos + 1, head: pos + 1 }, 
            scrollIntoView: true,
          });
          view.focus();
        } catch (err) {
          
        }
      }
    };

    return a;
  }
}

class CodeBlockHeaderWidget extends WidgetType {
  constructor(readonly language: string, readonly code: string) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof CodeBlockHeaderWidget &&
      this.language === other.language &&
      this.code === other.code
    );
  }

  override toDOM() {
    const container = document.createElement("div");
    container.className = "cm-code-header-widget";

    const left = document.createElement("div");
    left.className = "cm-code-header-left";

    
    const langSpan = document.createElement("span");
    langSpan.className = "cm-code-lang";
    langSpan.textContent = this.language || "text";
    left.appendChild(langSpan);

    container.appendChild(left);

    
    const copyBtn = document.createElement("button");
    copyBtn.className = "cm-code-copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = (e) => {
      e.stopPropagation(); 
      navigator.clipboard.writeText(this.code).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    };
    container.appendChild(copyBtn);

    const wrapper = document.createElement("div");
    wrapper.style.paddingTop = "0.5em"; 
    wrapper.appendChild(container);
    return wrapper;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof CheckboxWidget && this.checked === other.checked;
  }

  override toDOM(view: EditorView) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.className = "cm-md-checkbox";
    input.style.marginRight = "0.5em";
    input.style.cursor = "pointer";

    input.onclick = (e) => {
      
      const pos = view.posAtDOM(input);

      const line = view.state.doc.lineAt(pos);
      const lineText = line.text;
      
      let newLineText = lineText;
      if (this.checked) {
        newLineText = lineText.replace(/- \[x\]/i, "- [ ]");
      } else {
        newLineText = lineText.replace(/- \[ \]/, "- [x]");
      }

      if (newLineText !== lineText) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: newLineText },
        });
      }
    };

    return input;
  }
}

class QuoteBorderWidget extends WidgetType {
  constructor() {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof QuoteBorderWidget;
  }

  override toDOM() {
    const span = document.createElement("span");
    span.className = "cm-quote-border";
    return span;
  }
}

class BulletWidget extends WidgetType {
  constructor() {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof BulletWidget;
  }

  override toDOM() {
    const span = document.createElement("span");
    
    span.className = "cm-list-bullet";
    return span;
  }
}

class MermaidWidget extends WidgetType {
  constructor(readonly code: string, readonly startPos: number) {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof MermaidWidget && this.code === other.code;
  }

  override ignoreEvent(event: Event): boolean {
     
     
     return true;
  }

  override toDOM(view: EditorView) {
    const container = document.createElement("div");
    container.className = "cm-mermaid-container";
    container.style.textAlign = "center";
    container.style.padding = "1em 0";
    
    
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    const element = document.createElement("div");
    element.className = "mermaid";
    element.textContent = this.code;
    container.appendChild(element);

    
    container.addEventListener("mousedown", (e) => {
        
        
        
        
    });

    container.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const tr = view.state.update({
             selection: { anchor: this.startPos + 1 }, 
             
        });
        view.dispatch(tr);
        view.focus();
      } catch (err) {
        console.error(err);
      }
    });

    container.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const event = new CustomEvent("mermaid-context-menu", {
            detail: {
                x: e.clientX,
                y: e.clientY,
                id: id,
                code: this.code
            }
        });
        window.dispatchEvent(event);
    });

    
    setTimeout(async () => {
      try {
        await mermaid.run({ nodes: [element] });
      } catch (err) {
        element.innerHTML = `<span style="color: #ff7b72; font-size: 0.85em;">Mermaid Syntax Error</span>`;
        console.error("Mermaid error:", err);
      }
    }, 0);

    return container;
  }
}

class MathWidget extends WidgetType {
  constructor(readonly equation: string, readonly displayMode: boolean) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof MathWidget &&
      this.equation === other.equation &&
      this.displayMode === other.displayMode
    );
  }

  override toDOM(view: EditorView) {
    const span = document.createElement("div"); 
    span.className = this.displayMode ? "cm-math-block" : "cm-math-inline";
    if (this.displayMode) {
        span.style.textAlign = "center";
        span.style.padding = "1em 0";
        span.style.marginBottom = "1em"; 
        span.style.width = "100%";
        span.style.overflowX = "auto"; 
    } else {
        span.style.display = "inline-block"; 
    }
    span.style.cursor = "pointer";
    span.style.userSelect = "none";

    try {
      katex.render(this.equation, span, {
        throwOnError: false,
        displayMode: this.displayMode,
      });
    } catch (e) {
      span.textContent = this.equation;
      span.style.color = "red";
    }

    span.onclick = (e) => {
        e.preventDefault();
        const pos = view.posAtDOM(span);
        view.dispatch({ selection: { anchor: pos + 1 } });
        view.focus();
    }

    return span;
  }
}

class HorizontalRuleWidget extends WidgetType {
  constructor() {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof HorizontalRuleWidget;
  }

  override toDOM() {
    const div = document.createElement("div");
    div.className = "cm-md-hr";
    const hr = document.createElement("hr");
    div.appendChild(hr);
    return div;
  }
}

class CalloutHeaderWidget extends WidgetType {
  constructor(readonly title: string, readonly type: string) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof CalloutHeaderWidget &&
      this.title === other.title &&
      this.type === other.type
    );
  }

  override toDOM(view: EditorView) {
    const container = document.createElement("div");
    container.className = `cm-callout-header cm-callout-${this.type.toLowerCase()}`;
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "0.5em";
    container.style.cursor = "pointer";
    container.style.userSelect = "none";
    container.style.marginBottom = "0.5em"; 
    
    
    const iconSpan = document.createElement("span");
    iconSpan.className = "cm-callout-icon";
    const iconMap: Record<string, string> = {
        info: "ℹ️",
        note: "📝",
        tip: "💡",
        warning: "⚠️",
        danger: "🔥",
        example: "🔎",
        todo: "📋",
        important: "🟣",
        caution: "⛔"
    };
    iconSpan.textContent = iconMap[this.type.toLowerCase()] || "📝";
    
    const titleSpan = document.createElement("span");
    titleSpan.className = "cm-callout-title";
    titleSpan.style.fontWeight = "bold";
    titleSpan.textContent = this.title;

    container.appendChild(iconSpan);
    container.appendChild(titleSpan);

    container.onclick = (e) => {
        e.preventDefault();
        const pos = view.posAtDOM(container);
        view.dispatch({ selection: { anchor: pos + 2 } }); 
        view.focus();
    }
    return container;
  }
}

 

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.compute(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = this.compute(update.view);
      }
    }

    compute(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const { state } = view;
      const doc = state.doc;
      const decos: { from: number; to: number; deco: Decoration }[] = [];
      const occupied: { from: number; to: number }[] = [];


      
      const isOccupied = (start: number, end: number) => {
        return occupied.some(r => Math.max(start, r.from) < Math.min(end, r.to));
      };

      
      const isEscaped = (pos: number) => {
         let backslashCount = 0;
         let checkPos = pos - 1;
         while (checkPos >= 0 && doc.sliceString(checkPos, checkPos + 1) === "\\") {
             backslashCount++;
             checkPos--;
         }
         return backslashCount % 2 === 1;
      };

      
      for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
          from,
          to,
          enter: (node) => {
            const nodeFrom = node.from;
            const nodeTo = node.to;
            const typeName = node.type.name;

            
            if (
              typeName.includes("Code") || 
              typeName === "Link" || 
              typeName === "Image" || 
              typeName === "URL" ||
              typeName.startsWith("ATXHeading") ||
              typeName === "Blockquote" ||
              typeName === "Highlight"
            ) {
               
               
               if (typeName.includes("Code") || typeName === "Link" || typeName === "Image" || typeName === "Highlight") {
                   occupied.push({ from: nodeFrom, to: nodeTo });
               }
            }

            

            
            if (typeName.startsWith("ATXHeading")) {
              const line = doc.lineAt(nodeFrom);
              const onLines = isCursorOnLine(state, line.from, line.to);

              if (!onLines) {
                const lineText = doc.sliceString(nodeFrom, nodeTo);
                const match = lineText.match(/^(#{1,6}\s+)(.*)$/);
                if (match) {
                  const hashesStr = match[1] || "";
                  const hashesLen = hashesStr.length;
                  decos.push({ from: nodeFrom, to: nodeFrom + hashesLen, deco: Decoration.replace({}) });
                  const level = typeName.match(/\d$/)?.[0] || "1";
                  decos.push({ from: nodeFrom + hashesLen, to: nodeTo, deco: Decoration.mark({ class: `cm-md-header cm-header-${level}` }) });
                }
              } else {
                const level = typeName.match(/\d$/)?.[0] || "1";
                decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.mark({ class: `cm-md-header cm-header-${level}` }) });
              }
            }

            
            else if (typeName === "Emphasis" || typeName === "StrongEmphasis" || typeName === "Strikethrough") {
               if (isEscaped(nodeFrom)) return;
               const overlapped = isCursorInside(state, nodeFrom, nodeTo);
               if (!overlapped) {
                   const text = doc.sliceString(nodeFrom, nodeTo);
                   let markerLen = (typeName === "StrongEmphasis" || typeName === "Strikethrough") ? 2 : 1;
                   let cssClass = typeName === "StrongEmphasis" ? "cm-md-bold" : (typeName === "Strikethrough" ? "cm-md-strikethrough" : "cm-md-italic");
                   
                   if (text.length >= markerLen * 2) {
                       decos.push({ from: nodeFrom, to: nodeFrom + markerLen, deco: Decoration.replace({}) });
                       decos.push({ from: nodeFrom + markerLen, to: nodeTo - markerLen, deco: Decoration.mark({ class: cssClass }) });
                       decos.push({ from: nodeTo - markerLen, to: nodeTo, deco: Decoration.replace({}) });
                   }
               }
            }

            else if (typeName === "Highlight") {
                const overlapped = isCursorInside(state, nodeFrom, nodeTo);
                if (!overlapped) {
                     decos.push({ from: nodeFrom, to: nodeFrom + 2, deco: Decoration.replace({}) });
                     decos.push({ from: nodeFrom + 2, to: nodeTo - 2, deco: Decoration.mark({ class: "cm-md-mark" }) });
                     decos.push({ from: nodeTo - 2, to: nodeTo, deco: Decoration.replace({}) });
                }
            }

            
            else if (typeName === "Image") {
                
                let parent: any = (node as any).node?.parent;
                if (parent?.type?.name === "Link") return; 

                if (isEscaped(nodeFrom)) return;
                const overlapped = isCursorInside(state, nodeFrom, nodeTo);
                if (!overlapped) {
                    const text = doc.sliceString(nodeFrom, nodeTo);
                    const imgMatch = text.match(/^!\[(.*?)\]\((.*?)\)$/);
                    if (imgMatch) {
                        decos.push({
                            from: nodeFrom, to: nodeTo,
                            deco: Decoration.replace({ widget: new MediaWidget(imgMatch[2] || "", imgMatch[1] || ""), block: false })
                        });
                    }
                }
            }

            
            else if (typeName === "HorizontalRule") {
                const overlapped = isCursorInside(state, nodeFrom, nodeTo);
                if (!overlapped) {
                    decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.replace({ widget: new HorizontalRuleWidget() }) });
                }
            }

            else if (typeName === "TaskMarker") {
                const text = doc.sliceString(nodeFrom, nodeTo);
                const isChecked = text.toLowerCase().includes("x");
                decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.replace({ widget: new CheckboxWidget(isChecked) }) });
                if (isChecked) {
                    const line = doc.lineAt(nodeFrom);
                    if (line.to > nodeTo) {
                        decos.push({ from: nodeTo, to: line.to, deco: Decoration.mark({ class: "cm-md-strikethrough cm-text-faint" }) });
                    }
                }
            }
            
            
             else if (typeName === "ListMark") {
              const text = doc.sliceString(nodeFrom, nodeTo);
              const line = doc.lineAt(nodeFrom);
              if (nodeFrom > line.from) {
                const indentText = doc.sliceString(line.from, nodeFrom);
                if (indentText.trim() === "") {
                  decos.push({ from: line.from, to: nodeFrom, deco: Decoration.mark({ class: "cm-list-indent" }) });
                }
              }
              if (["-", "*", "+"].includes(text.trim())) {
                decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.replace({ widget: new BulletWidget() }) });
              } else {
                decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.mark({ class: "cm-list-mark" }) });
              }
            }

            
            else if (typeName === "Link") {
              if (isEscaped(nodeFrom)) return;
              const overlapped = isCursorInside(state, nodeFrom, nodeTo);
              if (!overlapped) {
                const text = doc.sliceString(nodeFrom, nodeTo);
                const match = text.match(/^\[([]*)\]\(([]*)\)$/);
                if (match) {
                  decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.replace({ widget: new LinkWidget(match[1] || "", match[2] || "") }) });
                }
              }
            }

            
            else if (typeName === "InlineCode") {
                if (isEscaped(nodeFrom)) return;
                const overlapped = isCursorInside(state, nodeFrom, nodeTo);
                if (!overlapped) {
                    decos.push({ from: nodeFrom, to: nodeFrom+1, deco: Decoration.replace({}) }); 
                    decos.push({ from: nodeTo-1, to: nodeTo, deco: Decoration.replace({}) });
                    decos.push({ from: nodeFrom+1, to: nodeTo-1, deco: Decoration.mark({ class: "cm-md-inline-code" }) });
                } else {
                    decos.push({ from: nodeFrom, to: nodeTo, deco: Decoration.mark({ class: "cm-md-inline-code" }) });
                }
            }
            else if (typeName === "FencedCode" || typeName === "CodeBlock") {
                
            }
          }
        });
      }

      
      
      for (const { from, to } of view.visibleRanges) {
          const text = doc.sliceString(from, to);
          
          
            const processMatch = (regex: RegExp, callback: (match: RegExpExecArray, start: number, end: number) => void) => {
              let match;
              
              if (regex.global) regex.lastIndex = 0;
              while ((match = regex.exec(text)) !== null) {
                const start = from + match.index;
                const end = start + match[0].length;
                
                if (isEscaped(start)) continue;
                
                if (isOccupied(start, end)) continue;
                callback(match, start, end);
              }
            }
          
          
          processMatch(/^> ?\[!(\w+)\] ?(.*)$/gm, (match, start, end) => {
             const line = doc.lineAt(start);
             if (isCursorOnLine(state, line.from, line.to)) {
                 decos.push({ from: start, to: start + 2, deco: Decoration.mark({ class:"cm-formatting-quote" }) });
             } else {
                 const type = match[1] || "NOTE";
                 const title = match[2] || "";
                 decos.push({ from: start, to: end, deco: Decoration.replace({ widget: new CalloutHeaderWidget(title, type) }) });
             }
             occupied.push({ from: start, to: end });
          });

          
          processMatch(/\$([]+)\$/g, (match, start, end) => {
             const eqn = match[1] || "";
             if (isCursorInside(state, start, end)) {
                 decos.push({ from: start, to: start + 1, deco: Decoration.mark({ class: "cm-formatting-math" }) });
                 decos.push({ from: end - 1, to: end, deco: Decoration.mark({ class: "cm-formatting-math" }) });
                 decos.push({ from: start + 1, to: end - 1, deco: Decoration.mark({ class: "cm-math-content" }) });
             } else {
                 decos.push({ from: start, to: end, deco: Decoration.replace({ widget: new MathWidget(eqn, false) }) });
             }
             occupied.push({ from: start, to: end });
          });

          
          processMatch(/\[\[([]+)(\|([]+))?\]\]/g, (match, start, end) => {
             if (isCursorInside(state, start, end)) {
                 
             } else {
                 const link = match[1] || "";
                 const alias = match[3] || link;
                 decos.push({ from: start, to: end, deco: Decoration.replace({ widget: new LinkWidget(alias, link) }) });
             }
             occupied.push({ from: start, to: end });
          });

          
          processMatch(/==([]+)==/g, (match, start, end) => {
             if (isCursorInside(state, start, end)) {
                 decos.push({ from: start, to: start + 2, deco: Decoration.mark({ class: "cm-formatting-mark" }) });
                 decos.push({ from: end - 2, to: end, deco: Decoration.mark({ class: "cm-formatting-mark" }) });
                 decos.push({ from: start + 2, to: end - 2, deco: Decoration.mark({ class: "cm-md-mark" }) });
             } else {
                 decos.push({ from: start, to: start + 2, deco: Decoration.replace({}) });
                 decos.push({ from: end - 2, to: end, deco: Decoration.replace({}) });
                 decos.push({ from: start + 2, to: end - 2, deco: Decoration.mark({ class: "cm-md-mark" }) });
             }
             occupied.push({ from: start, to: end });
          });

          
          processMatch(/(\^|~)(.+?)\1/g, (match, start, end) => {
             const marker = match[1];
             if (isCursorInside(state, start, end)) {
                  
             } else {
                  const cls = marker === "^" ? "cm-md-sup" : "cm-md-sub";
                  decos.push({ from: start, to: start + 1, deco: Decoration.replace({}) });
                  decos.push({ from: start + 1, to: end - 1, deco: Decoration.mark({ class: cls }) });
                  decos.push({ from: end - 1, to: end, deco: Decoration.replace({}) });
             }
             occupied.push({ from: start, to: end });
          });
          
          
          processMatch(/\[\^([]+)\]/g, (match, start, end) => {
             decos.push({ from: start, to: end, deco: Decoration.mark({ class: "cm-md-footnote" }) });
             occupied.push({ from: start, to: end });
          });

          
          processMatch(/^\s*:\s+(.*)$/gm, (match, start, end) => {
              const colonPos = match[0].indexOf(':');
              decos.push({ from: start, to: start + colonPos + 1, deco: Decoration.mark({ class: "cm-md-def-colon" }) });
              decos.push({ from: start + colonPos + 1, to: end, deco: Decoration.mark({ class: "cm-md-def-content" }) });
          });
      }

      
      decos.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.deco.startSide !== b.deco.startSide) return a.deco.startSide - b.deco.startSide;
        return b.to - a.to;
      });

      let prev: { from: number; to: number; deco: Decoration } | null = null;
      for (const d of decos) {
        if (prev && prev.to > d.from && prev.from < d.to) continue; 
        builder.add(d.from, d.to, d.deco);
        prev = d;
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

 


const frontmatterFocusEffect = StateEffect.define<boolean>();


const focusTrackerPlugin = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {}
    update(update: ViewUpdate) {
      if (update.focusChanged) {
        setTimeout(() => {
          update.view.dispatch({
            effects: frontmatterFocusEffect.of(update.view.hasFocus),
          });
        }, 0);
      }
    }
  }
);


const frontmatterField = StateField.define<{
  decorations: DecorationSet;
  hasFocus: boolean;
}>({
  create(state) {
    return {
      decorations: computeFrontmatterDecorations(state, false),
      hasFocus: false,
    };
  },
  update(value, tr) {
    let hasFocus = value.hasFocus;
    for (const effect of tr.effects) {
      if (effect.is(frontmatterFocusEffect)) {
        hasFocus = effect.value;
      }
    }

    if (tr.docChanged || tr.selection || hasFocus !== value.hasFocus) {
      return {
        decorations: computeFrontmatterDecorations(tr.state, hasFocus),
        hasFocus,
      };
    }

    return {
      decorations: value.decorations.map(tr.changes),
      hasFocus,
    };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
});

function computeFrontmatterDecorations(
  state: EditorState,
  hasFocus: boolean
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;

  
  if (doc.lines > 0) {
    const firstLine = doc.line(1);
    if (firstLine.text.trim() === "---") {
      const maxScan = Math.min(doc.lines, 50);
      let foundEnd = false;
      let endLineNo = -1;

      for (let i = 2; i <= maxScan; i++) {
        const line = doc.line(i);
        if (line.text.trim() === "---") {
          foundEnd = true;
          endLineNo = i;
          break;
        }
      }

      if (foundEnd && endLineNo > -1) {
        const endLine = doc.line(endLineNo);
        const from = 0;
        const to = endLine.to;

        const selection = state.selection.main;
        const overlapped = selection.head >= from && selection.head <= to;

        const shouldShowPreview = !hasFocus || !overlapped;

        if (shouldShowPreview) {
          const text = doc.sliceString(from, to);
          builder.add(
            from,
            to,
            Decoration.replace({
              widget: new FrontmatterWidget(text),
              block: true,
            })
          );
        }
      }
    }
  }
  return builder.finish();
}

function computeCodeBlockDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;

  syntaxTree(state).iterate({
    enter: (node: any) => {
      if (node.type.name === "FencedCode") {
        const nodeFrom = node.from;
        const nodeTo = node.to;
        const startLine = doc.lineAt(nodeFrom);
        const endLine = doc.lineAt(nodeTo);
        const overlapped = isCursorInside(state, nodeFrom, nodeTo);

        if (!overlapped) {
          
          const startText = doc.sliceString(nodeFrom, startLine.to);
          const lang = startText.replace(/^`{3,}/, "").trim();
          const fullText = doc.sliceString(nodeFrom, nodeTo);
          const lines = fullText.split("\n");
          const content = lines.slice(1, -1).join("\n");

          
          if (lang === "mermaid") {
              const widgetPos = startLine.from;
              
              
              builder.add(
                nodeFrom,
                nodeTo,
                Decoration.replace({
                  widget: new MermaidWidget(content, nodeFrom),
                  block: true,
                })
              );
              return false;
          }

          
          const linePos = startLine.from;
          const widgetPos = linePos;

          const addLineDeco = () =>
            builder.add(
              linePos,
              linePos,
              Decoration.line({ class: "cm-hidden-line" })
            );

          const addWidgetDeco = () =>
            builder.add(
              widgetPos,
              widgetPos,
              Decoration.widget({
                widget: new CodeBlockHeaderWidget(lang, content),
                block: true,
                side: -1,
              })
            );

          const addReplaceDeco = () =>
            builder.add(widgetPos, startLine.to, Decoration.replace({}));

          
          if (linePos === widgetPos) {
            addWidgetDeco();
            addLineDeco();
            addReplaceDeco();
          } else {
            addLineDeco();
            addWidgetDeco();
            addReplaceDeco();
          }

          
          for (let i = startLine.number + 1; i < endLine.number; i++) {
            const lineObj = doc.line(i);
            const classes = ["cm-md-code-line"];
            if (i === endLine.number - 1) classes.push("cm-md-code-end");

            builder.add(
              lineObj.from,
              lineObj.from,
              Decoration.line({ class: classes.join(" ") })
            );
          }

          
          builder.add(endLine.from, nodeTo, Decoration.replace({}));
        } else {
          
          for (let i = startLine.number; i <= endLine.number; i++) {
            const lineObj = doc.line(i);
            const classes = ["cm-md-code-line"];
            if (i === startLine.number) classes.push("cm-md-code-start");
            if (i === endLine.number) classes.push("cm-md-code-end");

            builder.add(
              lineObj.from,
              lineObj.from,
              Decoration.line({
                class: classes.join(" "),
              })
            );
          }
        }
        return false;
      }
    },
  });

  return builder.finish();
}

const codeBlockField = StateField.define<DecorationSet>({
  create(state) {
    return computeCodeBlockDecorations(state);
  },
  update(decorations, tr) {
    if (
      tr.docChanged ||
      tr.selection ||
      syntaxTree(tr.state) !== syntaxTree(tr.startState)
    ) {
      return computeCodeBlockDecorations(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});


const blockquoteLineField = StateField.define<DecorationSet>({
  create(state) {
    return computeBlockquoteLines(state);
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      return computeBlockquoteLines(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

function computeBlockquoteLines(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  let currentCalloutType: string | null = null;
  
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text.trim();
    
    if (text.startsWith(">")) {
        
        const match = text.match(/^> ?\[!(\w+)\]/);
        if (match && match[1]) {
            currentCalloutType = match[1].toLowerCase();
        }
        
        if (currentCalloutType) {
             builder.add(
                line.from,
                line.from,
                Decoration.line({ class: `cm-callout-block cm-callout-block-${currentCalloutType}` })
              );
        } else {
             builder.add(
                line.from,
                line.from,
                Decoration.line({ class: "cm-md-quote" })
              );
        }
    } else {
        if (text === "") {
             currentCalloutType = null;
        } else {
             currentCalloutType = null;
        }
    }
  }
  return builder.finish();
}


const mermaidNavigationFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.selection) return tr;

  const state = tr.startState;
  const newSelection = tr.newSelection.main;
  const oldSelection = state.selection.main;

  
  if (!newSelection.empty || !oldSelection.empty) return tr;

  
  const isMovingDown = newSelection.head > oldSelection.head;
  const isMovingUp = newSelection.head < oldSelection.head;

  if (!isMovingDown && !isMovingUp) return tr;

  
  let targetPos: number | null = null;
  
  syntaxTree(state).iterate({
    enter: (node) => {
        if (targetPos !== null) return false; 

        if (node.type.name === 'FencedCode') {
             
             const text = state.doc.sliceString(node.from, Math.min(node.to, node.from + 20)); 
             if (text.startsWith('```mermaid')) {
                 if (isMovingDown) {
                     
                     
                     
                     
                     
                     if (oldSelection.head <= node.from && newSelection.head >= node.to) {
                         
                         targetPos = node.from + 4; 
                     }
                 } else if (isMovingUp) {
                     
                     if (oldSelection.head >= node.to && newSelection.head <= node.from) {
                         
                         targetPos = node.to - 4; 
                     }
                 }
             }
        }
    }
  });

  if (targetPos !== null) {
      
      
      
      return state.update({
          selection: { anchor: targetPos },
          effects: EditorView.scrollIntoView(targetPos, { y: 'nearest' })
      });
  }

  return tr;
});

export const livePreviewExtension = [
  tableEditingExtension,
  livePreviewPlugin,
  frontmatterField,
  blockquoteLineField,
  codeBlockField,
  focusTrackerPlugin,
  mermaidNavigationFilter,
  EditorView.lineWrapping,
];
