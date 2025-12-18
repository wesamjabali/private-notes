
import type { FileNode } from "~/types/git";
import { ALLOWED_EXTS } from "./file-types";

 
export const findNodeInTree = (nodes: FileNode[], targetPath: string): FileNode | undefined => {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, targetPath);
      if (found) return found;
    }
  }
};

 
export const treeHasPathPrefix = (nodes: FileNode[], prefix: string): boolean => {
  for (const node of nodes) {
    if (node.path === prefix || node.path.startsWith(prefix + "/")) return true;
    if (node.children && treeHasPathPrefix(node.children, prefix)) return true;
  }
  return false;
};

 
export const pruneTreeByPrefix = (nodes: FileNode[], prefix: string): FileNode[] => {
  return nodes
    .filter((node) => !(node.path === prefix || node.path.startsWith(prefix + "/")))
    .map((node) => {
      if (!node.children) return node;
      return { ...node, children: pruneTreeByPrefix(node.children, prefix) };
    });
};

 
export const sortNodes = (nodes: FileNode[]) => {
  nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "tree" ? -1 : 1; 
  });
};

 
export const insertNodeIntoTree = (
  rootNodes: FileNode[],
  nodeToInsert: FileNode,
  optimisticNodes: Map<string, FileNode>
) => {
  
  const ensureFolder = (folderPath: string): FileNode => {
    const existing = findNodeInTree(rootNodes, folderPath);
    if (existing && existing.type === "tree") {
      existing.children = existing.children ?? [];
      return existing;
    }
    const parts = folderPath.split("/");
    const name = parts[parts.length - 1] ?? folderPath;
    const folderNode: FileNode = {
      path: folderPath,
      name,
      type: "tree",
      mode: "040000",
      sha: "pending",
      url: "",
      children: [],
    };
    optimisticNodes.set(folderPath, folderNode);

    if (!folderPath.includes("/")) {
      rootNodes.push(folderNode);
      sortNodes(rootNodes);
      return folderNode;
    }
    const parentPath = folderPath.substring(0, folderPath.lastIndexOf("/"));
    const parent = ensureFolder(parentPath);
    parent.children = parent.children ?? [];
    parent.children.push(folderNode);
    sortNodes(parent.children);
    return folderNode;
  };

  const existing = findNodeInTree(rootNodes, nodeToInsert.path);
  if (existing) {
    existing.sha = nodeToInsert.sha;
    existing.name = nodeToInsert.name;
    if (existing.type === "tree") existing.children = existing.children ?? [];
    return;
  }

  if (!nodeToInsert.path.includes("/")) {
    rootNodes.push(nodeToInsert);
    sortNodes(rootNodes);
    return;
  }

  const parentPath = nodeToInsert.path.substring(0, nodeToInsert.path.lastIndexOf("/"));
  const parent = ensureFolder(parentPath);
  parent.children = parent.children ?? [];
  parent.children.push(nodeToInsert);
  sortNodes(parent.children);
};


 
export const buildTree = (
  flatItems: FileNode[],
  options: { showDotfiles?: boolean; showAllFiles?: boolean } = {}
): FileNode[] => {
  const { showDotfiles = false, showAllFiles = false } = options;
  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  
  flatItems.forEach((item) => {
    const parts = item.path.split("/");
    item.name = parts[parts.length - 1] ?? "";
  });

  
  const items = flatItems.filter((item) => {
    if (item.path === ".git" || item.path.startsWith(".git/")) return false;
    
    
    const isDotfile = item.name.startsWith(".");
    if (isDotfile && !showDotfiles) return false;

    if (item.type === "tree") return true;
    
    
    if (showAllFiles) return true;

    
    
    
    
    const ext = item.name.includes(".") ? item.name.slice(item.name.lastIndexOf(".")).toLowerCase() : "";
    const upperName = item.name.toUpperCase();
    
    if (
        ALLOWED_EXTS.includes(ext) || 
        upperName === "LICENSE" || 
        upperName === "README" ||
        item.path.endsWith(".keep")
    ) {
        return true;
    }
    
    return false;
  });

  items.forEach((item) => {
    item.children = item.type === "tree" ? [] : undefined;
    map.set(item.path, item);
  });

  items.forEach((item) => {
    const parts = item.path.split("/");
    if (parts.length === 1) root.push(item);
    else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent && parent.children) parent.children.push(item);
      else root.push(item); 
    }
  });

  const sortRecursive = (nodes: FileNode[]) => {
      sortNodes(nodes);
      nodes.forEach(node => {
          if (node.children) sortRecursive(node.children);
      });
  };

  
  
  
  if (!showAllFiles) {
      const pruneRecursive = (nodes: FileNode[]): FileNode[] => {
          return nodes.filter(node => {
              if (node.type === "blob") return true; 
              
              if (node.children) {
                  node.children = pruneRecursive(node.children);
                  return node.children.length > 0;
              }
              return false; 
          });
      };
      
      
      
      
      const prunedRoot = pruneRecursive(root);
      
      
      
      
      sortRecursive(prunedRoot);
      return prunedRoot;
  }
  
  sortRecursive(root);
  return root;
};


 
export const reconcileOptimisticTree = (
  fetchedTree: FileNode[],
  optimisticNodes: Map<string, FileNode>,
  recentlyDeletedPaths: Map<string, number>
): FileNode[] => {
    
  
  let nextTree = fetchedTree;
  if (recentlyDeletedPaths.size > 0) {
      for (const [prefix] of recentlyDeletedPaths.entries()) {
        if (!treeHasPathPrefix(fetchedTree, prefix)) {
           
           
           
           
           continue; 
        }
        nextTree = pruneTreeByPrefix(nextTree, prefix);
      }
  }
  
  
  if (optimisticNodes.size === 0) return nextTree;
  
  
  
  
  
  for (const [path, node] of optimisticNodes.entries()) {
      if (recentlyDeletedPaths.has(path)) {
          
          continue;
      }
      if (findNodeInTree(nextTree, path)) {
           
           
           continue;
      }
      insertNodeIntoTree(nextTree, { ...node, children: node.children ? [...node.children] : undefined }, optimisticNodes);
  }
  
  return nextTree;
};
