
import { useStorage, useStorageAsync } from "@vueuse/core";
import { del, get, set } from "idb-keyval";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { FileNode, GitProvider, GitProviderName, Repo, Template, User } from "~/types/git";
import { getMimeType, isBinary } from "~/utils/file-types";
import { BrowserProvider } from "~/utils/providers/browser";
import { GiteaProvider } from "~/utils/providers/gitea";
import { GitHubProvider } from "~/utils/providers/github";
import { GitLabProvider } from "~/utils/providers/gitlab";
import { LocalProvider } from "~/utils/providers/local";
import {
  buildTree,
  insertNodeIntoTree,
  reconcileOptimisticTree,
} from "~/utils/tree-utils";
import { useSettingsStore } from "./settings";
import { useUIStore } from "./ui";

export type { FileNode, GitProviderName, Repo, Template, User };

export const useGitStore = defineStore("git", () => {
  
  const token = useStorage("git_token", "");
  const providerName = useStorage<GitProviderName>("git_provider", "github");
  const customBaseUrl = useStorage("git_base_url", ""); 
  
  const lastRepoFullName = useStorage("git_last_repo", "");
  const settings = useSettingsStore();
  const favorites = useStorage<string[]>("git_favorites", []);
  
  const user = ref<User | null>(null);
  const provider = ref<GitProvider | null>(null);

  const repos = ref<Repo[]>([]);
  const currentRepo = ref<Repo | null>(null);
  const currentBranch = ref<string>("main");
  const branches = ref<string[]>([]);
  const isLoadingBranches = ref(false);
  const isSwitchingRepo = ref(false);

  const fileTree = ref<FileNode[]>([]);
  const mainFolder = useStorage<string | null>("git_main_folder", null);
  const searchQuery = ref("");

  
  const idbStorage = {
    getItem: async (key: string) => await get(key),
    setItem: async (key: string, value: string) => await set(key, value),
    removeItem: async (key: string) => await del(key),
  };

  
  const unsavedChanges = useStorageAsync<
    Record<string, { content: string; timestamp: number; sha: string | null }>
  >("git_unsaved_changes", {}, idbStorage);

  
  const optimisticNodes = ref<Map<string, FileNode>>(new Map());
  const recentlyDeletedPaths = ref<Map<string, number>>(new Map());

  
  const visibleFileTree = computed(() => {
    const filterRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        const isDotfile = node.name.startsWith(".");
        if (isDotfile && !settings.showDotfiles) return acc;

        if (node.children) {
          const filteredChildren = filterRecursive(node.children);
          if (filteredChildren.length > 0 || node.type === "tree") {
            acc.push({ ...node, children: filteredChildren });
          }
        } else {
            
            if (isDotfile) {
                
                acc.push(node);
            } else {
                 acc.push(node);
            }
        }
        return acc;
      }, []);
    };

    return filterRecursive(fileTree.value);
  });

  const filteredFileTree = computed(() => {
    const sourceTree = visibleFileTree.value;
    let roots = sourceTree;

    if (mainFolder.value) {
      let targetNode: FileNode | null = null;

      const findNode = (nodes: FileNode[]) => {
        for (const node of nodes) {
          if (node.path === mainFolder.value) {
            targetNode = node;
            return;
          }
          if (node.children) findNode(node.children);
          if (targetNode) return;
        }
      };

      if (sourceTree) findNode(sourceTree);

      if (targetNode && (targetNode as FileNode).children) {
        roots = (targetNode as FileNode).children ?? [];
      } else {
        roots = [];
      }
    }

    if (!searchQuery.value) return roots;

    const query = searchQuery.value.toLowerCase();
    const filterByQuery = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        const matchesRequest = node.name.toLowerCase().includes(query);
        
        if (node.type === "tree" && node.children) {
          const filteredChildren = filterByQuery(node.children);
          if (matchesRequest || filteredChildren.length > 0) {
             acc.push({ ...node, children: filteredChildren });
          }
        } else {
          if (matchesRequest) {
            acc.push(node);
          }
        }
        return acc;
      }, []);
    };

    return filterByQuery(roots);
  });

  const currentFilePath = useStorage<string | null>("git_current_file_path", null);
  const currentFileContent = ref<string | null>(null);
  const originalFileContent = ref<string>("");
  const currentFileSha = ref<string | null>(null);
  const isDirty = ref(false);

  const isCurrentFileBinary = computed(() => {
    if (!currentFilePath.value) return false;
    return isBinary(currentFilePath.value);
  });
  
  const hasUnsavedChanges = computed(() => Object.keys(unsavedChanges.value).length > 0);

  
  const ui = useUIStore();
  
  const isInitialized = ref(false);
  

  
  const pendingCreation = ref<{
    parentPath: string | null;
    type: "blob" | "tree";
  } | null>(null);

  const pendingTemplateSelection = ref<{
    parentPath: string | null;
    filename: string;
    templates: any[];
  } | null>(null);

  

  
  const initProvider = async (newToken: string, type: GitProviderName, baseUrl?: string) => {
      if (type === "github") {
          provider.value = new GitHubProvider(newToken);
      } else if (type === "gitlab") {
          const config = useRuntimeConfig();
          const url = baseUrl || config.public.gitlabBaseUrl || "https://gitlab.com";
          provider.value = new GitLabProvider(newToken, url);
      } else if (type === "gitea") {
          if (!baseUrl) throw new Error("Base URL required for Gitea");
          provider.value = new GiteaProvider(newToken, baseUrl);
      } else if (type === "local") {
         const handle = await get("git_local_handle");
         if (handle) {
             try {
                
                provider.value = new LocalProvider(handle);
             } catch (e) {
                 console.warn("Failed to restore local handle", e);
             }
         }
      } else if (type === "browser") {
         provider.value = new BrowserProvider();
      }
  };

  const init = async () => {
    const config = useRuntimeConfig();
    const envPat = config.public.gitPat;
    
    if (!token.value && envPat) {
       console.log("Using GITHUB_PAT from environment");
       try {
         await login(envPat, "github");
         return; 
       } catch (e) {
         console.error("Failed to login with GITHUB_PAT", e);
       }
    }

    if (token.value) {
      try {
        await initProvider(token.value, providerName.value, customBaseUrl.value);
        if (!provider.value) return;

        user.value = await provider.value.getAuthenticatedUser();
        await fetchRepos();

        if (lastRepoFullName.value && repos.value.length > 0) {
          const repo = repos.value.find(
            (r) => r.full_name === lastRepoFullName.value
          );
          if (repo) await selectRepo(repo);
        }
      } catch (e) {
        console.error("Invalid token or provider error", e);
        logout();
      }
    }
    isInitialized.value = true;
  };

  const login = async (newToken: string, type: GitProviderName = "github", baseUrl?: string) => {
    ui.isLoading = true;
    ui.error = null;
    try {
      await initProvider(newToken, type, baseUrl);
      if (!provider.value) throw new Error("Failed to initialize provider");

      const u = await provider.value.getAuthenticatedUser();
      token.value = newToken;
      providerName.value = type;
      if (baseUrl) customBaseUrl.value = baseUrl;
      user.value = u;

      await fetchRepos();
    } catch (e: any) {
      ui.error = e.message || "Login failed";
      throw e;
    } finally {
      ui.isLoading = false;
    }
  };

  const loginLocal = async () => {
      ui.isLoading = true;
      ui.error = null;
      try {
          
          const handle = await window.showDirectoryPicker();
          await set("git_local_handle", handle);
          provider.value = new LocalProvider(handle);
          
          const u = await provider.value.getAuthenticatedUser();
          token.value = "local";
          providerName.value = "local";
          user.value = u;
          
          await fetchRepos();
      } catch (e: any) {
          if (e.name === "AbortError") {
             ui.isLoading = false;
             return;
          }
          ui.error = "Failed to access local folder: " + e.message;
      } finally {
          ui.isLoading = false;
      }
  };

  const loginBrowser = async () => {
      ui.isLoading = true;
      ui.error = null;
      try {
          provider.value = new BrowserProvider();
          const u = await provider.value.getAuthenticatedUser();
          token.value = "browser"; 
          providerName.value = "browser";
          user.value = u;
          await fetchRepos();
      } catch (e: any) {
          ui.error = "Failed to access browser storage: " + e.message;
      } finally {
          ui.isLoading = false;
      }
  };

  const logout = () => {
    token.value = "";
    lastRepoFullName.value = "";
    user.value = null;
    provider.value = null;
    repos.value = [];
    currentRepo.value = null;
    fileTree.value = [];
    mainFolder.value = null;
    currentFilePath.value = null;
    currentFileContent.value = "";
    originalFileContent.value = "";
    searchQuery.value = "";
    customBaseUrl.value = "";
    
    ui.error = null;
    ui.isLoading = false;
  };

  const fetchRepos = async () => {
    if (!provider.value) return;
    ui.isLoading = true;
    try {
      repos.value = await provider.value.listRepos();
    } catch (e: any) {
      ui.error = e.message;
    } finally {
      ui.isLoading = false;
    }
  };

  const fetchRepo = async (owner: string, repoName: string): Promise<Repo | undefined> => {
    if (!provider.value) return undefined;
    const existing = repos.value.find(r => r.name === repoName && (r.owner.login === owner || r.full_name === `${owner}/${repoName}`));
    if (existing) return existing;
    ui.isLoading = true;
    try {
      const repo = await provider.value.getRepo(owner, repoName);
      if (repo) {
         const idx = repos.value.findIndex(r => r.full_name === repo.full_name);
         if (idx !== -1) repos.value[idx] = repo;
         else repos.value.push(repo);
         return repo;
      }
    } catch (e: any) {
      console.error("Failed to fetch repo", e);
      if (repos.value.length === 0) {
          await fetchRepos();
          return repos.value.find(r => r.name === repoName && (r.owner.login === owner || r.full_name === `${owner}/${repoName}`));
      }
    } finally {
      ui.isLoading = false;
    }
  };

  const sortedRepos = computed(() => {
    return [...repos.value].sort((a, b) => {
      const aFav = favorites.value.includes(a.full_name);
      const bFav = favorites.value.includes(b.full_name);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0; 
    });
  });

  const toggleFavorite = (repoFullName: string) => {
    const idx = favorites.value.indexOf(repoFullName);
    if (idx === -1) favorites.value.push(repoFullName);
    else favorites.value.splice(idx, 1);
  };
  
  const selectRepo = async (repo: Repo) => {
    isSwitchingRepo.value = true;
    if (lastRepoFullName.value !== repo.full_name) {
      mainFolder.value = null;
      currentFilePath.value = null;
      fileTree.value = [];
       import('./gemini').then(({ useGeminiStore }) => {
          useGeminiStore().clearHistory();
       });
    }

    currentRepo.value = repo;
    lastRepoFullName.value = repo.full_name || "";
    currentBranch.value = repo.default_branch;

    try {
      await fetchBranches();
      await fetchFileTree();
    } finally {
      isSwitchingRepo.value = false;
    }
  };

  const fetchBranches = async () => {
    if (!provider.value || !currentRepo.value) return;
    isLoadingBranches.value = true;
    try {
      const [ owner ] = currentRepo.value.full_name.split("/");
      const safeOwner = currentRepo.value.owner.login || owner || "";
      branches.value = await provider.value.listBranches(safeOwner, currentRepo.value.name);
    } catch (e: any) {
      console.error("Failed to fetch branches", e);
    } finally {
      isLoadingBranches.value = false;
    }
  };

  const createBranch = async (name: string, fromBranch: string = currentBranch.value) => {
    if (!provider.value || !currentRepo.value) return;
    ui.isLoading = true;
    try {
       const [ owner ] = currentRepo.value.full_name.split("/");
       const safeOwner = currentRepo.value.owner.login || owner || "";
       
       const refData = await provider.value.getBranch(safeOwner, currentRepo.value.name, fromBranch);
       let sha = "";
       if (refData.object && refData.object.sha) sha = refData.object.sha; 
       else if (refData.commit && refData.commit.id) sha = refData.commit.id; 
       else if (refData.commit && refData.commit.sha) sha = refData.commit.sha; 
       
       if (!sha) throw new Error("Could not determine SHA for branch " + fromBranch);

       await provider.value.createBranch(safeOwner, currentRepo.value.name, name, sha);
       await fetchBranches();
       await switchBranch(name);
    } catch (e: any) {
      ui.error = "Failed to create branch: " + e.message;
      throw e;
    } finally {
      ui.isLoading = false;
    }
  };

  const switchBranch = async (branchName: string) => {
    if (branchName === currentBranch.value) return;

    if (Object.keys(unsavedChanges.value).length > 0) {
      const confirmed = await ui.openConfirmDialog(
        "Discard Unsaved Changes?",
        `You have unsaved changes that will be lost if you switch to branch "${branchName}". Do you want to discard them?`,
        "Discard & Switch",
        "Cancel",
        true
      );
      if (!confirmed) return;
      unsavedChanges.value = {};
      isDirty.value = false;
    }

    currentBranch.value = branchName;
    currentFilePath.value = null;
    currentFileContent.value = null;
    currentFileSha.value = null;
    await fetchFileTree();
  };

  const setMainFolder = (path: string | null, toggle = true) => {
    if (toggle && mainFolder.value === path) {
      mainFolder.value = null;
    } else {
      mainFolder.value = path;
    }
  };

  const fetchFileTree = async (background = false) => {
    if (!provider.value || !currentRepo.value) return;
    if (!background) ui.isLoading = true;

    try {
        const [ owner ] = currentRepo.value.full_name.split("/");
        const safeOwner = currentRepo.value.owner.login || owner || "";
        
        const refData = await provider.value.getBranch(safeOwner, currentRepo.value.name, currentBranch.value);
        let sha = "";
        if (refData.object && refData.object.sha) sha = refData.object.sha; 
        else if (refData.commit && refData.commit.id) sha = refData.commit.id;
        else if (refData.commit && refData.commit.sha) sha = refData.commit.sha;
        
        if (!sha) throw new Error("Could not determine SHA for branch " + currentBranch.value);

      const fetchedTree = await provider.value.getTree(safeOwner, currentRepo.value.name, sha, true);

      
      
      const processed = buildTree(fetchedTree, { 
          showDotfiles: true, 
          showAllFiles: settings.showAllFiles 
      });
      
      
      fileTree.value = reconcileOptimisticTree(processed, optimisticNodes.value, recentlyDeletedPaths.value);

    } catch (e: any) {
      ui.error = "Failed to load files: " + e.message;
    } finally {
      if (!background) ui.isLoading = false;
    }
  };
  
  const markPathDeleted = (path: string) => {
      recentlyDeletedPaths.value.set(path, Date.now());
      optimisticNodes.value.delete(path);
      
      for (const key of optimisticNodes.value.keys()) {
          if (key.startsWith(path + "/")) optimisticNodes.value.delete(key);
      }
  };

  const getRawContent = async (path: string): Promise<string | null> => {
    if (!provider.value || !currentRepo.value) return null;
    try {
        const { content } = await provider.value.getFile(
            currentRepo.value.owner.login || currentRepo.value.full_name.split('/')[0] || "",
            currentRepo.value.name,
            path,
            currentBranch.value
        );
        return content;
    } catch (e) {
      console.warn("Failed to fetch content for", path, e);
      return null;
    }
  };

  const updateContent = (newContent: string) => {
    currentFileContent.value = newContent;
    if (newContent !== originalFileContent.value) {
      isDirty.value = true;
      if (currentFilePath.value) {
        unsavedChanges.value[currentFilePath.value] = {
          content: newContent,
          timestamp: Date.now(),
          sha: currentFileSha.value,
        };
      }
    } else {
      isDirty.value = false;
      if (currentFilePath.value && unsavedChanges.value[currentFilePath.value]) {
        delete unsavedChanges.value[currentFilePath.value];
      }
    }
  };
  
  const openFile = async (path: string, background = false) => {
    if (!provider.value || !currentRepo.value) return;
    if (!background) ui.isLoading = true;

    if (path !== currentFilePath.value) {
      currentFilePath.value = path;
      currentFileContent.value = null;
      isDirty.value = !!unsavedChanges.value[path];
    }

    try {
       const [ owner ] = currentRepo.value.full_name.split("/");
       const safeOwner = currentRepo.value.owner.login || owner || ""; 
       
       const { content, sha } = await provider.value.getFile(
           safeOwner,
           currentRepo.value.name,
           path,
           currentBranch.value
       );
       
       currentFileContent.value = content;
       originalFileContent.value = content;
       currentFileSha.value = sha;
       
       if (unsavedChanges.value[path]) {
          currentFileContent.value = unsavedChanges.value[path].content;
          isDirty.value = true;
       } else {
           isDirty.value = false;
       }

    } catch (e: any) {
      if (e.message?.includes("404") || e.status === 404) {
        console.warn("File not found", path);
        currentFilePath.value = null;
        isDirty.value = false;
        return false;
      }
      ui.error = "Failed to open file: " + e.message;
      return false;
    } finally {
      if (!background) ui.isLoading = false;
    }
    return true;
  };

  const saveCurrentFile = async (message: string = "Update file via Private Notes") => {
    if (!provider.value || !currentRepo.value || !currentFilePath.value || !currentFileSha.value || currentFileContent.value === null) return;
    ui.isLoading = true;
    ui.isSaving = true; 

    try {
        const [ owner ] = currentRepo.value.full_name.split("/");
        const safeOwner = currentRepo.value.owner.login || owner || ""; 

        const response = await provider.value.updateFile(
            safeOwner,
            currentRepo.value.name,
            currentFilePath.value,
            currentFileContent.value,
            currentFileSha.value,
            message,
            currentBranch.value
        );
        
        if (response?.content?.sha) {
            currentFileSha.value = response.content.sha;
        }
        
        originalFileContent.value = currentFileContent.value;
        isDirty.value = false;
        if (unsavedChanges.value[currentFilePath.value]) delete unsavedChanges.value[currentFilePath.value];

    } catch (e: any) {
      ui.error = "Failed to save: " + e.message;
    } finally {
      ui.isLoading = false;
      ui.isSaving = false;
    }
  };

  const createFile = async (path: string, content: string, message: string = "Create file", skipTreeRefresh = false, isBase64 = false) => {
    if (!provider.value || !currentRepo.value) throw new Error("Not connected");
    ui.isLoading = true;
    try {
        const [ owner ] = currentRepo.value.full_name.split("/");
        const safeOwner = currentRepo.value.owner.login || owner || ""; 
        
        await provider.value.createFile(safeOwner, currentRepo.value.name, path, content, message, currentBranch.value);
        
        if (skipTreeRefresh) fetchFileTree(true);
        else await fetchFileTree();
        
        return { content: { sha: "pending" } }; 
    } catch (e: any) {
        ui.error = "Create failed: " + e.message;
        throw e;
    } finally {
        ui.isLoading = false;
    }
  };
  
  const deleteFile = async (path: string, sha: string, message: string = "Delete file", skipTreeRefresh = false) => {
      if (!provider.value || !currentRepo.value) return;
      ui.isLoading = true;
      try {
        const [ owner ] = currentRepo.value.full_name.split("/");
        const safeOwner = currentRepo.value.owner.login || owner || ""; 
        await provider.value.deleteFile(safeOwner, currentRepo.value.name, path, sha, message, currentBranch.value);
        
        removeFromTree(path);
        markPathDeleted(path);
        
        if (currentFilePath.value === path) {
            currentFilePath.value = null;
            currentFileContent.value = "";
            originalFileContent.value = "";
            isDirty.value = false;
        }
        if (unsavedChanges.value[path]) delete unsavedChanges.value[path];
        if (temporaryFiles.value.has(path)) temporaryFiles.value.delete(path);
        
        if (!skipTreeRefresh) await fetchFileTree();

      } catch (e: any) {
          ui.error = "Delete failed: " + e.message;
          throw e;
      } finally {
          ui.isLoading = false;
      }
  };

  const deleteNode = async (path: string, sha: string, type: "blob" | "tree") => {
    if (type === "blob") {
      return await deleteFile(path, sha, `Delete ${path.split("/").pop()}`);
    }

    if (provider.value?.deleteFolder) {
        if (!currentRepo.value) throw new Error("No sensitive repository selected");
        ui.isLoading = true;
        try {
            const [ owner ] = currentRepo.value.full_name.split("/");
            const safeOwner = currentRepo.value.owner.login || owner || ""; 
            await provider.value.deleteFolder(
                safeOwner, 
                currentRepo.value.name, 
                path, 
                sha, 
                `Delete folder ${path}`, 
                currentBranch.value
            );
            
            removeFromTree(path);
            markPathDeleted(path);
            await fetchFileTree();
        } catch (e: any) {
            ui.error = "Failed to delete folder: " + e.message;
            throw e;
        } finally {
            ui.isLoading = false;
        }
        return;
    }

    const node = getNodeByPath(path);
    if (!node) {
      removeFromTree(path);
      markPathDeleted(path);
      return;
    }

    const blobs: FileNode[] = [];
    const traverse = (n: FileNode) => {
      if (n.type === "blob") blobs.push(n);
      if (n.children) n.children.forEach(traverse);
    };
    traverse(node);

    if (blobs.length === 0) {
      removeFromTree(path);
      markPathDeleted(path);
      return;
    }

    ui.isLoading = true;
    try {
      for (const blob of blobs) {
        try {
            await deleteFile(blob.path, blob.sha, `Delete ${blob.name}`, true);
        } catch (e: any) {
            if (e.message?.includes("404") || e.status === 404) continue;
            throw e;
        }
      }
      removeFromTree(path);
      markPathDeleted(path);
      await fetchFileTree();
    } catch (e: any) {
      ui.error = "Failed to delete folder content: " + e.message;
      throw e;
    } finally {
      ui.isLoading = false;
    }
  };

  const revertFile = async () => {
    if (!currentFilePath.value) return;
    if (unsavedChanges.value[currentFilePath.value]) {
      delete unsavedChanges.value[currentFilePath.value];
    }
    await openFile(currentFilePath.value);
  };

  const revertAll = async () => {
    ui.isLoading = true;
    try {
      unsavedChanges.value = {};
      isDirty.value = false;
      optimisticNodes.value.clear();
      recentlyDeletedPaths.value.clear();

      if (currentFilePath.value) {
          currentFileContent.value = null;
          originalFileContent.value = "";
      }

      await fetchFileTree();
      
      if (currentFilePath.value) {
          await openFile(currentFilePath.value);
      }
      
    } catch (e: any) {
        ui.error = "Failed to revert all: " + e.message;
    } finally {
        ui.isLoading = false;
    }
  };

  const moveNode = async (oldPath: string, newPath: string, type: "blob" | "tree") => {
    if (!provider.value || !currentRepo.value) return;
    ui.isLoading = true;

    try {
      if (type === "blob") {
        const content = await getRawContent(oldPath);
        if (content === null)
          throw new Error(`Could not read file content for ${oldPath}`);

        await createFile(newPath, content, `Move ${oldPath} to ${newPath}`, true, true);

        const node = getNodeByPath(oldPath);
        if (node && node.sha) {
          await deleteFile(oldPath, node.sha, `Delete moved file ${oldPath}`);
        }
      } else {
        const node = getNodeByPath(oldPath);
        if (!node || !node.children) return;

        const moveChildren = async (children: FileNode[], oldParent: string, newParent: string) => {
          for (const child of children) {
            const childName = child.name;
            const targetPath = newParent + "/" + childName;

            if (child.type === "blob") {
              await moveNode(child.path, targetPath, "blob");
            } else {
              if (child.children) {
                await createDirectory(targetPath);
                await moveChildren(child.children, child.path, targetPath);
              }
            }
          }
        };

        await createDirectory(newPath);
        await moveChildren(node.children, oldPath, newPath);
        
        await deleteNode(oldPath, node.sha, "tree");
      }
      await fetchFileTree();
    } catch (e: any) {
      ui.error = "Failed to move: " + e.message;
      throw e;
    } finally {
      ui.isLoading = false;
    }
  };

  const renameNode = async (oldPath: string, newPath: string, type: "blob" | "tree") => {
    return moveNode(oldPath, newPath, type);
  };
    
  const removeFromTree = (path: string) => {
    const removeRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((n) => n.path !== path)
        .map((node) => ({
          ...node,
          children: node.children ? removeRecursive(node.children) : undefined,
        }));
    };
    fileTree.value = removeRecursive(fileTree.value);
  };
  
  const getNodeByPath = (path: string): FileNode | undefined => {
    const findNode = (nodes: FileNode[], targetPath: string): FileNode | undefined => {
      for (const node of nodes) {
        if (node.path === targetPath) return node;
        if (node.children) {
          const found = findNode(node.children, targetPath);
          if (found) return found;
        }
      }
    };
    return findNode(fileTree.value, path);
  };
  
  const findNodeByPath = (query: string): FileNode | undefined => {
    if (!query) return undefined;
    let match = getNodeByPath(query);
    if (match) return match;
    return undefined;
  };
  
  const temporaryFiles = ref(new Map<string, { url: string; mime: string }>());

  const resolveFileUrl = async (pathOrQuery: string): Promise<{ url: string; mime: string } | null> => {
      if (temporaryFiles.value.has(pathOrQuery)) return temporaryFiles.value.get(pathOrQuery) || null;
      
      const node = findNodeByPath(pathOrQuery);
      if (!node) return null;
      
      const raw = await getRawContent(node.path);
      if (!raw) return null;
      
      const mime = getMimeType(node.name);
      
      try {
        let b64 = "";
        if (providerName.value === "browser") {
             b64 = raw;
        } else {
             b64 = btoa(raw);
        }
        return { url: `data:${mime};base64,${b64}`, mime };
      } catch (e) {
        console.warn("Failed to encode image data for", pathOrQuery);
        return null;
      }
  };

  const uploadFile = async (path: string, file: File) => {
     if (!provider.value || !currentRepo.value) return;
     ui.isLoading = true;
     try {
         const reader = new FileReader();
         const base64Content = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                const res = reader.result as string; 
                resolve(res.split(',')[1] || ""); 
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
         });
         
         const mime = file.type;
         temporaryFiles.value.set(path, { url: `data:${mime};base64,${base64Content}`, mime });
         
          const [ owner ] = currentRepo.value.full_name.split("/");
          const safeOwner = currentRepo.value.owner.login || owner || ""; 
         
          const res = await provider.value.createFile(safeOwner, currentRepo.value.name, path, base64Content, `Upload ${file.name}`, currentBranch.value);
          
          fetchFileTree();
          return res;
     } catch(e: any) {
         ui.error = e.message;
     } finally {
         ui.isLoading = false;
     }
  };

  const createDirectory = async (path: string, skipTreeRefresh = false) => {
    const keepFilePath = path.endsWith("/") ? `${path}.keep` : `${path}/.keep`;
    try {
        return await createFile(keepFilePath, "", `Create directory ${path}`, skipTreeRefresh);
    } catch (e: any) {
        if (e.status === 422 || e.status === 409 || e.message?.includes("422") || e.message?.includes("409")) {
            console.log("Directory/keep file already exists, skipping creation");
            return { content: { sha: "exists" } };
        }
        throw e;
    }
  };
  
  const cancelTemplateSelection = () => {
    pendingTemplateSelection.value = null;
  };

  const applyTemplate = async (template: any): Promise<{ path: string; type: "blob" } | null> => {
    if (!pendingTemplateSelection.value) return null;
    if (!provider.value || !currentRepo.value) {
      ui.error = "Not connected to a repository.";
      pendingTemplateSelection.value = null;
      return null;
    }

    const { parentPath, filename } = pendingTemplateSelection.value;

    try {
      let content = "";

      if (template && template.path) {
        const templateContent = await getRawContent(template.path);
        content = templateContent || "";
      } else {
        const safeName = filename.replace(/\.md$/i, "");
        content = "# " + safeName;
      }

      const filePath = parentPath ? `${parentPath}/${filename}` : filename;

      const data = await createFile(filePath, content, "Create file", true);
      addToTree(filePath, filename, "blob", data?.content?.sha || "pending");

      currentFilePath.value = filePath;
      currentFileContent.value = content;
      originalFileContent.value = content;
      currentFileSha.value = data?.content?.sha || null;
      isDirty.value = false;

      pendingTemplateSelection.value = null;
      cancelCreation();
      return { path: filePath, type: "blob" };
    } catch (e: any) {
      ui.error = e?.message || "Failed to create file from template.";
      pendingTemplateSelection.value = null;
      return null;
    }
  };
  
  const startCreation = (parentPath: string | null, type: "blob" | "tree") => { pendingCreation.value = { parentPath, type } as any; };
  const cancelCreation = () => { pendingCreation.value = null; };

  const findTemplates = () => {
    const templates: any[] = [];
    const search = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "tree") {
          if (node.name === "templates") {
            if (node.children) {
              node.children.forEach((child) => {
                if (child.type === "blob" && child.name.endsWith(".md")) {
                  templates.push({
                    name: child.name.replace(".md", ""),
                    path: child.path,
                  });
                }
              });
            }
          } else {
            if (node.children) search(node.children);
          }
        }
      }
    };
    search(fileTree.value);
    return templates;
  };

  const addToTree = (
    fullPath: string,
    name: string,
    type: "blob" | "tree",
    sha: string
  ) => {
    const newNode: FileNode = {
      path: fullPath,
      name: name,
      type: type,
      mode: "100644",
      sha: sha,
      url: "",
      children: type === "tree" ? [] : undefined,
    };
    insertNodeIntoTree(fileTree.value, newNode, optimisticNodes.value);
  };

  const confirmCreation = async (
    name: string
  ): Promise<{ path: string; type: "blob" | "tree" } | null> => {
    if (!pendingCreation.value) return null;
    if (!provider.value || !currentRepo.value) {
      ui.error = "Not connected to a repository.";
      return null;
    }

    const { parentPath, type } = pendingCreation.value;
    if (!name.trim()) {
      cancelCreation();
      return null;
    }

    const safeName = name.trim();
    const path = parentPath ? `${parentPath}/${safeName}` : safeName;

    try {
      if (type === "tree") {
        await createDirectory(path, true);
        addToTree(path, safeName, "tree", "pending");
        return { path, type: "tree" };
      } else {
        const filename = safeName.toLowerCase().endsWith(".md")
          ? safeName
          : `${safeName}.md`;

        const templates = findTemplates();
        if (templates.length > 0) {
           pendingTemplateSelection.value = {
            parentPath: parentPath,
            filename: filename,
            templates: templates as any, 
          };
          cancelCreation();
          return null;
        }

        const filePath = parentPath ? `${parentPath}/${filename}` : filename;
        const content = "# " + safeName.replace(/\.md$/i, "");

        const data = await createFile(filePath, content, "Create file", true);
        addToTree(filePath, filename, "blob", data?.content?.sha || "pending");

        currentFilePath.value = filePath;
        currentFileContent.value = content;
        originalFileContent.value = content;
        currentFileSha.value = data?.content?.sha || null;
        isDirty.value = false;

        return { path: filePath, type: "blob" };
      }
    } catch (e: any) {
      ui.error = e?.message || "Failed to create item.";
      return null;
    } finally {
      if (!pendingTemplateSelection.value) {
        cancelCreation();
      }
    }
  };
  
  const refreshCurrentRepo = async () => { await fetchFileTree(); };
  
  const forceText = ref(false);

  return {
    token,
    providerName,
    customBaseUrl,
    lastRepoFullName,
    favorites,
    user,
    repos,
    currentRepo,
    currentBranch,
    branches,
    isLoadingBranches,
    hasUnsavedChanges,
    isSwitchingRepo,
    fileTree,
    visibleFileTree,
    filteredFileTree,
    mainFolder,
    searchQuery,
    currentFilePath,
    currentFileContent,
    originalFileContent,
    currentFileSha,
    isDirty,
    isBinary: isCurrentFileBinary,
    isInitialized,
    init,
    login,
    loginLocal,
    loginBrowser,
    logout,
    fetchRepos,
    fetchRepo,
    sortedRepos,
    toggleFavorite,
    selectRepo,
    fetchBranches,
    createBranch,
    switchBranch,
    setMainFolder,
    fetchFileTree,
    getRawContent,
    updateContent,
    openFile,
    saveCurrentFile,
    createFile,
    deleteFile,
    deleteNode,
    revertFile,
    revertAll,
    moveNode,
    renameNode,
    getNodeByPath,
    findNodeByPath,
    resolveFileUrl,
    uploadFile,
    createDirectory,
    cancelTemplateSelection,
    applyTemplate,
    startCreation,
    cancelCreation,
    confirmCreation,
    refreshCurrentRepo,
    pendingCreation, 
    pendingTemplateSelection,
    forceText
  };
});
