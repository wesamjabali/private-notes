import { useRouter } from 'vue-router'
import { useGitHubStore } from '~/stores/github'

export function useFileActions() {
    const store = useGitHubStore()
    const router = useRouter()
    
    // Hidden file input for uploads
    const fileInput = ref<HTMLInputElement | null>(null)
    const uploadCallback = ref<((file: File) => void) | null>(null)

    // Helper to create hidden input dynamically if not present
    const ensureInput = () => {
        if (typeof document === 'undefined') return
        
        let input = document.getElementById('global-file-input') as HTMLInputElement
        if (!input) {
            input = document.createElement('input')
            input.type = 'file'
            input.id = 'global-file-input'
            input.style.display = 'none'
            document.body.appendChild(input)
            
            input.addEventListener('change', (e: Event) => {
                 const target = e.target as HTMLInputElement
                 if (target.files && target.files.length > 0 && uploadCallback.value) {
                     // Handle multiple files if needed, but for now just one or loop
                     Array.from(target.files).forEach(f => uploadCallback.value!(f))
                     target.value = '' // Reset
                 }
            })
        }
        return input
    }

    const createFolder = async (basePath: string | null) => {
        store.startCreation(basePath || null, 'tree')
    }

    const createNote = async (basePath: string | null) => {
        store.startCreation(basePath || null, 'blob')
    }

    const triggerUpload = (basePath: string | null) => {
        const input = ensureInput()
        if (!input) return
        
        uploadCallback.value = async (file: File) => {
            const path = basePath ? `${basePath}/${file.name}` : file.name
            await store.uploadFile(path, file)
        }
        input.click()
    }
    
    const handleDrop = async (files: File[], basePath: string | null) => {
        for (const file of files) {
             const path = basePath ? `${basePath}/${file.name}` : file.name
             await store.uploadFile(path, file)
        }
    }

    const deleteCurrentFile = async () => {
        if (!store.currentFilePath || !store.currentFileSha) return
        
        const pathToDelete = store.currentFilePath
        const shaToDelete = store.currentFileSha

        const confirmed = confirm(`Are you sure you want to delete ${pathToDelete}?`)
        if (!confirmed) return

        try {
            await store.deleteFile(pathToDelete, shaToDelete)
            
            // Navigate to parent or root
            const parts = pathToDelete.split('/')
            parts.pop()
            const parentPath = parts.join('/')
            
            // We need to construct the URL manually or use the store's currentRepo info
            if (store.currentRepo) {
                const owner = store.currentRepo.full_name.split('/')[0]
                const repo = store.currentRepo.name
                const target = parentPath ? `/repo/${owner}/${repo}/${parentPath}` : `/repo/${owner}/${repo}/`
                
                // Use router
                router.replace(target)
            }

        } catch (e) {
            console.error(e)
            alert('Failed to delete file')
        }
    }

    return {
        createFolder,
        createNote,
        triggerUpload,
        handleDrop,
        deleteCurrentFile
    }
}
