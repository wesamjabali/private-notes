import { Octokit } from "octokit";
import type { FileNode, GitProvider, GitUser, Repo } from "~/types/git";
import { isBinary } from "~/utils/file-types";

export class GitHubProvider implements GitProvider {
  name = "github" as const;
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ 
        auth: token,
        request: {
            fetch: (url: any, options: any) => {
                
                if (!options.method || options.method === 'GET') {
                    const separator = url.toString().includes('?') ? '&' : '?';
                    url = `${url}${separator}_t=${Date.now()}`;
                }
                return fetch(url, options);
            }
        }
    });
  }

  async getAuthenticatedUser(): Promise<GitUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.name ?? data.login,
      html_url: data.html_url,
    };
  }

  async listRepos(): Promise<Repo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      type: "all",
    });
    
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
    const { data } = await this.octokit.rest.repos.get({ owner, repo: name });
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
    const { data } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });
    return data.map(b => b.name);
  }
  
  async getBranch(owner: string, repo: string, branch: string): Promise<any> {
      const { data } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return data;
  }

  async createBranch(owner: string, repo: string, name: string, fromSha: string): Promise<any> {
    await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${name}`,
      sha: fromSha,
    });
  }

  async getTree(owner: string, repo: string, sha: string, recursive = true): Promise<FileNode[]> {
    const { data } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: recursive ? "1" : "0",
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
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    
    
    const ext = path.split(".").pop()?.toLowerCase() || "";
    

    if (Array.isArray(data)) {
      throw new Error("Path is a directory, not a file");
    }
    
    if ('content' in data && typeof data.content === 'string') {
      if (isBinary(path)) {
        
        const content = atob(data.content.replace(/\n/g, ''));
        return { content, sha: data.sha };
      } else {
        
        
        const binString = atob(data.content.replace(/\n/g, ''));
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(bytes);
        return { content, sha: data.sha };
      }
    }
    
    throw new Error("Unable to retrieve file content");

  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string): Promise<any> {
    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: btoa(unescape(encodeURIComponent(content))), 
        branch,
    });
    return data;
  }

  async updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string, branch: string): Promise<any> {
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        sha,
        branch,
    });
    return data;
  }

  async deleteFile(owner: string, repo: string, path: string, sha: string, message: string, branch: string): Promise<any> {
    await this.octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
    });
  }
}
