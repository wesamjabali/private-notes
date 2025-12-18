<script setup lang="ts">
import { redo, selectAll, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useEditorSetup } from "~/composables/useEditorSetup";
import { useGitStore } from "~/stores/git";
import { useSettingsStore } from "~/stores/settings";
import { getFileExtension } from "~/utils/file-types";

const props = defineProps<{
  modelValue: string;
  pendingContent?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "save"): void;
}>();

const editorRef = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

const store = useGitStore();
const settings = useSettingsStore();
const geminiStore = useGeminiStore();

const {
  extensions: baseExtensions,
  lineNumbersCompartment,
  wordWrapCompartment,
  themeCompartment,
  getThemeExtension,
  addHighlightEffect,
  removeHighlightEffect,
  highlightField, 
} = useEditorSetup(emit);

const dropHandler = EditorView.domEventHandlers({
    drop(event, view) {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      event.preventDefault();

      
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;
        
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
          continue;

        
        const timestamp = new Date()
          .toISOString()
          .replace(/[]/g, "")
          .replace("T", "")
          .split(".")[0];
        const ext = getFileExtension(file.name);
        const filename = `${timestamp}${ext}`;

        
        const currentPath = store.currentFilePath || "";
        const currentDir = currentPath.split("/").slice(0, -1).join("/");
        const attachmentDir = currentDir
          ? `${currentDir}/attachments`
          : "attachments";
        const fullPath = `${attachmentDir}/${filename}`;

        console.log(
          `[ObsidianEditor] Uploading drop: ${fullPath} (${file.type})`
        );

        
        store
          .uploadFile(fullPath, file)
          .then((result) => {
            if (!result) {
              console.error(
                "[ObsidianEditor] Upload error: No result returned (repo not selected?)"
              );
              return;
            }

            
            const link = `![[${filename}]]`;
            const insertTransaction = view.state.update({
              changes: { from: pos, insert: link },
            });
            view.dispatch(insertTransaction);
          })
          .catch((err) => {
            console.error("[ObsidianEditor] Upload error:", err);
          });
      }
      return true;
    },
});




const extensions = [
  ...baseExtensions, 
  dropHandler, 
  EditorView.updateListener.of((update) => {
    if (update.docChanged && !props.pendingContent) {
      emit("update:modelValue", update.state.doc.toString());
    }
  }),
];

const router = useRouter();

const handleNavigate = (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (detail && typeof detail === "string") {
    router.push(detail);
  }
};

onMounted(() => {
  if (!editorRef.value) return;

  const state = EditorState.create({
    doc: props.pendingContent || props.modelValue,
    extensions,
  });

  editorView = new EditorView({
    state,
    parent: editorRef.value,
  });

  editorRef.value.addEventListener("navigate-file", handleNavigate);
});

onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.removeEventListener("navigate-file", handleNavigate);
  }
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});

function findDiffRange(original: string, modified: string) {
  let start = 0;
  while (
    start < original.length &&
    start < modified.length &&
    original[start] === modified[start]
  ) {
    start++;
  }
  if (start === original.length && start === modified.length) return null;

  let endOrig = original.length - 1;
  let endMod = modified.length - 1;

  while (
    endOrig >= start &&
    endMod >= start &&
    original[endOrig] === modified[endMod]
  ) {
    endOrig--;
    endMod--;
  }

  return { from: start, to: endMod + 1 }; 
}


watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && !props.pendingContent) {
      const currentValue = editorView.state.doc.toString();
      if (newValue !== currentValue) {
        editorView.dispatch({
          changes: { from: 0, to: currentValue.length, insert: newValue },
        });
      }
    }
  }
);

watch(
  () => props.pendingContent,
  (newPending) => {
    if (!editorView) return;

    if (newPending) {
      
      const currentDoc = editorView.state.doc.toString();
      editorView.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newPending },
      });

      
      const diff = findDiffRange(props.modelValue, newPending);
      if (diff) {
        editorView.dispatch({
          effects: [
            removeHighlightEffect.of(null),
            addHighlightEffect.of(diff),
            EditorView.scrollIntoView(diff.from, { y: "center" }),
          ],
        });
      }
    } else {
      
      const currentDoc = editorView.state.doc.toString();
      if (currentDoc !== props.modelValue) {
        editorView.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: props.modelValue },
        });
      }

      editorView.dispatch({
        effects: removeHighlightEffect.of(null),
      });
    }
  }
);


watch(
  () => [
    settings.editorShowLineNumbers,
    settings.editorWordWrap,
    settings.editorFontSize,
    settings.editorFontFamily,
    settings.editorFontSize,
    settings.editorFontFamily,
    settings.editorLineHeight,
    settings.editorCodeFontSize,
    settings.editorCodeFontFamily,
  ],
  () => {
    if (!editorView) return;

    editorView.dispatch({
      effects: [
        lineNumbersCompartment.reconfigure(
          settings.editorShowLineNumbers ? lineNumbers() : []
        ),
        wordWrapCompartment.reconfigure(
          settings.editorWordWrap ? EditorView.lineWrapping : []
        ),
        themeCompartment.reconfigure(getThemeExtension()),
      ],
    });
  }
);

const insertText = (text: string, opts?: { at?: { x: number; y: number } }) => {
  if (!editorView) return;

  const state = editorView.state;
  let transaction;

  if (opts?.at) {
    const pos = editorView.posAtCoords(opts.at);
    if (pos !== null) {
      transaction = state.update({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length },
        scrollIntoView: true
      });
    }
  }

  if (!transaction) {
     transaction = state.replaceSelection(text);
  }
  
  editorView.dispatch(transaction, { scrollIntoView: true });

  
  requestAnimationFrame(() => {
    editorView?.focus();
  });
};

const triggerAction = async (action: "cut" | "copy" | "paste" | "selectAll" | "undo" | "redo") => {
    if (!editorView) return;

    switch (action) {
      case "undo":
        undo(editorView);
        break;
      case "redo":
        redo(editorView);
        break;
      case "selectAll":
        selectAll(editorView);
        break;
      case "cut": {
        const selection = editorView.state.sliceDoc(
          editorView.state.selection.main.from,
          editorView.state.selection.main.to
        );
        if (selection) {
          await navigator.clipboard.writeText(selection);
          editorView.dispatch(editorView.state.replaceSelection(""));
        }
        break;
      }
      case "copy": {
        const selection = editorView.state.sliceDoc(
          editorView.state.selection.main.from,
          editorView.state.selection.main.to
        );
        if (selection) {
          await navigator.clipboard.writeText(selection);
        }
        break;
      }
      case "paste": {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
             editorView.dispatch(editorView.state.replaceSelection(text));
          }
        } catch (err) {
          console.error("Failed to read clipboard", err);
        }
        break;
      }
    }
    
    
    
    editorView.focus();
};

defineExpose({
  insertText,
  triggerAction,
});
</script>

<template>
  <div class="obsidian-editor" ref="editorRef"></div>
</template>

<style>
.obsidian-editor {
  height: 100%;
  width: 100%;
  overflow: hidden;  
}

 
.cm-editor {
  height: 100%;
}

.cm-scroller {
  overflow: auto;
}

.cm-pending-change {
  background-color: rgba(76, 175, 80, 0.2);  
  border-left: 2px solid #4caf50;
}

 
.cm-md-mark {
  background-color: rgba(255, 235, 59, 0.15);
  color: #ffd700; 
  border-radius: 2px;
  padding: 0 2px;
}

.cm-md-footnote {
  vertical-align: super;
  font-size: 0.8em;
  color: #888;
}

.cm-md-def-colon {
  font-weight: bold;
  color: var(--accent-color, #a882ff); 
  margin-right: 0.5em;
}

.cm-md-def-content {
  color: var(--editor-text, #dcddde);
}

.cm-formatting-mark, .cm-formatting-math {
  color: #555; 
  font-size: 0.85em;
}

.cm-math-content {
  color: var(--accent-color, #a882ff);
}

</style>
