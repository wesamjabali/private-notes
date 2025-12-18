import {
  Prec,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
  type DecorationSet,
} from "@codemirror/view";


export const setSuggestion = StateEffect.define<{
  text: string;
  pos: number;
} | null>();


export const suggestionField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    if (tr.docChanged) decorations = Decoration.none;
    for (let e of tr.effects) {
      if (e.is(setSuggestion)) {
        if (e.value) {
          decorations = Decoration.set([
            Decoration.widget({
              widget: new InlineSuggestionWidget(e.value.text),
              side: 1,
            }).range(e.value.pos),
          ]);
        } else {
          decorations = Decoration.none;
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

class InlineSuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.opacity = "0.5";
    span.style.pointerEvents = "none";
    return span;
  }
}

export function inlineSuggestionExtension(
  fetchSuggestion: (prefix: string, suffix: string) => Promise<string | null>,
  isEnabled: () => boolean,
  getDebounceTime: () => number
): Extension {
  let debounceTimer: NodeJS.Timeout;

  const viewPlugin = ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {}

      update(update: ViewUpdate) {
        if (!isEnabled()) {
          if (update.state.field(suggestionField).size > 0) {
            setTimeout(() => {
              update.view.dispatch({ effects: setSuggestion.of(null) });
            }, 0);
          }
          return;
        }

        if (update.selectionSet) {
          const decorations = update.state.field(suggestionField);
          if (decorations.size > 0) {
            update.view.dispatch({ effects: setSuggestion.of(null) });
            return;
          }
        }

        if (update.docChanged) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const state = update.view.state;
            const pos = state.selection.main.head;
            const prefix = state.doc.sliceString(0, pos);
            const suffix = state.doc.sliceString(pos);

            
            if (prefix.trim().length < 5) return;

            const suggestion = await fetchSuggestion(prefix, suffix);
            if (suggestion) {
              update.view.dispatch({
                effects: setSuggestion.of({ text: suggestion, pos }),
              });
            }
          }, getDebounceTime());
        }
      }

      destroy() {
        clearTimeout(debounceTimer);
      }
    }
  );

  const keyMap = keymap.of([
    {
      key: "Escape",
      run: (view: EditorView) => {
        const decorations = view.state.field(suggestionField);
        if (decorations.size === 0) return false;

        view.dispatch({ effects: setSuggestion.of(null) });
        return true;
      },
    },
    {
      key: "Tab",
      run: (view: EditorView) => {
        const decorations = view.state.field(suggestionField);
        if (decorations.size === 0) return false;

        let suggestionText = "";
        let suggestionPos = 0;

        
        const iter = decorations.iter();
        while (iter.value) {
          if (iter.value.spec.widget instanceof InlineSuggestionWidget) {
            suggestionText = iter.value.spec.widget.text;
            suggestionPos = iter.from;
            break;
          }
          iter.next();
        }

        if (suggestionText) {
          view.dispatch({
            changes: { from: suggestionPos, insert: suggestionText },
            effects: setSuggestion.of(null),
          });
          return true;
        }
        return false;
      },
    },
  ]);

  return [suggestionField, viewPlugin, Prec.highest(keyMap)];
}
