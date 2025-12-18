<script setup lang="ts">
import {
    Check,
    ChevronDown,
    GitBranch,
    Plus,
    Search,
} from "lucide-vue-next";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useGitStore } from "~/stores/git";

const store = useGitStore();

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const menuStyle = ref<{ top: string; left: string } | null>(null);
const searchQuery = ref("");
const isCreating = ref(false);
const newBranchName = ref("");

const filteredBranches = computed(() => {
  if (!searchQuery.value) return store.branches;
  return store.branches.filter((b) =>
    b.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const toggle = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = "";
    isCreating.value = false;
    await nextTick();
    calculatePosition();
    
    const input = menuRef.value?.querySelector("input");
    if (input) input.focus();
  }
};

const calculatePosition = () => {
  if (!triggerRef.value || !menuRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const menuRect = menuRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = triggerRect.left;
  let top = triggerRect.bottom + 8;

  
  if (left + menuRect.width > viewportWidth - 16) {
    left = viewportWidth - menuRect.width - 16;
  }
  if (left < 16) left = 16;

  
  if (top + menuRect.height > viewportHeight - 16) {
    
    if (triggerRect.top - menuRect.height - 8 > 16) {
      top = triggerRect.top - menuRect.height - 8;
    }
  }

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};

const close = () => {
  isOpen.value = false;
  menuStyle.value = null;
  searchQuery.value = "";
  isCreating.value = false;
  newBranchName.value = "";
};

const handleSwitch = async (branch: string) => {
  try {
    await store.switchBranch(branch);
    close();
  } catch (e) {
    console.error("Failed to switch branch", e);
  }
};

const handleCreate = async () => {
  if (!newBranchName.value || !newBranchName.value.trim()) return;
  
  
  const safeName = newBranchName.value.trim().replace(/\s+/g, '-');
  
  try {
    await store.createBranch(safeName);
    close();
  } catch (e) {
    console.error("Failed to create branch", e);
    
    
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && menuRef.value.contains(event.target as Node)) {
    return;
  }
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("scroll", close, true); 
  window.addEventListener("resize", close);
  
  if (store.branches.length === 0) {
    store.fetchBranches();
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("scroll", close, true);
  window.removeEventListener("resize", close);
});
</script>

<template>
  <div class="branch-switcher" ref="dropdownRef">
    <button
      ref="triggerRef"
      class="trigger-btn"
      @click.stop="toggle"
      :class="{ active: isOpen }"
      :disabled="store.isLoadingBranches"
      title="Switch Branch"
    >
      <GitBranch :size="16" class="icon" />
      <span class="branch-name">{{ store.currentBranch }}</span>
      <ChevronDown :size="14" class="chevron" :class="{ rotate: isOpen }" />
    </button>

    <Teleport to="body">
      <transition name="dropdown-fade">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="branch-dropdown-menu glass-panel"
          :style="menuStyle"
          @click.stop
        >
          
          <div class="search-box">
            <Search :size="14" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search branches..."
              class="search-input"
            />
          </div>

          
          <div class="branch-list">
            <button
              v-for="branch in filteredBranches"
              :key="branch"
              class="branch-item"
              :class="{ active: branch === store.currentBranch }"
              @click="handleSwitch(branch)"
            >
              <div class="branch-info">
                <GitBranch :size="14" class="branch-icon" />
                <span>{{ branch }}</span>
              </div>
              <Check
                v-if="branch === store.currentBranch"
                :size="14"
                class="check-icon"
              />
            </button>
            
            <div v-if="filteredBranches.length === 0 && searchQuery" class="no-results">
              No branches found.
            </div>
            
             <div v-if="filteredBranches.length === 0 && !searchQuery && store.isLoadingBranches" class="loading">
              Loading branches...
            </div>
          </div>

          
          <div class="menu-footer">
            <div v-if="isCreating" class="create-form">
               <input
                  v-model="newBranchName"
                  type="text"
                  placeholder="New branch name"
                  class="create-input"
                  autofocus
                  @keydown.enter="handleCreate"
                  @keydown.esc="isCreating = false"
                />
                <div class="create-actions">
                  <button class="icon-btn cancel" @click="isCreating = false">
                    Cancel
                  </button>
                   <button class="icon-btn confirm" @click="handleCreate" :disabled="!newBranchName">
                    Create
                  </button>
                </div>
            </div>
            <button v-else class="create-btn" @click="isCreating = true; newBranchName = searchQuery">
              <Plus :size="14" />
              <span>Create new branch...</span>
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.branch-switcher {
  position: relative;
  display: inline-block;
}

.trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  max-width: 200px;

  &:hover {
    background: var(--bg-dark-200);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--bg-dark-300);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }

  .branch-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .icon {
    flex-shrink: 0;
  }

  .chevron {
    transition: transform 0.2s;
    opacity: 0.5;
    flex-shrink: 0;
  }

  .chevron.rotate {
    transform: rotate(180deg);
  }
}
</style>

<style lang="scss">
 
.branch-dropdown-menu {
  position: fixed;
  width: 280px;
  background: var(--bg-dark-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 400px;
  animation: branchMenuIn 0.2s ease-out;
}

@keyframes branchMenuIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.branch-dropdown-menu .search-box {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-dark-200);
  
  .search-icon {
    color: var(--text-muted);
  }
  
  .search-input {
    background: transparent;
    border: none;
    color: var(--text-primary);
    width: 100%;
    font-size: 0.9rem;
    outline: none;
    
    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.branch-dropdown-menu .branch-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
}

.branch-dropdown-menu .branch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  text-align: left;
  transition: all 0.1s;
  
  &:hover:not(.active) {
    background: var(--bg-dark-400);
    color: var(--text-primary);
  }
  
  &.active {
    background: rgba(var(--primary-rgb), 0.1);
    color: var(--color-primary);
    font-weight: 500;
  }
  
  .branch-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    overflow: hidden;
    
    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .branch-icon {
      opacity: 0.7;
    }
  }
}

.branch-dropdown-menu .no-results,
.branch-dropdown-menu .loading {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.branch-dropdown-menu .menu-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 0.5rem;
  background: var(--bg-dark-200);
}

.branch-dropdown-menu .create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg-dark-400);
    color: var(--text-primary);
  }
}

.branch-dropdown-menu .create-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  .create-input {
    background: var(--bg-dark-100);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    
    &:focus {
      border-color: var(--color-primary);
    }
  }
  
  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    
    button {
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      cursor: pointer;
      border: none;
    }
    
    .cancel {
      background: transparent;
      color: var(--text-secondary);
      &:hover {
        background: var(--bg-dark-400);
      }
    }
    
    .confirm {
      background: var(--color-primary);
      color: white;
      &:hover {
        background: var(--color-primary-light);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
