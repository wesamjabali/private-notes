
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { history, historyKeymap, indentWithTab, standardKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useGeminiStore } from "~/stores/gemini";
import { useSettingsStore } from "~/stores/settings";

import { inlineSuggestionExtension } from "~/codemirror/InlineSuggestionExtension";

import { livePreviewExtension } from "~/codemirror/LivePreviewExtension";

import { highlight } from "~/codemirror/HighlightLezerExtension";
import { obsidianStyles } from "~/codemirror/ObsidianTheme";

export function useEditorSetup(emit: any) {
  const settings = useSettingsStore();
  const geminiStore = useGeminiStore();

  
  const lineNumbersCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();
  const themeCompartment = new Compartment();

  
  const addHighlightEffect = StateEffect.define<{ from: number; to: number }>();
  const removeHighlightEffect = StateEffect.define<null>();

  const highlightField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);
      for (let e of tr.effects) {
        if (e.is(addHighlightEffect)) {
          decorations = Decoration.set([
            Decoration.mark({ class: "cm-pending-change" }).range(
              e.value.from,
              e.value.to
            ),
          ]);
        } else if (e.is(removeHighlightEffect)) {
          decorations = Decoration.none;
        }
      }
      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  
  const getThemeExtension = () => {
    return EditorView.theme({
      "&": {
        fontSize: `${settings.editorFontSize}px`,
        fontFamily: settings.editorFontFamily,
        color: settings.editorTextColor,
        backgroundColor: settings.editorBackgroundColor,
        "--editor-code-font-family": settings.editorCodeFontFamily,
        "--editor-code-font-size": `${settings.editorCodeFontSize}px`,
      },
      ".cm-content": {
        fontFamily: settings.editorFontFamily,
        lineHeight: `${settings.editorLineHeight}`,
      },
      ".cm-scroller": {
        fontFamily: settings.editorFontFamily,
        lineHeight: `${settings.editorLineHeight}`,
      },
    });
  };

  const extensions = [
    history(),
    highlightSelectionMatches(),
    closeBrackets(),
    autocompletion(),
    highlightField,

    
    lineNumbersCompartment.of(
      settings.editorShowLineNumbers ? lineNumbers() : []
    ),
    wordWrapCompartment.of(
      settings.editorWordWrap ? EditorView.lineWrapping : []
    ),
    themeCompartment.of(getThemeExtension()),

    keymap.of([
      ...standardKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...lintKeymap,
      ...completionKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
      
      {
        key: "Mod-s",
        run: () => {
          emit("save");
          return true;
        },
      },
    ]),
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      extensions: [highlight],
    }),
    obsidianStyles,
    livePreviewExtension,
    inlineSuggestionExtension(
      (prefix: string, suffix: string) => geminiStore.getInlineCompletion(prefix, suffix),
      () => {
        if (!settings.enableInlineSuggestions) return false;
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) ||
          (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
          window.innerWidth < 768;
        if (isMobile && !settings.enableInlineSuggestionsMobile) return false;
        return true;
      },
      () => settings.inlineSuggestionDebounceTime
    ),
  ];

  return {
    extensions,
    lineNumbersCompartment,
    wordWrapCompartment,
    themeCompartment,
    getThemeExtension,
    addHighlightEffect,
    removeHighlightEffect,
    highlightField,
  };
}
