<template>
  <div class="sidebar-skeleton">
    <div class="skeleton-header">
      <div class="skeleton-title"></div>
      <div class="skeleton-branch"></div>
    </div>
    
    <div class="skeleton-actions">
      <div class="skeleton-search"></div>
      <div class="skeleton-btns"></div>
    </div>
    
    <div class="skeleton-tree">
      <div v-for="i in 15" :key="i" class="skeleton-item" :style="{ '--delay': `${i * 0.05}s`, '--width': `${Math.random() * 40 + 40}%` }">
        <div class="skeleton-icon"></div>
        <div class="skeleton-text"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-skeleton {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-header {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.skeleton-title {
  height: 24px;
  width: 60%;
  background: var(--bg-dark-300);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-branch {
  height: 30px;
  width: 100%;
  background: var(--bg-dark-300);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
  animation-delay: 0.1s;
}

.skeleton-actions {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.skeleton-search {
  height: 32px;
  width: 32px;
  background: var(--bg-dark-300);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-btns {
  height: 32px;
  width: 100px;
  background: var(--bg-dark-300);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-tree {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  animation: fadeIn 0.3s ease-out forwards;
  opacity: 0;
  animation-delay: var(--delay);
}

.skeleton-icon {
  width: 16px;
  height: 16px;
  background: var(--bg-dark-300);
  border-radius: 3px;
  flex-shrink: 0;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-text {
  height: 16px;
  width: var(--width);
  background: var(--bg-dark-300);
  border-radius: 3px;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}

@keyframes fadeIn {
  to { opacity: 1; }
}
</style>
