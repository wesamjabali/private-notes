
import { useStorage } from '@vueuse/core'
import { Octokit } from 'octokit'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string
  html_url: string
}

export interface Repo {
  id: number
  name: string
  full_name: string
  default_branch: string
  description: string | null
  updated_at: string
}

export interface FileNode {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
  name: string
  children?: FileNode[]
}

export const useGitHubStore = defineStore('github', () => {
  // State
  const token = useStorage('gh_token', '')
  const lastRepoFullName = useStorage('gh_last_repo', '')
  const showHiddenFiles = useStorage('gh_show_hidden', false)
  const user = ref<GitHubUser | null>(null)
  const octokit = ref<Octokit | null>(null)
  
  const repos = ref<Repo[]>([])
  const currentRepo = ref<Repo | null>(null)
  const currentBranch = ref<string>('main')
  
  const fileTree = ref<FileNode[]>([])
  const mainFolder = useStorage<string | null>('gh_main_folder', null)

  // Reactive filtering of hidden files
  const visibleFileTree = computed(() => {
    if (showHiddenFiles.value) return fileTree.value

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.name.startsWith('.')) return false
        if (node.children) {
          // Clone node to avoid mutating original state if we needed deep mutability, 
          // but for filtering children we need a new array refs. 
          // Actually, since we don't want to mutate the original tree structure which might be used elsewhere (unlikely here but good practice),
          // we should return new objects if children change. 
          // However, for simple filtering, we can just return a filtered view if we don't mutate.
          // But `node` object is shared. improving:
          // We need to return a new node structure if we filter children, otherwise we mutate the original `children` array if we were to assign,
          // OR we return a new array of nodes where children are filtered.
          // Since Vue refs are deep, we need to be careful.
          
          // Simpler approach: Create a recursive filter function that returns new nodes only if children change?
          // Let's just create a computed view that maps/filters.
        }
        return true
      }).map((node: FileNode) => {
         if (node.children) {
             return { ...node, children: filterNodes(node.children) }
         }
         return node
      })
    }
    
    // Better implementation:
    const filterRecursive = (nodes: FileNode[]): FileNode[] => {
        return nodes.reduce((acc, node) => {
            const isHidden = node.name.startsWith('.')
            if (isHidden) return acc
            
            if (node.children) {
                // If it has children, we need to filter them too. 
                // We create a shallow copy to attach filtered children, preserving the original tree intact.
                const filteredChildren = filterRecursive(node.children)
                acc.push({ ...node, children: filteredChildren })
            } else {
                acc.push(node)
            }
            return acc
        }, [] as FileNode[])
    }

    return filterRecursive(fileTree.value)
  })

  const filteredFileTree = computed(() => {
    // Determine the source tree: normally visibleFileTree (which is either all or filtered)
    // If mainFolder is set, we need to find it IN the visible tree.
    const sourceTree = visibleFileTree.value
    
    if (!mainFolder.value) return sourceTree
    
    // Find the node corresponding to mainFolder
    let targetNode: FileNode | null = null
    
    const findNode = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.path === mainFolder.value) {
          targetNode = node
          return
        }
        if (node.children) findNode(node.children)
        if (targetNode) return
      }
    }
    
    findNode(sourceTree)
    
    // If found, return its children as the new root
    if (targetNode && targetNode.type === 'tree' && targetNode.children) {
      return targetNode.children
    }
    // If main folder is hidden (e.g. it was a dotfolder and we toggled off), 
    // we might return empty or null. Returning empty array is safe.
    return []
  })

  const currentFilePath = ref<string | null>(null)
  const currentFileContent = ref<string>('')
  const currentFileSha = ref<string | null>(null)
  const isDirty = ref(false)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const init = async () => {
    if (token.value) {
      try {
        octokit.value = new Octokit({ auth: token.value })
        const { data } = await octokit.value.rest.users.getAuthenticated()
        user.value = data as GitHubUser
        
        await fetchRepos()
        
        // Auto-select last repo if available
        if (lastRepoFullName.value && repos.value.length > 0) {
          const repo = repos.value.find(r => r.full_name === lastRepoFullName.value)
          if (repo) {
            await selectRepo(repo)
          }
        }
      } catch (e) {
        console.error('Invalid token', e)
        logout()
      }
    }
  }

  const login = async (newToken: string) => {
    isLoading.value = true
    error.value = null
    try {
      const tempOctokit = new Octokit({ auth: newToken })
      const { data } = await tempOctokit.rest.users.getAuthenticated()
      
      token.value = newToken
      octokit.value = tempOctokit
      user.value = data as GitHubUser
      
      await fetchRepos()
    } catch (e: any) {
      error.value = e.message || 'Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    token.value = ''
    lastRepoFullName.value = ''
    user.value = null
    octokit.value = null
    repos.value = []
    currentRepo.value = null
    fileTree.value = []
    mainFolder.value = null
    currentFilePath.value = null
    currentFileContent.value = ''
  }

  const fetchRepos = async () => {
    if (!octokit.value) return
    isLoading.value = true
    try {
      const { data } = await octokit.value.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        type: 'all' // or 'owner' depending on preference
      })
      repos.value = data as Repo[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  const selectRepo = async (repo: Repo) => {
    currentRepo.value = repo
    lastRepoFullName.value = repo.full_name || ''
    currentBranch.value = repo.default_branch
    mainFolder.value = null // Reset main folder on repo change
    await fetchFileTree()
  }

  const setMainFolder = (path: string | null) => {
    mainFolder.value =  mainFolder.value === path ? null : path
  }

  const fetchFileTree = async () => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    fileTree.value = []
    
    try {
      // Get the reference for the default branch
      const { data: refData } = await octokit.value.rest.git.getRef({
        owner: currentRepo.value.full_name.split('/')[0],
        repo: currentRepo.value.name,
        ref: `heads/${currentBranch.value}`
      })
      
      // Get the tree recursively
      const { data: treeData } = await octokit.value.rest.git.getTree({
        owner: currentRepo.value.full_name.split('/')[0],
        repo: currentRepo.value.name,
        tree_sha: refData.object.sha,
        recursive: '1'
      })

      // Process flat tree into nested structure
      fileTree.value = buildTree(treeData.tree as FileNode[])
      
    } catch (e: any) {
      error.value = "Failed to load files: " + e.message
    } finally {
      isLoading.value = false
    }
  }
  
  const buildTree = (flatItems: FileNode[]): FileNode[] => {
    const root: FileNode[] = []
    const map = new Map<string, FileNode>()

    // First, set the name property for all items
    flatItems.forEach(item => {
      const parts = item.path.split('/')
      item.name = parts[parts.length - 1] ?? ''
    })

    // Filter: .md files, images, videos, and folders
    const items = flatItems.filter(item => {
      // Ignore .git directory
      if (item.path === '.git' || item.path.startsWith('.git/')) return false
      
      // Keep all folders (we'll filter empty ones later)
      if (item.type === 'tree') return true
      
      // Keep .md files
      if (item.path.endsWith('.md')) return true
      
      // Keep image files
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif']
      if (imageExts.some(ext => item.path.toLowerCase().endsWith(ext))) return true
      
      // Keep video files
      const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv']
      if (videoExts.some(ext => item.path.toLowerCase().endsWith(ext))) return true
      
      return false
    })

    items.forEach(item => {
      // Set children for tree nodes
      item.children = item.type === 'tree' ? [] : undefined
      map.set(item.path, item)
    })

    items.forEach(item => {
      const parts = item.path.split('/')
      if (parts.length === 1) {
        root.push(item)
      } else {
        const parentPath = parts.slice(0, -1).join('/')
        const parent = map.get(parentPath)
        if (parent && parent.children) {
          parent.children.push(item)
        } else {
          // Fallback if parent not found (shouldn't happen in consistent tree)
          root.push(item) 
        }
      }
    })
    
    // Recursive function to check if a folder has any .md files in its tree
    const hasMarkdownDescendants = (node: FileNode): boolean => {
      if (node.type === 'blob' && node.path.endsWith('.md')) return true
      if (node.children && node.children.length > 0) {
        return node.children.some(child => hasMarkdownDescendants(child))
      }
      return false
    }
    
    // Recursive function to prune empty folders
    const pruneEmptyFolders = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.type === 'blob') return true // Keep all files (already filtered to .md)
        
        if (node.children) {
          // First, recursively prune children
          node.children = pruneEmptyFolders(node.children)
          // Keep folder only if it has children after pruning
          return node.children.length > 0
        }
        
        return false // Empty folder with no children
      })
    }
    
    const prunedRoot = pruneEmptyFolders(root)
    
    // Sort directories first, then files
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'tree' ? -1 : 1
      })
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children)
      })
    }
    sortNodes(prunedRoot)

    return prunedRoot
  }

  const openFile = async (path: string) => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    currentFilePath.value = path
    
    try {
      const { data } = await octokit.value.rest.repos.getContent({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: path,
        ref: currentBranch.value
      })
      
      if (!Array.isArray(data) && 'content' in data) {
         currentFileContent.value = atob(data.content.replace(/\n/g, '')) // Base64 decode
         currentFileSha.value = data.sha
         isDirty.value = false
      }
    } catch (e: any) {
      error.value = "Failed to open file: " + e.message
    } finally {
      isLoading.value = false
    }
  }

  const saveCurrentFile = async (message: string = 'Update file via Private Notes') => {
    if (!octokit.value || !currentRepo.value || !currentFilePath.value || !currentFileSha.value) return
    isLoading.value = true
    
    try {
      // Base64 encode content
      // Note: btoa has issues with unicode, so we need a utf8-safe way. 
      // Using a small utility or TextEncoder
      const contentEncoded = btoa(unescape(encodeURIComponent(currentFileContent.value)))
      
      const { data } = await octokit.value.rest.repos.createOrUpdateFileContents({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: currentFilePath.value,
        message: message,
        content: contentEncoded,
        sha: currentFileSha.value,
        branch: currentBranch.value
      })
      
      // Update SHA
      currentFileSha.value = data.content?.sha || null
      isDirty.value = false
      
    } catch (e: any) {
      error.value = "Failed to save: " + e.message
    } finally {
      isLoading.value = false
    }
  }
  
  // Helpers
  const updateContent = (newContent: string) => {
    currentFileContent.value = newContent
    isDirty.value = true
  }

  return {
    token,
    showHiddenFiles,
    user,
    repos,
    currentRepo,
    fileTree,
    visibleFileTree,
    filteredFileTree,
    mainFolder,
    currentFilePath,
    currentFileContent,
    isLoading,
    error,
    isDirty,
    init,
    login,
    logout,
    fetchRepos,
    selectRepo,
    setMainFolder,
    fetchFileTree,
    openFile,
    saveCurrentFile,
    updateContent
  }
})
