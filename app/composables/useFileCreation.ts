import { onClickOutside } from "@vueuse/core";
import { nextTick, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useGitStore } from "~/stores/git";

interface UseFileCreationOptions {
  enableClickOutside?: boolean;
}

export function useFileCreation(
  containerRef: Ref<HTMLElement | null | HTMLElement[]>,
  inputRef: Ref<HTMLInputElement | null | HTMLInputElement[]>,
  options: UseFileCreationOptions = { enableClickOutside: true }
) {
  const store = useGitStore();
  const router = useRouter();
  const creationName = ref("");

  
  watch(
    () => store.pendingCreation,
    async (val) => {
      if (val) {
        creationName.value = "";
        await nextTick();
        
        const inputComp = Array.isArray(inputRef.value)
          ? inputRef.value[0]
          : inputRef.value;
            
        
        if (inputComp) {
            if (inputComp instanceof HTMLInputElement) {
                inputComp.focus();
            } else if (typeof (inputComp as any).focus === 'function') {
                (inputComp as any).focus();
            }
        }
      }
    },
    { deep: true }
  );

  const confirmCreation = async () => {
    if (creationName.value) {
      const result = await store.confirmCreation(creationName.value);
      
      
      if (result?.path && store.currentRepo) {
        const [owner, repo] = store.currentRepo.full_name.split("/");
        router.push(`/repo/${owner}/${repo}/${result.path}`);
      }
    } else {
      store.cancelCreation();
    }
  };

  const cancelCreation = () => {
    store.cancelCreation();
  };

  if (options.enableClickOutside) {
    onClickOutside(containerRef as Ref<HTMLElement>, () => {
      if (store.pendingCreation) {
         
         const container = Array.isArray(containerRef.value) ? containerRef.value[0] : containerRef.value;
         if (container) {
             cancelCreation();
         }
      }
    });
  }

  return {
    creationName,
    confirmCreation,
    cancelCreation,
  };
}
