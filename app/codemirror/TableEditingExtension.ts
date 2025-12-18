import { syntaxTree } from "@codemirror/language";
import {
    EditorState,
    RangeSetBuilder,
    StateEffect,
    StateField,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import { Decoration, EditorView, WidgetType, keymap } from "@codemirror/view";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

 
export function parseMarkdownTable(text: string): string[][] {
  const lines = text.trim().split("\n");
  const rows: string[][] = [];

  for (let line of lines) {
    line = line.trim();

    if (/^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)*\|?\s*$/.test(line)) {
      continue;
    }

    
    const cells = line
      .replace(/^\|/, "") 
      .replace(/\|$/, "") 
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

 
function toMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length));

  
  const normalizedRows = rows.map((row) => {
    while (row.length < colCount) row.push("");
    return row;
  });

  
  const colWidths = Array(colCount).fill(3); 
  for (const row of normalizedRows) {
    row.forEach((cell, i) => {
      colWidths[i] = Math.max(colWidths[i], cell.length);
    });
  }

  
  const lines: string[] = [];

  
  if (normalizedRows.length === 0) return "";

  
  const headerRow = normalizedRows[0]!;
  lines.push(
    "| " +
      headerRow.map((cell, i) => cell.padEnd(colWidths[i] ?? 3)).join(" | ") +
      " |"
  );

  
  lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");

  
  for (let i = 1; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    if (row) {
      lines.push(
        "| " +
          row.map((cell, j) => cell.padEnd(colWidths[j] ?? 3)).join(" | ") +
          " |"
      );
    }
  }

  return lines.join("\n");
}

 
const toggleTextModeEffect = StateEffect.define<{
  from: number;
  to: number;
  enabled: boolean;
}>();

 
const textModeField = StateField.define<Set<string>>({
  create() {
    return new Set();
  },
  update(value, tr) {
    const newSet = new Set(value);
    for (const effect of tr.effects) {
      if (effect.is(toggleTextModeEffect)) {
        const key = `${effect.value.from}-${effect.value.to}`;
        if (effect.value.enabled) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
      }
    }
    
    if (tr.docChanged) {
      newSet.clear();
    }
    return newSet;
  },
});

 
function isCursorInside(state: EditorState, from: number, to: number): boolean {
  const selection = state.selection.main;
  return selection.head >= from && selection.head <= to;
}

 
class TableWidget extends WidgetType {
  private contextMenu: HTMLElement | null = null;

  constructor(
    readonly tableText: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  override eq(other: WidgetType) {
    return (
      other instanceof TableWidget &&
      this.tableText === other.tableText &&
      this.from === other.from &&
      this.to === other.to
    );
  }

  override destroy() {
    this.closeContextMenu();
  }

  private closeContextMenu() {
    if (this.contextMenu && this.contextMenu.parentNode) {
      this.contextMenu.parentNode.removeChild(this.contextMenu);
    }
    this.contextMenu = null;
  }

  private showContextMenu(
    e: MouseEvent,
    view: EditorView,
    rows: string[][],
    rowIndex: number,
    colIndex: number
  ) {
    e.preventDefault();
    e.stopPropagation();
    this.closeContextMenu();

    const colCount = Math.max(...rows.map((r) => r.length));
    const menu = document.createElement("div");
    
    Object.assign(menu.style, {
      position: "fixed",
      left: `${e.clientX}px`,
      top: `${e.clientY}px`,
      zIndex: "9999",
      background: "hsl(240, 10%, 9%)", 
      border: "1px solid rgba(255,255,255,0.1)", 
      borderRadius: "0.75rem", 
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      minWidth: "180px",
      padding: "0.5rem",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "0.9rem",
      color: "hsl(0, 0%, 98%)", 
    });

    const createItem = (
      label: string,
      icon: string,
      action: () => void,
      danger = false
    ) => {
      const item = document.createElement("div");
      Object.assign(item.style, {
        display: "flex",
        alignItems: "center",
        padding: "0.6rem 0.75rem",
        cursor: "pointer",
        borderRadius: "0.5rem", 
        color: danger ? "hsl(330, 80%, 60%)" : "hsl(0, 0%, 98%)", 
        transition: "all 0.2s",
      });
      item.innerHTML = `<span style="width: 20px; margin-right: 0.75rem; text-align: center; opacity: 0.7;">${icon}</span><span>${label}</span>`;
      item.onmouseenter = () => {
        item.style.background = "hsl(240, 10%, 12%)"; 
        item.style.transform = "translateX(2px)";
      };
      item.onmouseleave = () => {
        item.style.background = "transparent";
        item.style.transform = "translateX(0)";
      };
      item.onclick = (evt) => {
        evt.stopPropagation();
        this.closeContextMenu();
        action();
      };
      return item;
    };

    const createSeparator = () => {
      const sep = document.createElement("div");
      Object.assign(sep.style, {
        height: "1px",
        background: "rgba(255,255,255,0.1)", 
        margin: "6px 8px",
      });
      return sep;
    };

    
    menu.appendChild(
      createItem("Insert row above", "↑", () =>
        this.addRow(view, rows, rowIndex)
      )
    );
    menu.appendChild(
      createItem("Insert row below", "↓", () =>
        this.addRow(view, rows, rowIndex + 1)
      )
    );
    if (rows.length > 1) {
      menu.appendChild(
        createItem(
          "Delete row",
          "🗑",
          () => this.deleteRow(view, rows, rowIndex),
          true
        )
      );
    }
    if (rowIndex > 0) {
      menu.appendChild(
        createItem("Move row up", "⬆", () =>
          this.moveRow(view, rows, rowIndex, -1)
        )
      );
    }
    if (rowIndex < rows.length - 1) {
      menu.appendChild(
        createItem("Move row down", "⬇", () =>
          this.moveRow(view, rows, rowIndex, 1)
        )
      );
    }

    menu.appendChild(createSeparator());

    
    menu.appendChild(
      createItem("Insert column left", "←", () =>
        this.addColumn(view, rows, colIndex)
      )
    );
    menu.appendChild(
      createItem("Insert column right", "→", () =>
        this.addColumn(view, rows, colIndex + 1)
      )
    );
    if (colCount > 1) {
      menu.appendChild(
        createItem(
          "Delete column",
          "🗑",
          () => this.deleteColumn(view, rows, colIndex),
          true
        )
      );
    }
    if (colIndex > 0) {
      menu.appendChild(
        createItem("Move column left", "⬅", () =>
          this.moveColumn(view, rows, colIndex, -1)
        )
      );
    }
    if (colIndex < colCount - 1) {
      menu.appendChild(
        createItem("Move column right", "➡", () =>
          this.moveColumn(view, rows, colIndex, 1)
        )
      );
    }

    menu.appendChild(createSeparator());

    
    menu.appendChild(
      createItem("Edit as Markdown", "✏️", () => {
        view.dispatch({
          effects: toggleTextModeEffect.of({
            from: this.from,
            to: this.to,
            enabled: true,
          }),
          selection: { anchor: this.from + 2 },
        });
        view.focus();
      })
    );

    document.body.appendChild(menu);
    this.contextMenu = menu;

    
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    
    if (rect.right > viewportWidth) {
      menu.style.left = `${e.clientX - rect.width}px`;
    }

    
    const spaceBelow = viewportHeight - e.clientY;
    const spaceAbove = e.clientY;

    
    
    if (rect.height > spaceBelow && spaceAbove > spaceBelow) {
      
      menu.style.top = "auto";
      menu.style.bottom = `${viewportHeight - e.clientY}px`;
      menu.style.maxHeight = `${spaceAbove - 20}px`;
    } else {
      
      menu.style.maxHeight = `${spaceBelow - 20}px`;
    }

    menu.style.overflowY = "auto";

    
    const closeHandler = (evt: MouseEvent) => {
      if (!menu.contains(evt.target as Node)) {
        this.closeContextMenu();
        document.removeEventListener("click", closeHandler);
        document.removeEventListener("contextmenu", closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeHandler);
      document.addEventListener("contextmenu", closeHandler);
    }, 0);
  }

  override toDOM(view: EditorView) {
    const rows = parseMarkdownTable(this.tableText);
    if (rows.length === 0) {
      const span = document.createElement("span");
      span.textContent = this.tableText;
      return span;
    }

    const container = document.createElement("div");
    container.className = "cm-table-widget";

    const colCount = Math.max(...rows.map((r) => r.length));

    
    const addButton = document.createElement("button");
    addButton.className = "cm-table-add-btn";
    addButton.textContent = "+";
    addButton.style.display = "none";
    container.appendChild(addButton);

    
    const hoverLine = document.createElement("div");
    hoverLine.className = "cm-table-hover-line";
    hoverLine.style.display = "none";
    container.appendChild(hoverLine);

    
    let currentAction: { type: "row" | "column"; index: number } | null = null;

    
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "cm-table-wrapper";

    
    const table = document.createElement("table");
    table.className = "cm-table";

    
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.className =
        rowIndex === 0 ? "cm-table-header-row" : "cm-table-data-row";
      tr.setAttribute("data-row", rowIndex.toString());

      
      row.forEach((cell, cellIndex) => {
        const td = document.createElement(rowIndex === 0 ? "th" : "td");
        td.className = "cm-table-cell";
        td.contentEditable = "true";
        
        
        td.setAttribute("data-raw", cell);
        
        
        td.innerHTML = md.renderInline(cell);

        td.setAttribute("data-row", rowIndex.toString());
        td.setAttribute("data-col", cellIndex.toString());

        
        td.addEventListener("contextmenu", (e) => {
          this.showContextMenu(e, view, rows, rowIndex, cellIndex);
        });

        
        td.addEventListener("focus", () => {
             td.textContent = td.getAttribute("data-raw") || "";
        });

        
        td.addEventListener("blur", () => {
          const newValue = td.textContent || "";
          td.setAttribute("data-raw", newValue);
          td.innerHTML = md.renderInline(newValue);
          
          this.updateCell(
            view,
            rows,
            rowIndex,
            cellIndex,
            newValue
          );
        });

        
        td.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            td.blur();
          }
          
          if (e.key === "Tab") {
            e.preventDefault();
            const cells = table.querySelectorAll(".cm-table-cell");
            const currentIndex = Array.from(cells).indexOf(td);
            let nextIndex: number;

            if (e.shiftKey) {
              nextIndex = currentIndex - 1;
              if (nextIndex < 0) nextIndex = cells.length - 1;
            } else {
              nextIndex = currentIndex + 1;
              if (nextIndex >= cells.length) nextIndex = 0;
            }

            const nextCell = cells[nextIndex] as HTMLElement;
            if (nextCell) {
              nextCell.focus();
              const range = document.createRange();
              range.selectNodeContents(nextCell);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
          
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            const allRows = table.querySelectorAll(
              "tr.cm-table-header-row, tr.cm-table-data-row"
            );
            const currentRowIdx = Array.from(allRows).indexOf(tr);
            const targetRowIdx =
              e.key === "ArrowUp" ? currentRowIdx - 1 : currentRowIdx + 1;
            if (targetRowIdx >= 0 && targetRowIdx < allRows.length) {
              const targetRow = allRows[targetRowIdx];
              const targetCell = targetRow?.querySelectorAll(".cm-table-cell")[
                cellIndex
              ] as HTMLElement;
              if (targetCell) {
                e.preventDefault();
                targetCell.focus();
              }
            }
          }
        });

        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    
    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      
      const withinTableY =
        mouseY >= tableRect.top && mouseY <= tableRect.bottom;
      
      const withinTableX =
        mouseX >= tableRect.left && mouseX <= tableRect.right;

      
      const inLeftZone =
        mouseX >= containerRect.left &&
        mouseX < tableRect.left + 20 &&
        withinTableY;
      
      const inRightZone =
        mouseX > tableRect.right - 20 &&
        mouseX <= containerRect.right &&
        withinTableY;
      
      const inTopZone =
        mouseY >= containerRect.top &&
        mouseY < tableRect.top + 20 &&
        withinTableX;
      
      const inBottomZone =
        mouseY > tableRect.bottom - 20 &&
        mouseY <= containerRect.bottom &&
        withinTableX;

      
      addButton.style.display = "none";
      hoverLine.style.display = "none";
      currentAction = null;

      if (inLeftZone || inRightZone) {
        
        const allRows = table.querySelectorAll(
          "tr.cm-table-header-row, tr.cm-table-data-row"
        );
        let closestRowIndex = 0;
        let closestDist = Infinity;
        let insertY = tableRect.top;

        allRows.forEach((row, idx) => {
          const rowRect = row.getBoundingClientRect();
          const distToTop = Math.abs(mouseY - rowRect.top);
          const distToBottom = Math.abs(mouseY - rowRect.bottom);

          if (distToTop < closestDist) {
            closestDist = distToTop;
            closestRowIndex = idx;
            insertY = rowRect.top;
          }
          if (distToBottom < closestDist) {
            closestDist = distToBottom;
            closestRowIndex = idx + 1;
            insertY = rowRect.bottom;
          }
        });

        currentAction = { type: "row", index: closestRowIndex };

        
        addButton.style.display = "flex";
        addButton.style.left = inLeftZone
          ? "4px"
          : `${containerRect.width - 24}px`;
        addButton.style.top = `${insertY - containerRect.top - 10}px`;
        addButton.title = `Insert row ${
          closestRowIndex === 0
            ? "at start"
            : closestRowIndex >= rows.length
            ? "at end"
            : "here"
        }`;

        
        hoverLine.style.display = "block";
        hoverLine.style.left = "24px";
        hoverLine.style.right = "0";
        hoverLine.style.top = `${insertY - containerRect.top}px`;
        hoverLine.style.height = "2px";
        hoverLine.style.width = "auto";
        hoverLine.className =
          "cm-table-hover-line cm-table-hover-line-horizontal";
      } else if (inTopZone || inBottomZone) {
        
        const firstRow = table.querySelector(
          "tr.cm-table-header-row, tr.cm-table-data-row"
        );
        if (firstRow) {
          const cells = firstRow.querySelectorAll(".cm-table-cell");
          let closestColIndex = 0;
          let closestDist = Infinity;
          let insertX = tableRect.left;

          cells.forEach((cell, idx) => {
            const cellRect = cell.getBoundingClientRect();
            const distToLeft = Math.abs(mouseX - cellRect.left);
            const distToRight = Math.abs(mouseX - cellRect.right);

            if (distToLeft < closestDist) {
              closestDist = distToLeft;
              closestColIndex = idx;
              insertX = cellRect.left;
            }
            if (distToRight < closestDist) {
              closestDist = distToRight;
              closestColIndex = idx + 1;
              insertX = cellRect.right;
            }
          });

          currentAction = { type: "column", index: closestColIndex };

          addButton.style.display = "flex";
          addButton.style.left = `${insertX - containerRect.left - 10}px`;
          addButton.style.top = inTopZone
            ? "4px"
            : `${containerRect.height - 24}px`;
          addButton.title = `Insert column ${
            closestColIndex === 0
              ? "at start"
              : closestColIndex >= colCount
              ? "at end"
              : "here"
          }`;

          
          hoverLine.style.display = "block";
          hoverLine.style.left = `${insertX - containerRect.left}px`;
          hoverLine.style.top = "24px";
          hoverLine.style.bottom = "0";
          hoverLine.style.width = "2px";
          hoverLine.style.height = "auto";
          hoverLine.className =
            "cm-table-hover-line cm-table-hover-line-vertical";
        }
      }
    };

    const handleMouseLeave = () => {
      addButton.style.display = "none";
      hoverLine.style.display = "none";
      currentAction = null;
    };

    
    addButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentAction) {
        if (currentAction.type === "row") {
          this.addRow(view, rows, currentAction.index);
        } else {
          this.addColumn(view, rows, currentAction.index);
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    const wrapper = document.createElement("div");
    wrapper.style.padding = "1em 0"; 
    wrapper.appendChild(container);

    return wrapper;
  }

  private updateCell(
    view: EditorView,
    rows: string[][],
    rowIndex: number,
    colIndex: number,
    newValue: string
  ) {
    const newRows = rows.map((row, ri) =>
      row.map((cell, ci) =>
        ri === rowIndex && ci === colIndex ? newValue : cell
      )
    );
    this.updateTable(view, newRows);
  }

  private addRow(view: EditorView, rows: string[][], afterIndex: number) {
    console.log("addRow called", { afterIndex, rowsLength: rows.length, rows });
    const colCount = Math.max(...rows.map((r) => r.length));
    const newRow = Array(colCount).fill("");
    const newRows = [...rows];
    newRows.splice(afterIndex, 0, newRow);
    console.log("newRows after splice", newRows);
    this.updateTable(view, newRows);
  }

  private deleteRow(view: EditorView, rows: string[][], rowIndex: number) {
    const newRows = rows.filter((_, i) => i !== rowIndex);
    this.updateTable(view, newRows);
  }

  private moveRow(
    view: EditorView,
    rows: string[][],
    rowIndex: number,
    direction: number
  ) {
    const newRows = [...rows];
    const targetIndex = rowIndex + direction;
    if (targetIndex >= 0 && targetIndex < rows.length) {
      const temp = newRows[rowIndex]!;
      newRows[rowIndex] = newRows[targetIndex]!;
      newRows[targetIndex] = temp;
      this.updateTable(view, newRows);
    }
  }

  private addColumn(view: EditorView, rows: string[][], afterIndex: number) {
    const newRows = rows.map((row) => {
      const newRow = [...row];
      newRow.splice(afterIndex, 0, "");
      return newRow;
    });
    this.updateTable(view, newRows);
  }

  private deleteColumn(view: EditorView, rows: string[][], colIndex: number) {
    const newRows = rows.map((row) => row.filter((_, i) => i !== colIndex));
    this.updateTable(view, newRows);
  }

  private moveColumn(
    view: EditorView,
    rows: string[][],
    colIndex: number,
    direction: number
  ) {
    const targetIndex = colIndex + direction;
    const newRows = rows.map((row) => {
      const newRow = [...row];
      if (targetIndex >= 0 && targetIndex < row.length) {
        const temp = newRow[colIndex]!;
        newRow[colIndex] = newRow[targetIndex]!;
        newRow[targetIndex] = temp;
      }
      return newRow;
    });
    this.updateTable(view, newRows);
  }

  private updateTable(view: EditorView, newRows: string[][]) {
    const newMarkdown = toMarkdownTable(newRows);

    
    
    let tableFrom = -1;
    let tableTo = -1;

    syntaxTree(view.state).iterate({
      enter: (node) => {
        if (node.type.name === "Table") {
          
          
          
          if (tableFrom === -1) {
            
            
            const nodeText = view.state.doc.sliceString(node.from, node.to);
            
            if (
              Math.abs(node.from - this.from) < 500 ||
              nodeText.includes(this.tableText.slice(0, 50))
            ) {
              tableFrom = node.from;
              tableTo = node.to;
            }
          }
        }
      },
    });

    
    if (tableFrom === -1) {
      console.warn("Could not find table in document, using cached positions");
      tableFrom = this.from;
      tableTo = this.to;
    }

    console.log("updateTable", {
      from: tableFrom,
      to: tableTo,
      newMarkdown: newMarkdown.substring(0, 100) + "...",
    });

    view.dispatch({
      changes: { from: tableFrom, to: tableTo, insert: newMarkdown },
    });
  }
}

 
function computeTableDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const textModeSet = state.field(textModeField, false) || new Set();

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.type.name === "Table") {
        const tableFrom = node.from;
        const tableTo = node.to;
        const tableText = doc.sliceString(tableFrom, tableTo);

        
        const cursorInside = isCursorInside(state, tableFrom, tableTo);
        const textModeKey = `${tableFrom}-${tableTo}`;
        const inTextMode = textModeSet.has(textModeKey);

        
        if (!cursorInside && !inTextMode) {
          builder.add(
            tableFrom,
            tableTo,
            Decoration.replace({
              widget: new TableWidget(tableText, tableFrom, tableTo),
              block: true,
            })
          );
        }

        return false; 
      }
    },
  });

  return builder.finish();
}

 
const tableDecorationsField = StateField.define<DecorationSet>({
  create(state) {
    return computeTableDecorations(state);
  },
  update(decorations, tr) {
    if (
      tr.docChanged ||
      tr.selection ||
      syntaxTree(tr.state) !== syntaxTree(tr.startState) ||
      tr.state.field(textModeField) !== tr.startState.field(textModeField)
    ) {
      return computeTableDecorations(tr.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

 
const tableKeymap = keymap.of([
  {
    key: "Tab",
    run: (view) => {
      
      const { state } = view;
      const pos = state.selection.main.head;

      let inTable = false;
      let tableFrom = 0;
      let tableTo = 0;

      syntaxTree(state).iterate({
        from: pos,
        to: pos,
        enter: (node) => {
          if (node.type.name === "Table") {
            inTable = true;
            tableFrom = node.from;
            tableTo = node.to;
          }
        },
      });

      if (!inTable) return false;

      
      const tableText = state.doc.sliceString(tableFrom, tableTo);
      const relativePos = pos - tableFrom;

      
      const pipes: number[] = [];
      for (let i = 0; i < tableText.length; i++) {
        if (tableText[i] === "|") {
          pipes.push(i);
        }
      }

      
      let nextPipe = pipes.find((p) => p > relativePos);
      if (nextPipe === undefined) {
        
        nextPipe = pipes[0] || 0;
      }

      
      const newPos = tableFrom + nextPipe + 2;
      if (newPos <= tableTo) {
        view.dispatch({
          selection: { anchor: Math.min(newPos, tableTo) },
        });
        return true;
      }

      return false;
    },
  },
  {
    key: "Shift-Tab",
    run: (view) => {
      
      const { state } = view;
      const pos = state.selection.main.head;

      let inTable = false;
      let tableFrom = 0;
      let tableTo = 0;

      syntaxTree(state).iterate({
        from: pos,
        to: pos,
        enter: (node) => {
          if (node.type.name === "Table") {
            inTable = true;
            tableFrom = node.from;
            tableTo = node.to;
          }
        },
      });

      if (!inTable) return false;

      const tableText = state.doc.sliceString(tableFrom, tableTo);
      const relativePos = pos - tableFrom;

      
      const pipes: number[] = [];
      for (let i = 0; i < tableText.length; i++) {
        if (tableText[i] === "|") {
          pipes.push(i);
        }
      }

      
      const reversePipes = [...pipes].reverse();
      let prevPipe = reversePipes.find((p) => p < relativePos - 2);
      if (prevPipe === undefined) {
        prevPipe = pipes[pipes.length - 1] || 0;
      }

      const newPos = tableFrom + prevPipe + 2;
      if (newPos >= tableFrom) {
        view.dispatch({
          selection: { anchor: Math.max(newPos, tableFrom) },
        });
        return true;
      }

      return false;
    },
  },
]);

 
export const tableEditingExtension = [
  textModeField,
  tableDecorationsField,
  tableKeymap,
];
