<script setup lang="ts">
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
} from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useGitHubStore } from "~/stores/github";
import { livePreviewExtension } from "~/utils/LivePreviewExtension";
import { obsidianStyles } from "~/utils/ObsidianTheme";
import { tableEditingExtension } from "~/utils/TableEditingExtension";

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

const store = useGitHubStore();

// Effect to add/remove highlighting
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

// Minimal setup similar to basicSetup but tailored
const extensions = [
  history(),
  highlightSelectionMatches(),
  closeBrackets(),
  autocompletion(),
  highlightField,
  keymap.of([
    ...historyKeymap,
    ...searchKeymap,
    ...lintKeymap,
    ...completionKeymap,
    ...closeBracketsKeymap,
    indentWithTab,
    // Custom keymap for Save commonly used in editors
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
  }),
  obsidianStyles,
  livePreviewExtension,
  tableEditingExtension,
  EditorView.domEventHandlers({
    drop(event, view) {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      event.preventDefault();

      // Handle uploads
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;
        // Allow images and videos
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
          continue;

        // Generate path
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:.]/g, "")
          .replace("T", "")
          .split(".")[0];
        const ext = file.name.split(".").pop();
        const filename = `${timestamp}.${ext}`;

        // Determine current folder
        const currentPath = store.currentFilePath || "";
        const currentDir = currentPath.split("/").slice(0, -1).join("/");
        const attachmentDir = currentDir
          ? `${currentDir}/attachments`
          : "attachments";
        const fullPath = `${attachmentDir}/${filename}`;

        console.log(
          `[ObsidianEditor] Uploading drop: ${fullPath} (${file.type})`
        );

        // Upload
        store
          .uploadFile(fullPath, file)
          .then((result) => {
            if (!result) {
              console.error(
                "[ObsidianEditor] Upload failed: No result returned (repo not selected?)"
              );
              return;
            }

            // Insert link
            const insertText = `![](${fullPath})`;

            const transaction = view.state.update({
              changes: { from: pos, insert: insertText },
            });
            view.dispatch(transaction);
          })
          .catch((err) => {
            console.error(
              "[ObsidianEditor] Failed to upload dropped file",
              err
            );
          });
      }

      return true;
    },
  }),
  EditorView.updateListener.of((update) => {
    if (update.docChanged && !props.pendingContent) {
      emit("update:modelValue", update.state.doc.toString());
    }
  }),
];

const router = useRouter();
// We need to define the handler outside onMounted to use 'router' which is captured from setup scope
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

  return { from: start, to: endMod + 1 }; // Range in modified text
}

// Watch for external content changes (e.g. loading a new file)
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
      // Apply pending content
      const currentDoc = editorView.state.doc.toString();
      editorView.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newPending },
      });

      // Calculate diff and highlight
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
      // Revert to modelValue (or keep if it was accepted and modelValue updated)
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
</script>

<template>
  <div class="obsidian-editor" ref="editorRef"></div>
</template>

<style>
.obsidian-editor {
  height: 100%;
  width: 100%;
  overflow: hidden; /* Scroll handled by CodeMirror */
}

/* Ensure CodeMirror takes full height */
.cm-editor {
  height: 100%;
}

.cm-scroller {
  overflow: auto;
}

.cm-pending-change {
  background-color: rgba(76, 175, 80, 0.2); /* Greenish highlight */
  border-left: 2px solid #4caf50;
}
</style>
