import { onClickOutside } from "@vueuse/core";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

export function useDropdown() {
  const isOpen = ref(false);
  const triggerRef = ref<HTMLElement | null>(null);
  const menuRef = ref<HTMLElement | null>(null);
  const menuStyle = ref<{ top: string; left: string; maxHeight?: string } | null>(null);

  
  const dropdownId = Math.random().toString(36).substring(2, 9);

  const toggle = () => {
    if (!isOpen.value) {
      window.dispatchEvent(new CustomEvent("dropdown-open", { detail: dropdownId }));
    }
    isOpen.value = !isOpen.value;
  };

  const close = () => {
    isOpen.value = false;
  };

  const handleOtherDropdownOpen = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail !== dropdownId && isOpen.value) {
      close();
    }
  };

  onMounted(() => {
      window.addEventListener("dropdown-open", handleOtherDropdownOpen);
  });

  onUnmounted(() => {
      window.removeEventListener("dropdown-open", handleOtherDropdownOpen);
  });

  
  onClickOutside(
    menuRef,
    (event) => {
      
      const triggerVal = triggerRef.value as any;
      const triggerEl = triggerVal?.$el instanceof Element ? triggerVal.$el : (triggerVal instanceof Element ? triggerVal : null);
      
      if (triggerEl && triggerEl.contains(event.target as Node)) {
        return;
      }
      close();
    },
    { ignore: [triggerRef] }
  );

  
  const updatePosition = async () => {
    if (!isOpen.value || !triggerRef.value || !menuRef.value) return;

    await nextTick();

    
    const triggerComponent = triggerRef.value as any;
    const triggerEl = triggerComponent.$el instanceof Element ? triggerComponent.$el : (triggerComponent instanceof Element ? triggerComponent : null);
    
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menuRef.value.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    
    let top = triggerRect.bottom + 8; 
    let left = triggerRect.left;
    let maxHeight = undefined;

    
    const spaceBelow = viewportHeight - triggerRect.bottom - 20; 
    const spaceAbove = triggerRect.top - 20;

    if (menuRect.height > spaceBelow && spaceAbove > spaceBelow) {
        
        top = triggerRect.top - menuRect.height - 8;
        if (menuRect.height > spaceAbove) {
            maxHeight = `${spaceAbove}px`;
            top = triggerRect.top - spaceAbove - 8; 
        }
    } else if (menuRect.height > spaceBelow) {
        
         maxHeight = `${spaceBelow}px`;
    }

    
    const viewportWidth = window.innerWidth;
    if (left + menuRect.width > viewportWidth - 20) {
        left = viewportWidth - menuRect.width - 20;
    }
     if (left < 20) {
        left = 20;
    }

    menuStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      maxHeight,
    };
  };

  watch([isOpen, triggerRef, menuRef], () => {
    updatePosition();
  });

  return {
    isOpen,
    triggerRef,
    menuRef,
    menuStyle,
    toggle,
    close,
  };
}
