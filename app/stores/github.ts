
import { useStorage, useStorageAsync } from '@vueuse/core'
import { del, get, set } from 'idb-keyval'
import { Octokit } from 'octokit'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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

export interface Template {
  name: string
  path: string
}

export const useGitHubStore = defineStore('github', () => {
  // State
  const token = useStorage('gh_token', '')
  const lastRepoFullName = useStorage('gh_last_repo', '')
  const showHiddenFiles = useStorage('gh_show_hidden', false)
  const favorites = useStorage<string[]>('gh_favorites', [])
  const user = ref<GitHubUser | null>(null)
  const octokit = ref<Octokit | null>(null)
  
  const repos = ref<Repo[]>([])
  const currentRepo = ref<Repo | null>(null)
  const currentBranch = ref<string>('main')
  
  const fileTree = ref<FileNode[]>([])
  const mainFolder = useStorage<string | null>('gh_main_folder', null)
  
  // Custom storage wrapper for idb-keyval to work with useStorageAsync
  const idbStorage = {
    getItem: async (key: string) => {
      return await get(key)
    },
    setItem: async (key: string, value: string) => {
      await set(key, value)
    },
    removeItem: async (key: string) => {
      await del(key)
    }
  }

  // Persist unsaved changes in IndexedDB
  // Key: filePath, Value: { content: string, timestamp: number, sha: string | null }
  const unsavedChanges = useStorageAsync<Record<string, { content: string, timestamp: number, sha: string | null }>>(
    'gh_unsaved_changes', 
    {}, 
    idbStorage
  )

  // Reactive filtering of hidden files
  const visibleFileTree = computed(() => {
    if (showHiddenFiles.value) return fileTree.value

    const filterRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
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
      }, [])
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
    
    if (sourceTree) findNode(sourceTree)
    
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
  const forceText = ref(false)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Pending Creation State
  const pendingCreation = ref<{
      parentPath: string | null, // null for root
      type: 'blob' | 'tree'
  } | null>(null)

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

  const sortedRepos = computed(() => {
    return [...repos.value].sort((a, b) => {
      const aFav = favorites.value.includes(a.full_name)
      const bFav = favorites.value.includes(b.full_name)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return 0 // Keep existing sort (updated desc)
    })
  })

  const toggleFavorite = (repoFullName: string) => {
    const idx = favorites.value.indexOf(repoFullName)
    if (idx === -1) {
      favorites.value.push(repoFullName)
    } else {
      favorites.value.splice(idx, 1)
    }
  }

  const fetchRepo = async (owner: string, name: string): Promise<Repo | null> => {
    if (!octokit.value) return null
    isLoading.value = true
    try {
      const { data } = await octokit.value.rest.repos.get({
        owner,
        repo: name
      })
      return data as Repo
    } catch (e: any) {
      console.error('Failed to fetch repo', e)
      return null
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

  const setMainFolder = (path: string | null, toggle = true) => {
    if (toggle && mainFolder.value === path) {
      mainFolder.value = null
    } else {
      mainFolder.value = path
    }
  }

  const fetchFileTree = async () => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    // Do not clear fileTree here to support background refresh
    // fileTree.value = [] 
    
    try {
      // Get the reference for the default branch
      const { data: refData } = await octokit.value.rest.git.getRef({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        ref: `heads/${currentBranch.value}`
      })
      
      // Get the tree recursively
      const { data: treeData } = await octokit.value.rest.git.getTree({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
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
    forceText.value = false
    
    try {
      const { data } = await octokit.value.rest.repos.getContent({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: path,
        ref: currentBranch.value
      })
      
      if (!Array.isArray(data) && 'content' in data) {
         // Check if binary
         const lower = path.toLowerCase()
         const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif']
         const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv']
         const isBinary = imageExts.some(ext => lower.endsWith(ext)) || videoExts.some(ext => lower.endsWith(ext))
         
         const encoding = (data as any).encoding // 'base64' or undefined/none

         let content = ''
         if (isBinary) {
             if (encoding === 'base64') {
                 content = data.content.replace(/\n/g, '') // Keep base64
             } else {
                 // Content is raw text (e.g. svg or misidentified text file), but we treat as binary/image.
                 // Treat as text
                 forceText.value = true
                 content = data.content
             }
         } else {
             if (encoding === 'base64') {
                 // Correctly decode Base64 UTF-8 content
                 const binary = atob(data.content.replace(/\n/g, ''))
                 const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
                 content = new TextDecoder().decode(bytes)
             } else {
                 content = data.content // Already text
             }
         }
         
         currentFileSha.value = data.sha
         
         // Check for unsaved changes
         if (unsavedChanges.value[path]) {
            const saved = unsavedChanges.value[path]
            // We could check if sha matches to see if remote updated in mean time, 
            // but for now we prioritize local unsaved work.
            console.log('Restoring unsaved changes for', path)
            currentFileContent.value = saved.content
            isDirty.value = true
         } else {
            currentFileContent.value = content
            isDirty.value = false
         }
      }
    } catch (e: any) {
    // Handle 404 - file doesn't exist (e.g., was deleted)
    if (e.status === 404) {
      console.warn('File not found, clearing state:', path)
      currentFilePath.value = null
      currentFileContent.value = ''
      currentFileSha.value = null
      isDirty.value = false
      error.value = null // Don't show error for deleted files
      return false
    }
    error.value = "Failed to open file: " + e.message
    return false
  } finally {
    isLoading.value = false
  }
  return true
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
        path: currentFilePath.value!,
        message: message || 'Update file',
        content: contentEncoded,
        sha: currentFileSha.value,
        branch: currentBranch.value
      })
      
      // Update SHA
      currentFileSha.value = data.content?.sha || null
      isDirty.value = false
      
      // Clear unsaved changes
      if (unsavedChanges.value[currentFilePath.value]) {
        delete unsavedChanges.value[currentFilePath.value]
      }
      
    } catch (e: any) {
      error.value = "Failed to save: " + e.message
    } finally {
      isLoading.value = false
    }
  }
  
  const createFile = async (path: string, content: string, message: string = 'Create file', skipTreeRefresh = false, isBase64 = false) => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    error.value = null

    try {
      // Base64 encode content if not already
      let contentEncoded = content
      if (!isBase64) {
          contentEncoded = btoa(unescape(encodeURIComponent(content)))
      }

      const { data } = await octokit.value.rest.repos.createOrUpdateFileContents({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: path,
        message: message,
        content: contentEncoded,
        branch: currentBranch.value
      })

      // Refresh tree
      if (skipTreeRefresh) {
          fetchFileTree() // Background update
      } else {
          await fetchFileTree()
      }
      return data
    } catch (e: any) {
      error.value = "Failed to create file: " + e.message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // Template Selection State
  const pendingTemplateSelection = ref<{
      parentPath: string | null,
      filename: string,
      templates: Template[]
  } | null>(null)

  const findTemplates = () => {
      const templates: Template[] = []
      
      const search = (nodes: FileNode[]) => {
          for (const node of nodes) {
              if (node.type === 'tree') {
                  if (node.name === 'templates') {
                      // Found a templates folder - get all direct markdown children
                      if (node.children) {
                          node.children.forEach(child => {
                              if (child.type === 'blob' && child.name.endsWith('.md')) {
                                  templates.push({
                                      name: child.name.replace('.md', ''),
                                      path: child.path
                                  })
                              }
                          })
                      }
                      // Do not recurse into subfolders of 'templates' as per requirements
                  } else {
                      // Recurse
                      if (node.children) {
                          search(node.children)
                      }
                  }
              }
          }
      }
      
      search(fileTree.value)
      return templates
  }

  const applyTemplate = async (template: Template | null) => {
      if (!pendingTemplateSelection.value) return
      
      const { parentPath, filename } = pendingTemplateSelection.value
      const fullPath = parentPath ? `${parentPath}/${filename}` : filename
      
      let content = '# ' + filename.replace('.md', '')
      
      if (template) {
          try {
              const raw = await getRawContent(template.path)
              if (raw) {
                   // Correctly decode Base64 UTF-8 content
                   const binary = atob(raw)
                   const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
                   content = new TextDecoder().decode(bytes)
              }
          } catch (e) {
              console.error("Failed to load template", e)
          }
      }
      
      try {
           // We use the same optimistic logic here if we wanted, but for now applyTemplate 
           // can use the safer full wait approach or we can also optimize it.
           // Let's optimize it to be consistent with confirmCreation
           const data = await createFile(fullPath, content, 'Create file from template', true)
           
           // Optimistic update
           addToTree(fullPath, filename, 'blob', data?.content?.sha || 'pending')
           
           // Open immediately
           currentFilePath.value = fullPath
           currentFileContent.value = content
           currentFileSha.value = data?.content?.sha || null
           isDirty.value = false
           
      } catch (e) {
          console.error(e)
          throw e
      } finally {
          pendingTemplateSelection.value = null
      }
  }

  const cancelTemplateSelection = () => {
      pendingTemplateSelection.value = null
  }

  // In-place creation actions
  const startCreation = (parentPath: string | null, type: 'blob' | 'tree') => {
      pendingCreation.value = { parentPath, type }
  }
  
  const cancelCreation = () => {
      pendingCreation.value = null
  }
  
  const addToTree = (fullPath: string, name: string, type: 'blob' | 'tree', sha: string) => {
       const newNode: FileNode = {
           path: fullPath,
           name: name,
           type: type,
           mode: '100644', // dummy
           sha: sha,
           url: '', // dummy
           children: type === 'tree' ? [] : undefined
       }
       
       const insert = (nodes: FileNode[]) => {
           nodes.push(newNode)
           // sort
           nodes.sort((a, b) => {
               if (a.type === b.type) return a.name.localeCompare(b.name)
               return a.type === 'tree' ? -1 : 1
           })
       }
       
       if (!fullPath.includes('/')) {
           // Root
           insert(fileTree.value)
       } else {
           const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'))
           
           const findParent = (nodes: FileNode[]): FileNode | undefined => {
               for (const node of nodes) {
                   if (node.path === parentPath) return node
                   if (node.children) {
                       const found = findParent(node.children)
                       if (found) return found
                   }
               }
           }
           
           const parent = findParent(fileTree.value)
           if (parent && parent.children) {
               insert(parent.children)
           }
       }
  }
  
  const confirmCreation = async (name: string) => {
      if (!pendingCreation.value) return
      
      const { parentPath, type } = pendingCreation.value
      // Validate name
      if (!name.trim()) {
          cancelCreation()
          return
      }
      
      // Determine full path
      const safeName = name.trim()
      const path = parentPath ? `${parentPath}/${safeName}` : safeName
      
      try {
          if (type === 'tree') {
              await createDirectory(path)
          } else {
              // Ensure extension for files
               const filename = safeName.endsWith('.md') ? safeName : `${safeName}.md`
               
               // Check for templates before creating
               const templates = findTemplates()
               if (templates.length > 0) {
                   pendingTemplateSelection.value = {
                       parentPath: parentPath,
                       filename: filename,
                       templates: templates
                   }
                   cancelCreation() 
                   return
               }
               
               const filePath = parentPath ? `${parentPath}/${filename}` : filename
               const content = '# ' + safeName.replace('.md', '')
               
               // Create file with tree refresh skipped
               const data = await createFile(filePath, content, 'Create file', true)
               
               // Optimistic Tree Update
               addToTree(filePath, filename, 'blob', data?.content?.sha || 'pending')
               
               // Open file immediately without network fetch
               currentFilePath.value = filePath
               currentFileContent.value = content
               currentFileSha.value = data?.content?.sha || null
               isDirty.value = false
               
               // Note: Background fetchFileTree() was triggered by createFile(..., true)
          }
      } catch (e) {
          console.error(e)
          throw e
      } finally {
          if (!pendingTemplateSelection.value) {
              cancelCreation() // Reset UI if not moving to template selection
          }
      }
  }

  // Cache for optimistically uploaded files to render immediately
  const temporaryFiles = ref(new Map<string, { url: string, mime: string }>())

  const uploadFile = async (path: string, file: File) => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    error.value = null

    try {
      // Read file as base64
      const reader = new FileReader()
      const base64Content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
             const result = reader.result
             if (typeof result === 'string') {
                const parts = result.split(',')
                if (parts.length > 1) {
                    resolve(parts[1])
                } else {
                    reject(new Error('Invalid data URL'))
                }
             } else {
                reject(new Error('Failed to read file'))
             }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Optimistic cache: Store the Data URL directly for immediate resolution
      // We reconstruct the Data URL from base64 to be sure, or just use what we have? 
      // FileReader.readAsDataURL gives us the full data url.
      // Let's re-read simply for the cache or construct it.
      const mime = file.type || 'application/octet-stream'
      const dataUrl = `data:${mime};base64,${base64Content}`
      temporaryFiles.value.set(path, { url: dataUrl, mime })
      
      const { data } = await octokit.value.rest.repos.createOrUpdateFileContents({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: path,
        message: `Upload ${file.name}`,
        content: base64Content,
        branch: currentBranch.value
      })

      // We still fetch the tree to eventually consistency
      await fetchFileTree()
      return data
    } catch (e: any) {
      error.value = "Failed to upload file: " + e.message
      throw e
    } finally {
        isLoading.value = false
    }
  }

  const createDirectory = async (path: string) => {
      // To creating a directory, we create a .keep file inside it
      const keepFilePath = path.endsWith('/') ? `${path}.keep` : `${path}/.keep`
      return await createFile(keepFilePath, '', `Create directory ${path}`)
  }

  const deleteFile = async (path: string, sha: string, message: string = 'Delete file') => {
    if (!octokit.value || !currentRepo.value) return
    isLoading.value = true
    error.value = null
    try {
      try {
          await octokit.value.rest.repos.deleteFile({
            owner: currentRepo.value.full_name.split('/')[0] ?? '',
            repo: currentRepo.value.name,
            path: path,
            message: message,
            sha: sha,
            branch: currentBranch.value
          })
      } catch (apiError: any) {
          if (apiError.status === 404) {
              console.warn('File not found on GitHub, deleting locally only:', path)
          } else {
              throw apiError
          }
      }
      
      // Update logic...
      // Remove from tree
      removeFromTree(path)

      // If we deleted the current file, close it
      if (currentFilePath.value === path) {
          currentFilePath.value = null
          currentFileContent.value = ''
          currentFileSha.value = null
          isDirty.value = false
      }
      
      // Clear unsaved changes
      if (unsavedChanges.value[path]) {
          delete unsavedChanges.value[path]
      }
      
      // Clear temporary file cache
      if (temporaryFiles.value.has(path)) {
          temporaryFiles.value.delete(path)
      }

      await fetchFileTree()
    } catch (e: any) {
      error.value = "Failed to delete file: " + e.message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const revertFile = async () => {
      if (!currentFilePath.value) return
      
      // Remove from unsaved changes
      if (unsavedChanges.value[currentFilePath.value]) {
          delete unsavedChanges.value[currentFilePath.value]
      }
      
      // Reload file (will fetch from remote)
      await openFile(currentFilePath.value)
  }

  const moveNode = async (oldPath: string, newPath: string, type: 'blob' | 'tree') => {
      if (!octokit.value || !currentRepo.value) return
      isLoading.value = true
      
      try {
          if (type === 'blob') {
              // 1. Get content (Base64)
              const content = await getRawContent(oldPath)
              if (content === null) throw new Error(`Could not read file content for ${oldPath}`)
              
              // 2. Create new file with same content
              await createFile(newPath, content, `Move ${oldPath} to ${newPath}`, true, true)
              
              // 3. Delete old file
              const node = getNodeByPath(oldPath)
              if (node && node.sha) {
                   // Pass wait=true to deleteFile so we don't trigger tree refresh yet? 
                   // deleteFile calls fetchFileTree at the end.
                   // We should probably optimize this to avoid 2 refreshes.
                   await deleteFile(oldPath, node.sha, `Delete moved file ${oldPath}`)
              }
          } else {
              // Tree move
              const node = getNodeByPath(oldPath)
              if (!node || !node.children) return 

              // Recursive move function
              // We can't define this inside `moveNode` easily if we want to default export, but inside `defineStore` it's fine.
              const moveChildren = async (children: FileNode[], oldParent: string, newParent: string) => {
                  for (const child of children) {
                      const relativePath = child.path.substring(oldParent.length) // e.g. /child.md (leading slash included usually if paths match?)
                      // child.path: "folder/child.md", oldParent: "folder" -> "/child.md"
                      // Actually let's be safer
                      const childName = child.name
                      const targetPath = newParent + '/' + childName
                      
                      if (child.type === 'blob') {
                           await moveNode(child.path, targetPath, 'blob')
                      } else {
                           if (child.children) {
                               await createDirectory(targetPath) // Determine if we need to explicitly create dir
                               await moveChildren(child.children, child.path, targetPath)
                               // After moving children, we should theoretically delete changes?
                               // deleteFile implementation handles "File not found" gracefully for deletes so if the old folder is empty it's fine.
                           }
                      }
                  }
              }
              
              // If moving a folder, we first create the new folder
              await createDirectory(newPath)
              
              await moveChildren(node.children, oldPath, newPath)
              
              // Cleanup old folder?
              // The `deleteFile` calls in recursion handle the blobs. 
              // The old directory structure will disappear from git if empty.
              // But if we had `.keep` files, they are blobs, so they get moved and deleted.
              // So the old tree should naturally vanish.
          }
          
          await fetchFileTree()
      } catch (e: any) {
          error.value = "Failed to move: " + e.message
          throw e
      } finally {
          isLoading.value = false
      }
  }

  const renameNode = async (oldPath: string, newPath: string, type: 'blob' | 'tree') => {
      return moveNode(oldPath, newPath, type)
  }

  const hasUnsavedChanges = computed(() => {
      return Object.keys(unsavedChanges.value).length > 0
  })

  const revertAll = async () => {
      // Clear all unsaved changes
      unsavedChanges.value = {}
      
      // Re-fetch current file if it was dirty
      if (currentFilePath.value && isDirty.value) {
          await openFile(currentFilePath.value)
      }
      
      isDirty.value = false
  }

  const removeFromTree = (path: string) => {
      const parts = path.split('/')
      const filename = parts.pop()
      const parentPath = parts.join('/')
      
      const remove = (nodes: FileNode[]) => {
          const idx = nodes.findIndex(n => n.path === path)
          if (idx !== -1) {
              nodes.splice(idx, 1)
              return true
          }
          return false
      }

      if (!parentPath) {
          // Root
          remove(fileTree.value)
      } else {
          const findParent = (nodes: FileNode[]): FileNode | undefined => {
                for (const node of nodes) {
                    if (node.path === parentPath) return node
                    if (node.children) {
                        const found = findParent(node.children)
                        if (found) return found
                    }
                }
          }
          const parent = findParent(fileTree.value)
          if (parent && parent.children) {
              remove(parent.children)
          }
      }
      
      // Force Vue reactivity by reassigning the array
      fileTree.value = [...fileTree.value]
  }

  const getRawContent = async (path: string): Promise<string | null> => {
    if (!octokit.value || !currentRepo.value) return null
    
    // 1. Try to find SHA in fileTree to use getBlob (supports up to 100MB)
    const findSha = (nodes: FileNode[], targetPath: string): string | undefined => {
        for (const node of nodes) {
            if (node.path === targetPath) return node.sha
            if (node.children) {
                const found = findSha(node.children, targetPath)
                if (found) return found
            }
        }
    }
    
     // We search in the full fileTree (not just visible/filtered one)
    const sha = findSha(fileTree.value, path)
    
    try {
      if (sha) {
         const { data } = await octokit.value.rest.git.getBlob({
            owner: currentRepo.value.full_name.split('/')[0] ?? '',
            repo: currentRepo.value.name,
            file_sha: sha
         })
         return data.content.replace(/\n/g, '')
      }
      
      // Fallback to getContent (max 1MB)
      const { data } = await octokit.value.rest.repos.getContent({
        owner: currentRepo.value.full_name.split('/')[0] ?? '',
        repo: currentRepo.value.name,
        path: path,
        ref: currentBranch.value
      })
      
      if (!Array.isArray(data) && 'content' in data) {
          return data.content.replace(/\n/g, '')
      }
      return null
    } catch (e) {
      console.warn("Failed to fetch raw content for", path, e)
      return null
    }
  }

  // Helpers
  const updateContent = (newContent: string) => {
    currentFileContent.value = newContent
    isDirty.value = true
    
    if (currentFilePath.value) {
        unsavedChanges.value[currentFilePath.value] = {
            content: newContent,
            timestamp: Date.now(),
            sha: currentFileSha.value
        }
    }
  }

  const getNodeByPath = (path: string): FileNode | undefined => {
      const findNode = (nodes: FileNode[], targetPath: string): FileNode | undefined => {
          for (const node of nodes) {
              if (node.path === targetPath) return node
              if (node.children) {
                  const found = findNode(node.children, targetPath)
                  if (found) return found
              }
          }
      }
      return findNode(fileTree.value, path)
  }

  // --- Search & Resolve Logic ---

  const findNodeByPath = (query: string): FileNode | undefined => {
      if (!query) return undefined
      
      // 1. Exact match (fastest) - try exact path first
      let match = getNodeByPath(query)
      if (match) return match

      // 2. Recursive search with scoring
      const candidates: { node: FileNode, type: 'exactName' | 'endsWith' | 'substring' }[] = []

      const search = (nodes: FileNode[]) => {
          for (const node of nodes) {
              if (node.type === 'blob') {
                  if (node.name === query) {
                      candidates.push({ node, type: 'exactName' })
                  } else if (node.path.endsWith(query)) {
                      candidates.push({ node, type: 'endsWith' })
                  } else if (node.path.toLowerCase().includes(query.toLowerCase())) {
                      candidates.push({ node, type: 'substring' })
                  }
              }
              if (node.children) {
                  search(node.children)
              }
          }
      }
      
      search(fileTree.value)
      
      // Sort candidates by priority
      candidates.sort((a, b) => {
          const score = (type: string) => {
              if (type === 'exactName') return 3
              if (type === 'endsWith') return 2
              return 1
          }
          return score(b.type) - score(a.type)
      })
      
      return candidates[0]?.node
  }

  const resolveFileUrl = async (pathOrQuery: string): Promise<{ url: string, mime: string } | null> => {
      // 0. Check temporary cache first (for immediate optimistic rendering)
      if (temporaryFiles.value.has(pathOrQuery)) {
          return temporaryFiles.value.get(pathOrQuery) || null
      }
      
      // Also try to match cache if pathOrQuery is just filename or substring?
      // User might drop: path/to/file.png. Widget sees that.
      // If user typed: `![](image.png)`, resolving it might match the cached file if we search cache.
      // But for drag-drop, we insert the FULL PATH. So exact match on cache should work.
      // Let's iterate cache if exact match fails, to be robust?
      // Nah, drag-drop inserts exact path.

      const node = findNodeByPath(pathOrQuery)
      if (!node) return null

      // If we have a sha, we can try to fetch the blob
      const raw = await getRawContent(node.path)
      if (!raw) return null

      // Determine mime type
      const ext = node.name.split('.').pop()?.toLowerCase() || ''
      let mime = 'text/plain'
      if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico'].includes(ext)) mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      if (['svg'].includes(ext)) mime = 'image/svg+xml'
      if (['mp4', 'm4v'].includes(ext)) mime = 'video/mp4'
      if (['webm'].includes(ext)) mime = 'video/webm'
      if (['mov'].includes(ext)) mime = 'video/quicktime'
      
      return {
          url: `data:${mime};base64,${raw}`,
          mime
      }
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
    getNodeByPath,
    findNodeByPath,
    resolveFileUrl,
    moveNode,
    renameNode,
    mainFolder,
    currentFilePath,
    currentFileContent,
    currentFileSha,
    pendingTemplateSelection,
    applyTemplate,
    cancelTemplateSelection,
    isLoading,
    error,
    isDirty,
    init,
    login,
    logout,
    fetchRepos,
    fetchRepo,
    selectRepo,
    setMainFolder,
    fetchFileTree,
    openFile,
    saveCurrentFile,
    createFile,
    uploadFile,
    createDirectory,
    deleteFile,
    revertFile,
    revertAll,
    hasUnsavedChanges,
    getRawContent,
    updateContent,
    // Creation State
    pendingCreation,
    startCreation,
    cancelCreation,
    confirmCreation,
    favorites,
    sortedRepos,
    toggleFavorite,
    isBinary: computed(() => {
      if (forceText.value) return false
      if (!currentFilePath.value) return false
      const lower = currentFilePath.value.toLowerCase()
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif']
      const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv']
      return imageExts.some(ext => lower.endsWith(ext)) || videoExts.some(ext => lower.endsWith(ext))
    })
  }
})
