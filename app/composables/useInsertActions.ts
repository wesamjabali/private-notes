import {
    Bold,
    Book,
    CheckSquare,
    Code as CodeIcon,
    Heading,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    MessageSquareQuote,
    Minus,
    Network,
    Sigma,
    Strikethrough,
    Table,
    Type
} from "lucide-vue-next";
import { type Ref, computed } from "vue";
import type ObsidianEditor from "~/components/ObsidianEditor.vue";

export function useInsertActions(
    obsidianEditorRef: Ref<InstanceType<typeof ObsidianEditor> | null>,
    showAssetPicker: Ref<boolean>
) {
    const insertCalloutType = (type: string, opts?: any) => {
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        obsidianEditorRef.value?.insertText(`> [!${type.toUpperCase()}] ${title}\n> Contents\n`, opts);
    };

    const insertHeadingLevel = (level: number, opts?: any) => {
        const hashes = "#".repeat(level);
        obsidianEditorRef.value?.insertText(`${hashes} `, opts);
    };

    

    const insertTable = (opts?: any) => {
        const table = `
| Header 1 | Header 2 |
| :--- | :--- |
| Cell 1 | Cell 2 |
`;
        obsidianEditorRef.value?.insertText(table, opts);
    };

    const insertCodeBlock = (opts?: any) => {
        const block = `
\`\`\`javascript
// console.log('Hello World');
\`\`\`
`;
        obsidianEditorRef.value?.insertText(block, opts);
    };

    const insertMermaid = (opts?: any) => {
        const block = `
\`\`\`mermaid
graph TD;
    A-->B;
\`\`\`
`;
        obsidianEditorRef.value?.insertText(block, opts);
    };

    const insertMath = (opts?: any) => {
        obsidianEditorRef.value?.insertText("$ E = mc^2 $", opts);
    };

    const insertCheckbox = (opts?: any) => {
        obsidianEditorRef.value?.insertText("- [ ] ", opts);
    };

    const insertBulletedList = (opts?: any) => {
        obsidianEditorRef.value?.insertText("- ", opts);
    };

    const insertOrderedList = (opts?: any) => {
        obsidianEditorRef.value?.insertText("1. ", opts);
    };

    const insertBlockquote = (opts?: any) => {
        obsidianEditorRef.value?.insertText("> ", opts);
    };

    const insertBold = (opts?: any) => {
        obsidianEditorRef.value?.insertText("**Bold**", opts);
    };

    const insertItalic = (opts?: any) => {
        obsidianEditorRef.value?.insertText("*Italic*", opts);
    };

    const insertStrikethrough = (opts?: any) => {
        obsidianEditorRef.value?.insertText("~~Strike~~", opts);
    };

    const insertLink = (opts?: any) => {
        obsidianEditorRef.value?.insertText("[](url)", opts);
    };

    const insertHorizontalRule = (opts?: any) => {
        obsidianEditorRef.value?.insertText("\n---\n", opts);
    };

    const insertDefinition = (opts?: any) => {
        obsidianEditorRef.value?.insertText("\nTerm\n: Definition\n", opts);
    };

    const insertFootnote = (opts?: any) => {
        obsidianEditorRef.value?.insertText("[^1]", opts);
    };

    const insertItems = computed(() => [
        {
            label: "Asset / Image",
            icon: ImageIcon,
            action: (opts?: any) => {
                showAssetPicker.value = true;
            },
        },
        {
            label: "Callout",
            icon: MessageSquareQuote,
            children: [
                { label: "Note", action: (opts?: any) => insertCalloutType("NOTE", opts) },
                { label: "Tip", action: (opts?: any) => insertCalloutType("TIP", opts) },
                { label: "Important", action: (opts?: any) => insertCalloutType("IMPORTANT", opts) },
                { label: "Warning", action: (opts?: any) => insertCalloutType("WARNING", opts) },
                { label: "Caution", action: (opts?: any) => insertCalloutType("CAUTION", opts) },
            ]
        },
        {
            label: "Heading",
            icon: Heading,
            children: [
                { label: "Heading 1", action: (opts?: any) => insertHeadingLevel(1, opts) },
                { label: "Heading 2", action: (opts?: any) => insertHeadingLevel(2, opts) },
                { label: "Heading 3", action: (opts?: any) => insertHeadingLevel(3, opts) },
                { label: "Heading 4", action: (opts?: any) => insertHeadingLevel(4, opts) },
                { label: "Heading 5", action: (opts?: any) => insertHeadingLevel(5, opts) },
                { label: "Heading 6", action: (opts?: any) => insertHeadingLevel(6, opts) },
            ]
        },
        {
            label: "Table",
            icon: Table,
            action: insertTable,
        },
        {
            label: "Code Block",
            icon: CodeIcon,
            action: insertCodeBlock,
        },
        {
            label: "Mermaid Diagram",
            icon: Network,
            action: insertMermaid,
        },
        {
            label: "Math Block",
            icon: Sigma,
            action: insertMath,
        },
        {
            label: "Checklist",
            icon: CheckSquare,
            action: insertCheckbox,
        },
        {
            label: "Bulleted List",
            icon: List,
            action: insertBulletedList,
        },
        {
            label: "Ordered List",
            icon: ListOrdered,
            action: insertOrderedList,
        },
        {
            label: "Blockquote",
            icon: MessageSquareQuote,
            action: insertBlockquote,
        },
        {
            label: "Bold",
            icon: Bold,
            action: insertBold,
        },
        {
            label: "Italic",
            icon: Italic,
            action: insertItalic,
        },
        {
            label: "Strikethrough",
            icon: Strikethrough,
            action: insertStrikethrough,
        },
        {
            label: "Link",
            icon: LinkIcon,
            action: insertLink,
        },
        {
            label: "Horizontal Rule",
            icon: Minus,
            action: insertHorizontalRule,
        },
        {
            label: "Definition",
            icon: Book,
            action: insertDefinition,
        },
        {
            label: "Footnote",
            icon: Type,
            action: insertFootnote,
        }
    ]);

    return {
        insertItems
    };
}
