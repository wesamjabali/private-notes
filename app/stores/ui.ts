import { defineStore } from "pinia";
import { ref } from "vue";

export const useUIStore = defineStore("ui", () => {
  
  const isLoading = ref(false);
  const isSaving = ref(false);
  
  
  const error = ref<string | null>(null);

  
  const confirmDialog = ref<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    destructive: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    destructive: false,
    resolve: null,
  });

  const openConfirmDialog = (
    title: string,
    message: string,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmDialog.value = {
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        destructive,
        resolve,
      };
    });
  };

  const closeConfirmDialog = (result: boolean) => {
    if (confirmDialog.value.resolve) {
      confirmDialog.value.resolve(result);
    }
    confirmDialog.value.isOpen = false;
    confirmDialog.value.resolve = null;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    isLoading,
    isSaving,
    error,
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
    clearError,
  };
});
