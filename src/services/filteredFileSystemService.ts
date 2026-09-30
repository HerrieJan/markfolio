import type { FileNode } from '../types';
import { isSupportedFile, sortFileNodes } from './fileSorting';
import { isTauri, tauriBridge } from './tauriBridge';

const IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  '.DS_Store',
  'Thumbs.db',
  '.vite',
  'dist',
  'target',
]);

/** Guardrails so dropping a huge folder does not freeze the UI. */
const MAX_DEPTH = 8;
const MAX_FILES = 2000;

export type LoadTreeResult = {
  tree: FileNode[];
  warning: string | null;
};

class FilteredFileSystemService {
  async loadTree(root: string): Promise<LoadTreeResult> {
    if (!isTauri()) {
      return { tree: await this.loadWebManifestTree(root), warning: null };
    }
    const ctx = { fileCount: 0, truncated: false };
    const tree = await this.loadNativeTree(root, root, '', 0, ctx);
    const warning = ctx.truncated
      ? `フォルダが大きいため、表示を深さ ${MAX_DEPTH} / ファイル約 ${MAX_FILES} 件までに制限しました。`
      : null;
    return { tree, warning };
  }

  async readFile(path: string): Promise<string> {
    if (!isTauri()) {
      const url = path.startsWith('/') ? path : `/${path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ファイルを開けませんでした: ${path}`);
      return res.text();
    }
    return tauriBridge.readTextFile(path);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (!isTauri()) {
      throw new Error('ブラウザプレビューでは保存できません。デスクトップ版で開いてください');
    }
    await tauriBridge.writeTextFile(path, contents);
  }

  private async loadNativeTree(
    absoluteRoot: string,
    current: string,
    relativeBase: string,
    depth: number,
    ctx: { fileCount: number; truncated: boolean },
  ): Promise<FileNode[]> {
    if (depth > MAX_DEPTH || ctx.fileCount >= MAX_FILES) {
      ctx.truncated = true;
      return [];
    }

    const entries = await tauriBridge.readDir(current);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (ctx.fileCount >= MAX_FILES) {
        ctx.truncated = true;
        break;
      }
      if (!entry.name || IGNORE_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;

      const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
      const absPath = entry.path;

      if (entry.isDirectory) {
        if (depth + 1 > MAX_DEPTH) {
          ctx.truncated = true;
          continue;
        }
        const children = await this.loadNativeTree(
          absoluteRoot,
          absPath,
          relativePath,
          depth + 1,
          ctx,
        );
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            path: absPath,
            relativePath,
            kind: 'directory',
            children,
          });
        }
      } else if (isSupportedFile(entry.name)) {
        ctx.fileCount += 1;
        nodes.push({
          name: entry.name,
          path: absPath,
          relativePath,
          kind: 'file',
        });
      }
    }

    return sortFileNodes(nodes);
  }

  private async loadWebManifestTree(root: string): Promise<FileNode[]> {
    const manifestUrl = `${root.replace(/\/$/, '')}/manifest.json`;
    try {
      const res = await fetch(manifestUrl);
      if (res.ok) {
        const files: string[] = await res.json();
        return this.buildTreeFromPaths(root, files);
      }
    } catch {
      // fall through
    }

    const files = [
      'README.md',
      'getting-started.md',
      'examples/mermaid/diagram-examples.md',
      'examples/bpmn/README.md',
      'examples/bpmn/simple-process.bpmn',
      'examples/bpmn/swimlane-process.bpmn',
      'examples/bpmn/complex-swimlane-process.bpmn',
      'examples/bpmn/event-subprocess-process.bpmn',
      'examples/bpmn/parallel-gateway-process.bpmn',
      'examples/bpmn/colored-process.bpmn',
      'examples/drawio/Web3-TierArchitecture.drawio',
    ];
    return this.buildTreeFromPaths(root, files);
  }

  private buildTreeFromPaths(root: string, files: string[]): FileNode[] {
    const rootNode: FileNode = {
      name: 'root',
      path: root,
      relativePath: '',
      kind: 'directory',
      children: [],
    };

    for (const rel of files) {
      const parts = rel.split('/');
      let cursor = rootNode;
      let acc = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        acc = acc ? `${acc}/${part}` : part;
        const isFile = i === parts.length - 1;
        cursor.children ??= [];
        let child = cursor.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: `${root.replace(/\/$/, '')}/${acc}`,
            relativePath: acc,
            kind: isFile ? 'file' : 'directory',
            children: isFile ? undefined : [],
          };
          cursor.children.push(child);
        }
        if (!isFile) cursor = child;
      }
    }

    const sortRecursive = (nodes: FileNode[]): FileNode[] =>
      sortFileNodes(
        nodes.map((n) =>
          n.kind === 'directory' ? { ...n, children: sortRecursive(n.children ?? []) } : n,
        ),
      );

    return sortRecursive(rootNode.children ?? []);
  }
}

export const filteredFileSystemService = new FilteredFileSystemService();
