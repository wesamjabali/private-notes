import { useRouter } from "vue-router";
import { useGitStore } from "~/stores/git";
import { useSettingsStore } from "~/stores/settings";

export function useDailyNote() {
  const gitStore = useGitStore();
  const settingsStore = useSettingsStore();
  const router = useRouter();

  const formatDate = (format: string, date: Date): string => {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return format
      .replace("YYYY", year)
      .replace("MM", month)
      .replace("DD", day);
  };

  const getDailyNotePath = (): string => {
    const title = formatDate(settingsStore.dailyNoteDateFormat, new Date());
    const folder = settingsStore.dailyNotePath.replace(/\/$/, ""); 
    
    
    const filename = title.endsWith(".md") ? title : `${title}.md`;
    
    
    
    
    
    
    
    const cleanFolder = folder.startsWith("/") ? folder.slice(1) : folder;
    
    return cleanFolder ? `${cleanFolder}/${filename}` : filename;
  };

  const openDailyNote = async () => {
    if (!gitStore.currentRepo) return;

    const path = getDailyNotePath();
    const [owner, repo] = gitStore.currentRepo.full_name.split("/");

    
    
    
    
    
    
    const exists = gitStore.fileTree.some(node => node.path === path || node.path === path + ".md"); 
    
    
    
    
    
    
    
    
    
    
    
    
    
    console.log(`[useDailyNote] Checking for daily note at: ${path}`);
    
    try {
       
       const pathParts = path.split("/");
       const fileName = pathParts.pop();
       const folderPath = pathParts.join("/");
       
       let folderExists = false;
       if (folderPath) {
         
         const findFolder = (nodes: any[]): boolean => {
           for (const node of nodes) {
             if (node.path === folderPath && node.type === "tree") return true;
             if (node.children) {
               if (findFolder(node.children)) return true;
             }
           }
           return false;
         };
         
         folderExists = findFolder(gitStore.fileTree);
         
         if (!folderExists) {
             console.log("[useDailyNote] Daily folder missing, creating:", folderPath);
             await gitStore.createDirectory(folderPath);
             
             folderExists = true;
         }
       }

       
       
       let fileExists = false;
       if (folderExists) {
           const findFile = (nodes: any[]): boolean => {
               for (const node of nodes) {
                   if (node.path === path) return true;
                   if (node.children) {
                       if (findFile(node.children)) return true;
                   }
               }
               return false;
           };
           fileExists = findFile(gitStore.fileTree);
       }
       
       
       
       
       
       
       
       let content: string | null = null;
       if (fileExists) {
           content = "exists";
       } else {
           
           content = null;
       }
       
       if (content === null) {
         
         console.log("[useDailyNote] Creating new daily note:", path);
         
         let initialContent = "";
         if (settingsStore.dailyNoteTemplate) {
            try { 
                const tmplPath = settingsStore.dailyNoteTemplate.startsWith("/") 
                    ? settingsStore.dailyNoteTemplate.slice(1) 
                    : settingsStore.dailyNoteTemplate;
                
                const tmplContent = await gitStore.getRawContent(tmplPath);
                if (tmplContent) initialContent = tmplContent;
            } catch (e) {
                console.warn("Failed to load template", e);
            }
         }
         
          
          try {
            const res = await gitStore.createFile(path, initialContent, "Create daily note");
            
            
            const filename = path.split("/").pop() || path;
            gitStore.addToTree(path, filename, "blob", res?.content?.sha || "pending");
            
            gitStore.currentFilePath = path;
            gitStore.currentFileContent = initialContent;
            gitStore.originalFileContent = initialContent;
            gitStore.currentFileSha = res?.content?.sha || null;
            gitStore.isDirty = false;
            
          } catch (e: any) {
              if (e.status === 422 || e.message?.includes("sha") || e.message?.includes("422")) {
                  console.log("[useDailyNote] File already exists (race condition), opening it.");
                  
                  
                  
                  
                  
                  
                  const content = await gitStore.getRawContent(path);
                  if (content) {
                      gitStore.currentFilePath = path;
                      gitStore.currentFileContent = content;
                  }
                  
                  gitStore.fetchFileTree(); 
              } else {
                  throw e;
              }
          }
       } else {
           console.log("[useDailyNote] Daily note exists:", path);
           
           gitStore.currentFilePath = path;
           
           
           
       }
       
       
       router.push(`/repo/${owner}/${repo}/${path}`);
       
    } catch (e: any) {
       console.error("Error opening/creating daily note", e);
       await gitStore.openConfirmDialog("Error", "Failed to open daily note: " + e.message, "OK", "");
    }
  };

  return {
    openDailyNote
  };
}
