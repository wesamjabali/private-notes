import type { FileNode, GitProvider, GitUser, Repo } from "~/types/git";

export class GitLabProvider implements GitProvider {
  name = "gitlab" as const;
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl: string = "https://gitlab.com") {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async fetch(path: string, options: any = {}) {
    const baseUrl = `${this.baseUrl}/api/v4${path}`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const finalUrl = `${baseUrl}${separator}_t=${Date.now()}`;
    
    
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };
    
    
    if (options.params) {
        const u = new URL(finalUrl);
        Object.keys(options.params).forEach(key => u.searchParams.append(key, options.params[key]));
        const res = await fetch(u.toString(), { ...options, headers });
        if (!res.ok) throw new Error(`GitLab API Error: ${res.status} ${res.statusText}`);
        return res.json();
    }

    const res = await fetch(finalUrl, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitLab API Error: ${res.status} ${res.statusText} - ${text}`);
    }
    
    
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async getAuthenticatedUser(): Promise<GitUser> {
    const data = await this.fetch("/user");
    return {
      login: data.username,
      avatar_url: data.avatar_url,
      name: data.name,
      html_url: data.web_url,
    };
  }

  async listRepos(): Promise<Repo[]> {
    
    const data = await this.fetch("/projects", { params: { membership: true, simple: true, per_page: 100, order_by: 'updated_at' } });
    
    return data.map((p: any) => ({
      id: p.id,
      name: p.path,
      full_name: p.path_with_namespace,
      default_branch: p.default_branch,
      description: p.description,
      updated_at: p.last_activity_at, 
      owner: {
        login: p.namespace.path
      }
    }));
  }

  async getRepo(owner: string, name: string): Promise<Repo> {
    
    const id = encodeURIComponent(`${owner}/${name}`);
    const data = await this.fetch(`/projects/${id}`);
    return {
      id: data.id,
      name: data.path,
      full_name: data.path_with_namespace,
      default_branch: data.default_branch,
      description: data.description,
      updated_at: data.last_activity_at,
      owner: {
        login: data.namespace.path
      }
    };
  }

  async listBranches(owner: string, repo: string): Promise<string[]> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    const data = await this.fetch(`/projects/${id}/repository/branches`);
    return data.map((b: any) => b.name);
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<any> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    return this.fetch(`/projects/${id}/repository/branches/${encodeURIComponent(branch)}`);
  }

  async createBranch(owner: string, repo: string, name: string, fromSha: string): Promise<any> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    
    return this.fetch(`/projects/${id}/repository/branches`, {
        method: "POST",
        params: { branch: name, ref: fromSha } 
    });
  }

  async getTree(owner: string, repo: string, sha: string, recursive = true): Promise<FileNode[]> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    
    
    const data = await this.fetch(`/projects/${id}/repository/tree`, {
        params: { ref: sha, recursive: recursive, per_page: 100 }
    });

    return data.map((item: any) => ({
      path: item.path,
      mode: item.mode,
      type: item.type, 
      sha: item.id,
      url: "", 
      name: item.name,
    }));
  }

  async getFile(owner: string, repo: string, path: string, ref?: string): Promise<{ content: string; sha: string }> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);
    
    const data = await this.fetch(`/projects/${id}/repository/files/${filePath}`, {
        params: { ref: ref || "main" }
    });
    
    
    const BINARY_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "pdf"];
    const ext = path.split(".").pop()?.toLowerCase();
    const isBinary = ext && BINARY_EXTS.includes(ext);

    
    const rawContent = data.content || "";
    
    if (isBinary) {
        const content = rawContent ? atob(rawContent) : "";
        return { content, sha: data.blob_id || data.commit_id }; 
    } else {
        const binString = rawContent ? atob(rawContent) : "";
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(bytes);
        return { content, sha: data.blob_id || data.commit_id };
    }
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string): Promise<any> {
     const id = encodeURIComponent(`${owner}/${repo}`);
     const filePath = encodeURIComponent(path);
     return this.fetch(`/projects/${id}/repository/files/${filePath}`, {
         method: "POST",
         body: JSON.stringify({
             branch,
             content,
             commit_message: message,
             encoding: "text"
         })
     });
  }

  async updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string, branch: string): Promise<any> {
     const id = encodeURIComponent(`${owner}/${repo}`);
     const filePath = encodeURIComponent(path);
     return this.fetch(`/projects/${id}/repository/files/${filePath}`, {
         method: "PUT",
         body: JSON.stringify({
             branch,
             content,
             commit_message: message,
             encoding: "text"
         })
     });
  }

  async deleteFile(owner: string, repo: string, path: string, sha: string, message: string, branch: string): Promise<any> {
    const id = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);
    return this.fetch(`/projects/${id}/repository/files/${filePath}`, {
        method: "DELETE",
        body: JSON.stringify({
            branch,
            commit_message: message
        })
    });
  }
}
