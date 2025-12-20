<script setup lang="ts">
import { LogOut, User } from "lucide-vue-next";
import { useGitStore, type GitProviderName, type Repo } from "~/stores/git";
import { useUIStore } from "~/stores/ui";

const store = useGitStore();
const ui = useUIStore();
const router = useRouter();
const route = useRoute();

const tokenInput = ref("");
const baseUrlInput = ref("");
const selectedProvider = ref<GitProviderName>("github");
const errorMsg = ref("");
const showAdvanced = ref(false);
const searchQuery = ref("");

const filteredRepos = computed(() => {
  if (!searchQuery.value) return store.sortedRepos;
  const query = searchQuery.value.toLowerCase();
  return store.sortedRepos.filter(repo => 
    repo.name.toLowerCase().includes(query) || 
    (repo.description && repo.description.toLowerCase().includes(query))
  );
});

onMounted(async () => {
  
  const queryToken = route.query.token as string;
  const queryProvider = route.query.provider as GitProviderName;
  const queryBaseUrl = route.query.base_url as string;
  
  if (queryToken) {
    try {
      await store.login(queryToken, queryProvider || "github", queryBaseUrl);
      
      router.replace({ query: {} });
    } catch (e) {
      console.error("Failed to login with token", e);
    }
  }

  await store.init();
  if (store.token) {
    await store.fetchRepos();
  }

  
  if (!store.isInitialized && store.currentRepo) {
    store.isInitialized = true;
    const [owner, name] = store.currentRepo.full_name.split("/");
    if (store.currentFilePath) {
      router.push(`/repo/${owner}/${name}/${store.currentFilePath}`);
    } else {
      router.push(`/repo/${owner}/${name}/`);
    }
  } else {
    store.isInitialized = true;
  }
});

const handleLogin = async () => {
  if (!tokenInput.value) return;
  
  if (selectedProvider.value === "gitea" && !baseUrlInput.value) {
    ui.error = "Instance URL is required for Gitea/Forgejo";
    return;
  }
  try {
    const baseUrl = selectedProvider.value !== "github" ? baseUrlInput.value : undefined;
    await store.login(tokenInput.value, selectedProvider.value, baseUrl);
  } catch (e) {
    
  }
};

const loginWithGitHub = () => {
  window.location.href = "/api/auth/github";
};

const loginWithGitLab = () => {
  const baseUrl = baseUrlInput.value || undefined;
  const url = baseUrl 
    ? `/api/auth/gitlab?base_url=${encodeURIComponent(baseUrl)}`
    : "/api/auth/gitlab";
  window.location.href = url;
};

const selectRepo = (repo: Repo) => {
  store.selectRepo(repo);
  router.push(`/repo/${repo.full_name}/`);
};

const providerLabels: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  gitea: "Gitea / Forgejo",
  local: "Local"
};

const placeholders: Record<string, string> = {
  github: "github_pat_...",
  gitlab: "glpat-...",
  gitea: "Your Gitea token",
};

const scopes: Record<string, string> = {
  github: "repo",
  gitlab: "api, read_repository, write_repository",
  gitea: "repo",
};

const supportsFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
</script>

<template>
  <div class="container">
    <UiAnimatedBackground v-if="!store.token" />
    <div v-if="!store.token" class="login-screen flex-center">
      <div class="glass-panel login-card">
        <h1 class="text-gradient">Biruni</h1>
        <p class="subtitle">Secure, Git-based Markdown Editor</p>

        
        <div class="provider-switcher">
          <div 
            class="provider-glider"
            :style="{ transform: `translateX(${['github', 'gitlab', 'gitea', 'local'].indexOf(selectedProvider) * 100}%)` }"
          ></div>
          
          <button 
            class="provider-btn"
            :class="{ active: selectedProvider === 'github' }"
            @click="selectedProvider = 'github'; showAdvanced = false"
            title="GitHub"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"/></svg>
            <span class="btn-label">GitHub</span>
          </button>

          <button 
            class="provider-btn"
            :class="{ active: selectedProvider === 'gitlab' }"
            @click="selectedProvider = 'gitlab'; showAdvanced = false"
            title="GitLab"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22.65 14.39L12 22.13L1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78a2.46 2.46 0 0 0 .22-1.31a.48.48 0 0 1 .1-.34a.48.48 0 0 1 .35-.15c.34-.04.79-.04 1.13 0a.48.48 0 0 1 .35.15a.48.48 0 0 1 .1.34c.15.58.26 1.17.32 1.76l.16.5l.54 1.63l.26.83L12 19.34l7.2-5.26l.26-.83l.54-1.63l.16-.5c.06-.59.17-1.18.32-1.76a.48.48 0 0 1 .1-.34a.48.48 0 0 1 .35-.15c.34-.04.79-.04 1.13 0a.48.48 0 0 1 .35.15a.48.48 0 0 1 .1.34a2.46 2.46 0 0 0 .22 1.31l1.22 3.78a.84.84 0 0 1-.3.94Z" opacity=".5"/><path d="m22.65 14.39l-.85-2.61l-1.22-3.78l-.37-1.15A1.08 1.08 0 0 0 19.12 6a1.08 1.08 0 0 0-1 1.06l-.58 3.52l-.24 1.48l-.06.39L12 22.13l-5.24-9.68l-.06-.39l-.24-1.48L5.88 7.06A1.08 1.08 0 0 0 4.88 6a1.08 1.08 0 0 0-1.09.85l-.37 1.15l-1.22 3.78l-.85 2.61a.84.84 0 0 0 .3.94L12 22.13l10.35-7.74a.84.84 0 0 0 .3-.94Z"/></svg>
            <span class="btn-label">GitLab</span>
          </button>

          <button 
            class="provider-btn"
            :class="{ active: selectedProvider === 'gitea' }"
            @click="selectedProvider = 'gitea'; showAdvanced = false"
            title="Gitea / Forgejo"
          >
           
           <svg viewBox="0 0 212 212" width="20" height="20" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
             <g transform="translate(6,6)">
                <path d="M58 168 v-98 a50 50 0 0 1 50-50 h20" />
                <path d="M58 168 v-30 a50 50 0 0 1 50-50 h20" />
                <circle cx="142" cy="20" r="18" stroke-width="15" />
                <circle cx="142" cy="88" r="18" stroke-width="15" />
                <circle cx="58" cy="180" r="18" stroke-width="15" />
             </g>
           </svg>
           <span class="btn-label">Gitea Forgejo</span>
          </button>

           <button 
            class="provider-btn"
            :class="{ active: selectedProvider === 'local' }"
            @click="selectedProvider = 'local'; showAdvanced = false"
            title="Local"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="btn-label">Local</span>
          </button>
        </div>

        
        <div v-if="selectedProvider === 'local'" class="local-login">
            
            <div v-if="supportsFileSystemAccess" class="local-option">
                <p class="desc mb-4">
                   Use <strong>Open Folder</strong> to edit files directly on your computer.
                </p>
                <UiShinyButton 
                  text="Open Local Folder" 
                  gradient-start="var(--color-primary)"
                  gradient-end="#7c3aed"
                  @click="store.loginLocal" 
                  :disabled="ui.isLoading"
                >
                  <template #icon>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </template>
                </UiShinyButton>
            </div>

            <div v-if="supportsFileSystemAccess" class="divider">
                <span>OR</span>
            </div>

            
            <div class="local-option">
                <p class="desc mb-4">
                   Use <strong>Browser Storage</strong> to store notes privately in this browser on any device (iOS/Android compatible).
                </p>
                <UiShinyButton 
                  text="Use Browser Storage"
                  :gradient-start="supportsFileSystemAccess ? 'var(--bg-dark-300)' : 'var(--color-primary)'"
                  :gradient-end="supportsFileSystemAccess ? 'var(--bg-dark-400)' : '#7c3aed'"
                  @click="store.loginBrowser" 
                  :disabled="ui.isLoading"
                >
                  <template #icon>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </template>
                </UiShinyButton>
            </div>
        </div>

        
        <UiShinyButton
          v-if="selectedProvider === 'github'"
          text="Login with GitHub"
          gradient-start="#24292e"
          gradient-end="#0d1117"
          @click="loginWithGitHub"
          :disabled="ui.isLoading"
        >
          <template #icon>
            <svg
              height="24"
              viewBox="0 0 16 16"
              version="1.1"
              width="24"
              aria-hidden="true"
              style="fill: currentColor;"
            >
              <path
                fill-rule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              ></path>
            </svg>
          </template>
        </UiShinyButton>

        
        <UiShinyButton
          v-if="selectedProvider === 'gitlab'"
          text="Login with GitLab"
          gradient-start="#292961"
          gradient-end="#171321"
          @click="loginWithGitLab"
          :disabled="ui.isLoading"
        >
          <template #icon>
            <svg
              height="24"
              width="24"
              viewBox="0 0 380 380"
              aria-hidden="true"
            >
                <path fill="#E24329" d="M282.83,170.73 L282.83,170.73 L256.304,83.55 C253.776,75.71 242.895,75.71 240.367,83.55 L213.84,170.73 H119.16 L92.6332,83.55 C90.1053,75.71 79.2242,75.71 76.6963,83.55 L50.1696,170.73 L50.1696,170.73 C46.3526,183.34 50.5816,197.03 61.26,204.91 L166.5,280.03 L271.74,204.91 C282.418,197.03 286.647,183.34 282.83,170.73 Z"/>
                <path fill="#FC6D26" d="M166.5,280.03 L213.84,170.73 H119.16 L166.5,280.03 Z"/>
                <path fill="#FCA326" d="M166.5,280.03 L119.16,170.73 H50.1696 L166.5,280.03 Z"/>
                <path fill="#E24329" d="M50.1696,170.73 L50.1696,170.73 C46.3526,183.34 50.5816,197.03 61.26,204.91 L166.5,280.03 L50.1696,170.73 Z"/>
                <path fill="#FC6D26" d="M50.1696,170.73 H119.16 L92.6332,83.55 C90.1053,75.71 79.2242,75.71 76.6963,83.55 L50.1696,170.73 Z"/>
                <path fill="#FCA326" d="M166.5,280.03 L213.84,170.73 H282.83 L166.5,280.03 Z"/>
                <path fill="#E24329" d="M282.83,170.73 L282.83,170.73 C286.647,183.34 282.418,197.03 271.74,204.91 L166.5,280.03 L282.83,170.73 Z"/>
                <path fill="#FC6D26" d="M282.83,170.73 H213.84 L240.367,83.55 C242.895,75.71 253.776,75.71 256.304,83.55 L282.83,170.73 Z"/>
            </svg>
          </template>
        </UiShinyButton>

        
        <div v-if="selectedProvider === 'gitea'">
          <div class="input-group">
            <label>Instance URL</label>
            <UiTextInput
              type="url"
              v-model="baseUrlInput"
              placeholder="https://codeberg.org"
              class="input-field"
              required
            />
            <p class="hint">Required. Enter your Forgejo or Gitea instance URL.</p>
          </div>

          <div class="input-group">
            <label>{{ providerLabels[selectedProvider] }} Personal Access Token</label>
            <UiTextInput
              type="password"
              v-model="tokenInput"
              :placeholder="placeholders[selectedProvider]"
              class="input-field"
              @keyup.enter="handleLogin"
            />
            <p class="hint">Requires <code>{{ scopes[selectedProvider] }}</code> scope.</p>
          </div>

          <UiShinyButton
            @click="handleLogin"
            :disabled="ui.isLoading"
            gradient-start="#609926"
            gradient-end="#4e801e"
          >
            {{ ui.isLoading ? "Authenticating..." : "Enter" }}
            <template #icon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
            </template>
          </UiShinyButton>
        </div>

        
        <div v-if="['github', 'gitlab'].includes(selectedProvider)" class="advanced-section">
          <button 
            class="advanced-toggle"
            @click="showAdvanced = !showAdvanced"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
              :class="{ rotated: showAdvanced }"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            Advanced Options
          </button>

          <transition name="slide-fade">
            <div v-if="showAdvanced" class="advanced-content">
              
              <div v-if="selectedProvider === 'gitlab'" class="input-group">
                <label>Instance URL (optional)</label>
                <UiTextInput
                  type="url"
                  v-model="baseUrlInput"
                  placeholder="https://gitlab.example.com"
                  class="input-field"
                />
                <p class="hint">Leave empty for gitlab.com.</p>
              </div>

              <div class="input-group">
                <label>{{ providerLabels[selectedProvider] }} Personal Access Token</label>
                <UiTextInput
                  type="password"
                  v-model="tokenInput"
                  :placeholder="placeholders[selectedProvider]"
                  class="input-field"
                  @keyup.enter="handleLogin"
                />
                <p class="hint">Requires <code>{{ scopes[selectedProvider] }}</code> scope.</p>
              </div>

              <button
                class="btn-secondary full-width"
                @click="handleLogin"
                :disabled="ui.isLoading"
              >
                {{ ui.isLoading ? "Authenticating..." : "Login with Token" }}
              </button>
            </div>
          </transition>
        </div>

        <p v-if="ui.error" class="error">{{ ui.error }}</p>
      </div>
    </div>

    <div v-else class="dashboard-page">
      <UiAnimatedBackground />
      
      <div class="dashboard-container">
        <div class="glass-panel dashboard-card">
          <div class="dashboard-header">
            <h1>Repositories</h1>
            <div class="header-actions">
               <div class="user-info">
                <img v-if="store.user?.avatar_url" :src="store.user?.avatar_url" class="avatar" />
                <div v-else class="avatar-placeholder">
                  <User :size="18" />
                </div>
                
              </div>
              <button @click="store.logout()" class="btn-logout" title="Logout">
                <LogOut :size="20" />
              </button>
            </div>
          </div>

          <div class="dashboard-scroll-area">
             <div class="search-container">
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search repositories..." 
                class="search-input"
              >
            </div>

            <div class="repo-grid">
              <div
                v-for="repo in filteredRepos"
                :key="repo.id"
                class="repo-card glass-panel"
                @click="selectRepo(repo)"
              >
                <div class="card-header">
                  <h3>{{ repo.name }}</h3>
                  <button
                    class="btn-star"
                    @click.stop="store.toggleFavorite(repo.full_name)"
                  >
                    <svg
                      v-if="store.favorites.includes(repo.full_name)"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="star-filled"
                    >
                      <polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                      ></polygon>
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="star-outline"
                    >
                      <polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                      ></polygon>
                    </svg>
                  </button>
                </div>
                <p>{{ repo.description || "No description" }}</p>
                <span class="updated"
                  >Updated
                  {{ new Date(repo.updated_at).toLocaleDateString() }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
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

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  .subtitle {
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }
}

.provider-switcher {
  position: relative;
  display: flex;
  background: var(--bg-dark-200);
  border-radius: var(--radius-lg);
  padding: 0.35rem;
  margin-bottom: 2rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--bg-dark-300);
}

.provider-glider {
  position: absolute;
  top: 0.35rem;
  left: 0.35rem;
  width: calc(25% - 0.35rem * 0.5);  
  height: calc(100% - 0.7rem);
  background: linear-gradient(135deg, var(--color-primary), #7c3aed);
  border-radius: var(--radius-md);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  z-index: 1;
}

.provider-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.75rem 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  z-index: 2;
  transition: color 0.2s ease;
  border-radius: var(--radius-md);

  svg {
    opacity: 0.7;
    transition: opacity 0.2s, transform 0.2s;
  }

  .btn-label {
    font-size: 0.75rem;
    font-weight: 600;
  }

  &:hover:not(.active) {
    color: var(--text-primary);
    
    svg {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  &.active {
    color: white;

    svg {
      opacity: 1;
      transform: scale(1.1);
    }
  }
}


.input-group {
  text-align: left;
  margin-bottom: 1.5rem;

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
  border: 1px solid var(--bg-dark-400) !important;
  background: var(--bg-dark-100) !important;
  color: white;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary) !important;
  }
}

.hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.5rem;

  code {
    background: var(--bg-dark-300);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-primary), #7c3aed);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.github-btn {
  background: linear-gradient(135deg, #24292e, #0d1117);
  
  &:hover:not(:disabled) {
    box-shadow: 0 8px 20px rgba(36, 41, 46, 0.4);
  }
}

.gitlab-btn {
  background: linear-gradient(135deg, #fc6d26, #e24329);
  
  &:hover:not(:disabled) {
    box-shadow: 0 8px 20px rgba(252, 109, 38, 0.4);
  }
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-muted);

  &::before,
  &::after {
    content: "";
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
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: var(--bg-dark-300);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.advanced-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--bg-dark-300);
}

.advanced-toggle {
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--bg-dark-300);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  svg {
    transition: transform 0.3s ease;
    
    &.rotated {
      transform: rotate(180deg);
    }
  }

  &:hover {
    color: var(--text-primary);
    border-color: var(--color-primary);
    background: var(--bg-dark-200);
  }
}

.advanced-content {
  margin-top: 1rem;
}


.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.error {
  color: var(--color-accent);
  margin-top: 1rem;
}

 
.dashboard-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-dark-100);
  z-index: 100;
  overflow: hidden;
}

.dashboard-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  overflow-y: auto;
}

@media (min-height: 800px) {
  .dashboard-container {
     align-items: center;
  }
}
@media (max-height: 800px) {
    .dashboard-container {
        align-items: flex-start;
        padding-top: 2rem;
    }
}

.dashboard-card {
  width: 100%;
  max-width: 900px;  
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  background: hsla(240, 10%, 6%, 0.7);
  overflow: hidden;
}

.dashboard-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;

  h1 {
    font-size: 1.5rem;
    color: var(--text-primary);
    margin: 0;
  }
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--border-subtle);
  }

  .avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-dark-300);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
  }
}

.btn-logout {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
  }
}


.dashboard-scroll-area {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--bg-dark-300);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: var(--bg-dark-400); 
  }
}

.search-container {
  margin-bottom: 2rem;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 2.5rem;
  background: var(--bg-dark-100);  
  border: 1px solid var(--bg-dark-300);
  border-radius: var(--radius-lg);
  color: white;
  font-size: 1rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.repo-card {
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--bg-dark-300);
  background: rgba(255, 255, 255, 0.03);  

  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
    height: 2.7em;  
  }

  .updated {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.btn-star {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-muted);
  transition: all 0.2s;
  border-radius: 4px;

  &:hover {
    background: var(--bg-dark-300);
    color: #eab308;
  }
  
  .star-filled {
    color: #eab308;
  }
}



.mb-4 {
  margin-bottom: 1rem;
}
</style>
