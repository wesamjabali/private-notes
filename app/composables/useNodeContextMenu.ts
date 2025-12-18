
import {
    FileText,
    Folder,
    Pencil,
    Pin,
    PinOff,
    Trash2,
    Upload
} from "lucide-vue-next";
import { useFileActions } from "~/composables/useFileActions";
import { type FileNode, useGitStore } from "~/stores/git";

export type ContextMenuAction = {
  label: string;
  icon?: any;
  action: () => void;
  danger?: boolean;
};

export type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  actions: ContextMenuAction[];
};

export const useNodeContextMenu = () => {
    const store = useGitStore();
    const uiStore = useUIStore();
    const { triggerUpload } = useFileActions();

    const contextMenu = ref<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        actions: [],
    });

    const closeContextMenu = () => {
        contextMenu.value.visible = false;
    };

    const promptRename = async (node: FileNode) => {
        const newName = prompt(`Rename ${node.name} to:`, node.name);
        if (newName && newName !== node.name) {
            try {
                const parts = node.path.split("/");
                parts.pop(); 
                const parentPath = parts.join("/");
                const newPath = parentPath ? `${parentPath}/${newName}` : newName;

                await store.renameNode(node.path, newPath, node.type);
            } catch (e: any) {
                await uiStore.openConfirmDialog("Error", e.message, "OK", "");
            }
        }
    };

    const confirmDelete = async (node: FileNode) => {
        const confirmed = await uiStore.openConfirmDialog(
            "Delete File",
            `Are you sure you want to delete ${node.name}?`,
            "Delete",
            "Cancel",
            true
        );

        if (confirmed) {
            try {
                await store.deleteNode(
                    node.path,
                    node.sha || "tree",
                    node.type
                );
            } catch (e: any) {
                await uiStore.openConfirmDialog("Error", e.message, "OK", "");
            }
        }
    };

    const handleContextMenu = (e: MouseEvent, node: FileNode, callbacks: { onExpand?: () => void } = {}, source?: string) => {
        e.preventDefault();
        e.stopPropagation();

        contextMenu.value = {
            visible: true,
            x: e.clientX,
            y: e.clientY,
            actions: [
                {
                    label: "Rename",
                    icon: Pencil,
                    action: () => promptRename(node),
                },
                {
                    label: node.type === "tree" ? "Delete Folder" : "Delete File",
                    icon: Trash2,
                    danger: true,
                    action: () => confirmDelete(node),
                },
            ],
        };

        if (node.type === "tree") {
            contextMenu.value.actions.unshift(
                {
                    label: "Set as Root",
                    icon: Pin,
                    action: () => store.setMainFolder(node.path),
                },
                {
                    label: "New Note",
                    icon: FileText,
                    action: () => {
                        store.startCreation(node.path, "blob", source);
                        callbacks.onExpand?.();
                    },
                },
                {
                    label: "New Folder",
                    icon: Folder,
                    action: () => {
                        store.startCreation(node.path, "tree", source);
                        callbacks.onExpand?.();
                    },
                },
                {
                    label: "Upload Files",
                    icon: Upload,
                    action: () => triggerUpload(node.path),
                }
            );
        }
    };

    const handleRootContextMenu = (e: MouseEvent, source?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const actions: ContextMenuAction[] = [
            {
                label: "New Note",
                icon: FileText,
                action: () => store.startCreation(null, "blob", source),
            },
            {
                label: "New Folder",
                icon: Folder,
                action: () => store.startCreation(null, "tree", source),
            },
            {
                label: "Upload Files",
                icon: Upload,
                action: () => triggerUpload(null),
            },
        ];

        if (store.mainFolder) {
            actions.unshift({
                label: "Unset Root",
                icon: PinOff,
                action: () => store.setMainFolder(null),
            });
        }

        contextMenu.value = {
            visible: true,
            x: e.clientX,
            y: e.clientY,
            actions,
        };
    };
    
    
    const handleBackgroundContextMenu = (e: MouseEvent, currentPath: string, source?: string) => {
        e.preventDefault();
        e.stopPropagation();

        contextMenu.value = {
            visible: true,
            x: e.clientX,
            y: e.clientY,
            actions: [
                {
                    label: "New Note",
                    icon: FileText,
                    action: () => store.startCreation(currentPath, "blob", source),
                },
                {
                    label: "New Folder",
                    icon: Folder,
                    action: () => store.startCreation(currentPath, "tree", source),
                },
                {
                    label: "Upload Files",
                    icon: Upload,
                    action: () => triggerUpload(currentPath),
                },
            ],
        };
    };

    return {
        contextMenu,
        closeContextMenu,
        handleContextMenu,
        handleRootContextMenu,
        handleBackgroundContextMenu
    };
};
