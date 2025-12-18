export interface User {
  login: string;
  avatar_url: string;
  name: string;
  html_url: string;
}

export type GitUser = User;

export interface Template {
  name: string;
  path: string;
}

export interface Repo {
  id: number | string;
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url?: string;
    id?: number;
  };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  clone_url?: string;
}

export interface FileNode {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
  name: string;
  children?: FileNode[];
}

export type GitProviderName = "github" | "gitlab" | "gitea" | "local" | "browser";

export interface GitProvider {
  name: GitProviderName;
  
  getAuthenticatedUser(): Promise<User>;
  listRepos(): Promise<Repo[]>;
  getRepo(owner: string, name: string): Promise<Repo>;
  
  getBranch(owner: string, repo: string, branch: string): Promise<any>;
  listBranches(owner: string, repo: string): Promise<string[]>;
  createBranch(owner: string, repo: string, name: string, fromSha: string): Promise<any>;
  
  getTree(owner: string, repo: string, sha: string, recursive?: boolean): Promise<FileNode[]>;
  
  getFile(owner: string, repo: string, path: string, ref?: string): Promise<{ content: string; sha: string }>;
  createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string): Promise<any>;
  updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string, branch: string): Promise<any>;
  deleteFile(owner: string, repo: string, path: string, sha: string, message: string, branch: string): Promise<any>;
  deleteFolder?(owner: string, repo: string, path: string, sha: string, message: string, branch: string): Promise<any>;
}
