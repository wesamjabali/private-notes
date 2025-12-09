<script setup lang="ts">
import { useGitHubStore, type Repo } from '~/stores/github'

const store = useGitHubStore()
const router = useRouter()
const route = useRoute()

const tokenInput = ref('')
const errorMsg = ref('')

onMounted(async () => {
  // Check for token in URL (from OAuth callback)
  const queryToken = route.query.token as string
  if (queryToken) {
    try {
      await store.login(queryToken)
      // Clear token from URL
      router.replace({ query: { ...route.query, token: undefined } })
    } catch (e) {
      console.error('Failed to login with token', e)
    }
  }

  await store.init()
  if (store.token) {
    await store.fetchRepos()
  }
})

const handleLogin = async () => {
  if (!tokenInput.value) return
  try {
    await store.login(tokenInput.value)
  } catch (e) {
    // Error handled in store, but we can set local msg if needed
  }
}

const loginWithGitHub = () => {
  window.location.href = '/api/auth/github'
}

const selectRepo = (repo: Repo) => {
  store.selectRepo(repo)
  router.push(`/repo/${repo.full_name}/${repo.default_branch}/README.md`) // Default to README or root? 
  // Maybe just /repo/owner/repo/ and handle 'no file selected' state?
  // Let's redirect to a default file if possible, or just the root path and handle it there.
  // Actually, let's route to .../README.md if exists is risky without checking.
  // Let's route to root.
  router.push(`/repo/${repo.full_name}/`)
}
</script>

<template>
  <div class="container">
    <div v-if="!store.token" class="login-screen flex-center">
      <div class="glass-panel login-card">
        <h1 class="text-gradient">Private Notes</h1>
        <p class="subtitle">Secure, Git-based Markdown Editor</p>
        
        <div class="input-group">
          <label>GitHub Personal Access Token</label>
          <input 
            type="password" 
            v-model="tokenInput" 
            placeholder="github_pat_..."
            class="input-field"
            @keyup.enter="handleLogin"
          >
          <p class="hint">Requires <code>repo</code> scope.</p>
        </div>
        
        <button class="btn-primary full-width" @click="handleLogin" :disabled="store.isLoading">
          {{ store.isLoading ? 'Authenticating...' : 'Enter' }}
        </button>
        
        <div class="divider">
          <span>OR</span>
        </div>

        <button class="btn-secondary full-width" @click="loginWithGitHub" :disabled="store.isLoading">
          <svg height="20" viewBox="0 0 16 16" version="1.1" width="20" aria-hidden="true" style="fill: currentColor; margin-right: 8px;">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          Login with GitHub
        </button>
        
        <p v-if="store.error" class="error">{{ store.error }}</p>
      </div>
    </div>

    <div v-else class="dashboard">
      <header class="dash-header">
        <div class="user-info flex-center">
          <img :src="store.user?.avatar_url" class="avatar" />
          <span>{{ store.user?.login }}</span>
        </div>
        <button @click="store.logout()" class="btn-text">Logout</button>
      </header>

      <main class="repo-list-container">
        <h2>Select a Repository</h2>
        <div v-if="store.isLoading" class="loading">Loading repositories...</div>
        
        <div class="repo-grid">
          <div 
            v-for="repo in store.repos" 
            :key="repo.id"
            class="repo-card glass-panel"
            @click="selectRepo(repo)"
          >
            <h3>{{ repo.name }}</h3>
            <p>{{ repo.description || 'No description' }}</p>
            <span class="updated">Updated {{ new Date(repo.updated_at).toLocaleDateString() }}</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  min-height: 100vh;
  padding: 2rem;
}

.login-screen {
  min-height: 80vh;
}

.login-card {
  padding: 3rem;
  width: 100%;
  max-width: 450px;
  text-align: center;
  
  h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .subtitle { color: var(--text-secondary); margin-bottom: 2.5rem; }
}

.input-group {
  text-align: left;
  margin-bottom: 2rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
}

.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--bg-dark-400);
  background: var(--bg-dark-100);
  color: white;
  font-size: 1rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  
  code { background: var(--bg-dark-300); padding: 0.1rem 0.3rem; border-radius: 4px; }
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  
  &:disabled { opacity: 0.6; }
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-muted);
  
  &::before, &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--bg-dark-300);
  }
  
  span {
    padding: 0 10px;
    font-size: 0.8rem;
    font-weight: 500;
  }
}

.btn-secondary {
  width: 100%;
  padding: 1rem;
  background: var(--bg-dark-200);
  color: white;
  border: 1px solid var(--bg-dark-300);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  
  &:hover {
    background: var(--bg-dark-300);
  }
  
  &:disabled { opacity: 0.6; }
}

.error {
  color: var(--color-accent);
  margin-top: 1rem;
}

/* Dashboard */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin-right: 0.75rem;
  }
  
  .btn-text {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    &:hover { color: white; }
  }
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.repo-card {
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary);
  }
  
  h3 { margin-bottom: 0.5rem; color: var(--color-primary); }
  p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.4; }
  .updated { font-size: 0.8rem; color: var(--text-muted); }
}
</style>
