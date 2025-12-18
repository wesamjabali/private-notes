<template>
  <div class="editor-skeleton">
    <div class="skeleton-toolbar">
      <div class="skeleton-toolbar-left">
        <div class="sk-btn"></div>
        <div class="sk-path"></div>
      </div>
      <div class="skeleton-toolbar-right">
        <div class="sk-action"></div>
      </div>
    </div>
    
    <div class="skeleton-content">
      <div class="sk-line h1"></div>
      <div class="sk-line text w-full"></div>
      <div class="sk-line text w-80"></div>
      <div class="sk-line text w-90"></div>
      <div class="sk-line text w-60"></div>
      <br />
      <div class="sk-line h2"></div>
      <div class="sk-line text w-full"></div>
      <div class="sk-line text w-75"></div>
      <div class="sk-line image"></div>
    </div>
  </div>
</template>

<style scoped>
.editor-skeleton {
  width: 100%;
  height: 100%;
  background: var(--editor-bg, #1e1e1e);
  display: flex;
  flex-direction: column;
}

 
.skeleton-toolbar {
  height: 60px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
}

.skeleton-toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.skeleton-toolbar-right {
  display: flex;
  align-items: center;
}

.sk-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--bg-dark-300);
  animation: pulse 1.5s infinite ease-in-out;
}

.sk-path {
  width: 200px;
  height: 20px;
  border-radius: 4px;
  background: var(--bg-dark-300);
  animation: pulse 1.5s infinite ease-in-out;
}

.sk-action {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: var(--bg-dark-300);
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-content {
  padding: 3rem;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sk-line {
  background: var(--bg-dark-300);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

.h1 { height: 40px; width: 60%; margin-bottom: 1rem; }
.h2 { height: 32px; width: 40%; margin-top: 1rem; }
.text { height: 16px; }
.image { height: 200px; width: 100%; border-radius: 8px; margin-top: 1rem; }

.w-full { width: 100%; }
.w-90 { width: 90%; }
.w-80 { width: 80%; }
.w-75 { width: 75%; }
.w-60 { width: 60%; }

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}
</style>
