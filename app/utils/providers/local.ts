import type { FileNode, GitProvider, Repo, User } from "~/types/git";

export class LocalProvider implements GitProvider {
  name: "local" = "local";
  private handle: FileSystemDirectoryHandle;

  constructor(handle: FileSystemDirectoryHandle) {
    this.handle = handle;
  }

  async getAuthenticatedUser(): Promise<User> {
    return {
      login: "local-user",
      name: "Local User",
      avatar_url: "",
      html_url: "",
    };
  }

  async listRepos(): Promise<Repo[]> {
    return [
      {
        id: "local",
        name: this.handle.name,
        full_name: "local/" + this.handle.name,
        default_branch: "main",
        description: "Local Folder",
        updated_at: new Date().toISOString(),
        owner: { login: "local" },
        clone_url: "",
        permissions: { admin: true, push: true, pull: true },
      },
    ];
  }

  async getRepo(owner: string, name: string): Promise<Repo> {
    const repos = await this.listRepos();
    if (!repos[0]) throw new Error("Repository not found");
    return repos[0];
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<any> {
    
    return {
      name: branch,
      commit: { sha: "latest" },
      object: { sha: "latest" },
    };
  }

  async listBranches(owner: string, repo: string): Promise<string[]> {
    return ["main"];
  }

  async createBranch(
    owner: string,
    repo: string,
    name: string,
    fromSha: string
  ): Promise<any> {
    throw new Error("Branch creation not supported in local mode");
  }

  async getTree(
    owner: string,
    repo: string,
    sha: string,
    recursive?: boolean
  ): Promise<FileNode[]> {
    const files: FileNode[] = [];

    const traverse = async (
      dirHandle: FileSystemDirectoryHandle,
      pathPrefix: string
    ) => {
      
      for await (const entry of dirHandle.values()) {
        const path = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
        
        if (entry.name.startsWith(".")) continue; 

        if (entry.kind === "file") {
          files.push({
            path,
            name: entry.name,
            type: "blob",
            mode: "100644",
            sha: "latest", 
            url: "",
          });
        } else if (entry.kind === "directory") {
          files.push({
            path,
            name: entry.name,
            type: "tree",
            mode: "040000",
            sha: "latest",
            url: "",
            children: [],
          });
          if (recursive) {
            await traverse(entry as FileSystemDirectoryHandle, path);
          }
        }
      }
    };

    await traverse(this.handle, "");
    return files;
  }

  async getFile(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{ content: string; sha: string }> {
    const handle = await this.getFileHandle(path);
    const file = await handle.getFile();
    
    
    const ext = path.split(".").pop()?.toLowerCase();
    const BINARY_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "pdf"];

    let content: string;

    if (ext && BINARY_EXTS.includes(ext)) {
        content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        });
    } else {
        content = await file.text();
    }

    return { content, sha: "latest" };
  }

  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ): Promise<any> {
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { content: { sha: "latest" } };
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string,
    message: string,
    branch: string
  ): Promise<any> {
    return this.createFile(owner, repo, path, content, message, branch);
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message: string,
    branch: string
  ): Promise<any> {
      
      
      const parts = path.split("/");
      const name = parts.pop()!;
      const parentPath = parts.join("/");
      
      let dirHandle = this.handle;
      if (parentPath) {
          dirHandle = await this.getDirHandle(parentPath);
      }
      
      await dirHandle.removeEntry(name);
  }

  async deleteFolder(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message: string,
    branch: string
  ): Promise<any> {
    const parts = path.split("/");
    const name = parts.pop()!;
    const parentPath = parts.join("/");

    let dirHandle = this.handle;
    if (parentPath) {
      dirHandle = await this.getDirHandle(parentPath);
    }

    await dirHandle.removeEntry(name, { recursive: true });
  }

  
  private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    const parts = path.split("/");
    const filename = parts.pop()!;
    let currentDir = this.handle;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }
    return currentDir.getFileHandle(filename, { create });
  }
  
  private async getDirHandle(path: string, create = false): Promise<FileSystemDirectoryHandle> {
      if (!path) return this.handle;
      const parts = path.split("/");
      let currentDir = this.handle;
      for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, { create });
      }
      return currentDir;
  }
}
