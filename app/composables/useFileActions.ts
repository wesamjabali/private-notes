import { useRouter } from "vue-router";
import { useGitStore } from "~/stores/git";

export function useFileActions() {
  const store = useGitStore();
  const router = useRouter();

  
  const fileInput = ref<HTMLInputElement | null>(null);
  const uploadCallback = ref<((file: File) => void) | null>(null);

  
  const ensureInput = () => {
    if (typeof document === "undefined") return;

    let input = document.getElementById(
      "global-file-input"
    ) as HTMLInputElement;
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = "global-file-input";
      input.style.display = "none";
      document.body.appendChild(input);

      input.addEventListener("change", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0 && uploadCallback.value) {
          
          Array.from(target.files).forEach((f) => uploadCallback.value!(f));
          target.value = ""; 
        }
      });
    }
    return input;
  };

  const createFolder = async (basePath: string | null, source?: string) => {
    console.log(
      "[useFileActions] createFolder called with basePath:",
      basePath
    );
    store.startCreation(basePath || null, "tree", source);
  };

  const createNote = async (basePath: string | null, source?: string) => {
    console.log("[useFileActions] createNote called with basePath:", basePath);
    store.startCreation(basePath || null, "blob", source);
  };

  const triggerUpload = (basePath: string | null) => {
    const input = ensureInput();
    if (!input) return;

    uploadCallback.value = async (file: File) => {
      const path = basePath ? `${basePath}/${file.name}` : file.name;
      await store.uploadFile(path, file);
    };
    input.click();
  };

  const handleDrop = async (files: File[], basePath: string | null) => {
    for (const file of files) {
      const path = basePath ? `${basePath}/${file.name}` : file.name;
      await store.uploadFile(path, file);
    }
  };

  const deleteCurrentFile = async () => {
    if (!store.currentFilePath || !store.currentFileSha) return;

    const pathToDelete = store.currentFilePath;
    const shaToDelete = store.currentFileSha;

    const confirmed = await store.openConfirmDialog(
      "Delete File",
      `Are you sure you want to delete ${pathToDelete}?`,
      "Delete",
      "Cancel",
      true
    );
    if (!confirmed) return;

    try {
      await store.deleteFile(pathToDelete, shaToDelete);

      
      const parts = pathToDelete.split("/");
      parts.pop();
      const parentPath = parts.join("/");

      
      if (store.currentRepo) {
        const owner = store.currentRepo.full_name.split("/")[0];
        const repo = store.currentRepo.name;
        const target = parentPath
          ? `/repo/${owner}/${repo}/${parentPath}`
          : `/repo/${owner}/${repo}/`;

        
        router.replace(target);
      }
    } catch (e) {
      console.error(e);
      await store.openConfirmDialog("Error", "Failed to delete file", "OK", "");
    }
  };

  return {
    createFolder,
    createNote,
    triggerUpload,
    handleDrop,
    deleteCurrentFile,
  };
}
