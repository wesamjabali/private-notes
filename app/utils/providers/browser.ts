
import { del, get, keys, set } from "idb-keyval";
import type { FileNode, GitProvider, Repo, User } from "~/types/git";

const STORE_PREFIX = "browser_fs_";

export class BrowserProvider implements GitProvider {
  name: "browser" = "browser";

  async getAuthenticatedUser(): Promise<User> {
    return {
      login: "browser-user",
      name: "Browser User",
      avatar_url: "",
      html_url: "",
    };
  }

  async listRepos(): Promise<Repo[]> {
    return [
      {
        id: "browser-storage",
        name: "private-notes",
        full_name: "browser/private-notes",
        default_branch: "main",
        description: "Browser Storage (IndexedDB)",
        updated_at: new Date().toISOString(),
        owner: { login: "browser" },
        clone_url: "",
        permissions: { admin: true, push: true, pull: true },
      },
    ];
  }

  async getRepo(owner: string, name: string): Promise<Repo> {
    const repos = await this.listRepos();
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
    throw new Error("Branch creation not supported in browser mode");
  }

  async getTree(
    owner: string,
    repo: string,
    sha: string,
    recursive?: boolean
  ): Promise<FileNode[]> {
    const allKeys = await keys();
    const files: FileNode[] = [];
    
    
    const fsKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(STORE_PREFIX));
    
    const paths = fsKeys.map((k) => (k as string).slice(STORE_PREFIX.length));
    
    
    
    
    
    
    
    
    const folders = new Set<string>();

    for (const path of paths) {
        files.push({
            path: path,
            name: path.split("/").pop() || path,
            type: "blob",
            mode: "100644",
            sha: "latest",
            url: ""
        });
        
        
        let parent = path.substring(0, path.lastIndexOf("/"));
        while (parent) {
            folders.add(parent);
            parent = parent.substring(0, parent.lastIndexOf("/"));
        }
    }
    
    for (const folder of folders) {
        files.push({
            path: folder,
            name: folder.split("/").pop() || folder,
            type: "tree",
            mode: "040000",
            sha: "latest",
            url: "",
            children: []
        });
    }

    return files;
  }

  async getFile(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{ content: string; sha: string }> {
    const val = await get(STORE_PREFIX + path);
    if (val === undefined) throw new Error("File not found");
    return { content: val, sha: "latest" };
  }

  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ): Promise<any> {
    await set(STORE_PREFIX + path, content);
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
    await set(STORE_PREFIX + path, content);
    return { content: { sha: "latest" } };
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message: string,
    branch: string
  ): Promise<any> {
     await del(STORE_PREFIX + path);
  }
}
