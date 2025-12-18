import type { FileNode, GitProvider, GitUser, Repo } from "~/types/git";

export class GiteaProvider implements GitProvider {
  name = "gitea" as const;
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl: string) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  
  private async fetch(path: string, options: any = {}) {
    
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}/api/v1${path}${separator}_t=${Date.now()}`;
    
    const headers = {
      Authorization: `token ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };
    
    if (options.params) {
        const u = new URL(url);
        Object.keys(options.params).forEach(key => u.searchParams.append(key, options.params[key]));
        const res = await fetch(u.toString(), { ...options, headers });
        if (!res.ok) throw new Error(`Gitea API Error: ${res.status} ${res.statusText}`);
        return res.json();
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        throw new Error(`Gitea API Error: ${res.status} ${res.statusText}`);
    }
    
    
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async getAuthenticatedUser(): Promise<GitUser> {
    const data = await this.fetch("/user");
    return {
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.full_name || data.login,
      html_url: data.html_url || `${this.baseUrl}/${data.login}`, 
    };
  }

  async listRepos(): Promise<Repo[]> {
    const data = await this.fetch("/user/repos", { params: { sort: "updated", limit: 100 } });
    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      default_branch: r.default_branch,
      description: r.description,
      updated_at: r.updated_at,
      owner: {
        login: r.owner.login
      }
    }));
  }

  async getRepo(owner: string, name: string): Promise<Repo> {
    const data = await this.fetch(`/repos/${owner}/${name}`);
    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      default_branch: data.default_branch,
      description: data.description,
      updated_at: data.updated_at,
      owner: {
        login: data.owner.login
      }
    };
  }

  async listBranches(owner: string, repo: string): Promise<string[]> {
    const data = await this.fetch(`/repos/${owner}/${repo}/branches`);
    return data.map((b: any) => b.name);
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<any> {
    
     return this.fetch(`/repos/${owner}/${repo}/branches/${branch}`);
  }

  async createBranch(owner: string, repo: string, name: string, fromSha: string): Promise<any> {
     
     return this.fetch(`/repos/${owner}/${repo}/branches`, {
         method: "POST",
         body: JSON.stringify({
             new_branch_name: name,
             old_branch_name: fromSha 
             
             
             
             
         })
         
     });
  }

  async getTree(owner: string, repo: string, sha: string, recursive = true): Promise<FileNode[]> {
    
    const data = await this.fetch(`/repos/${owner}/${repo}/git/trees/${sha}`, {
        params: { recursive: recursive ? "1" : "0" }
    });
    
    return (data.tree as any[]).map(item => ({
      path: item.path,
      mode: item.mode,
      type: item.type,
      sha: item.sha,
      size: item.size,
      url: item.url,
      name: item.path.split('/').pop() || item.path,
    }));
  }

  async getFile(owner: string, repo: string, path: string, ref?: string): Promise<{ content: string; sha: string }> {
    
    const data = await this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
        params: { ref }
    });
    
    
    const BINARY_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "pdf"];
    const ext = path.split(".").pop()?.toLowerCase();
    const isBinary = ext && BINARY_EXTS.includes(ext);

    
    let content = "";
    if (data.encoding === 'base64') {
        const rawContent = data.content || "";
        if (isBinary) {
            content = rawContent ? atob(rawContent) : "";
        } else {
            const binString = rawContent ? atob(rawContent) : "";
            const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
            const decoder = new TextDecoder('utf-8');
            content = decoder.decode(bytes);
        }
    } else {
        content = data.content || "";
    }

    return { content, sha: data.sha };
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string): Promise<any> {
      return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
        method: "POST",
        body: JSON.stringify({
            branch,
            content: btoa(unescape(encodeURIComponent(content))),
            message,
        })
    });
  }

  async updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string, branch: string): Promise<any> {
    return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify({
            branch,
            content: btoa(unescape(encodeURIComponent(content))),
            message,
            sha
        })
    });
  }

  async deleteFile(owner: string, repo: string, path: string, sha: string, message: string, branch: string): Promise<any> {
     return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
        method: "DELETE",
        body: JSON.stringify({
            branch,
            message,
            sha
        })
    });
  }
}
