import type { FileNode, ViewerType } from '../types';

const SUPPORTED_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.bpmn',
  '.drawio',
  '.dio',
]);

export function detectViewerType(filename: string): ViewerType {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.bpmn')) return 'bpmn';
  if (lower.endsWith('.drawio') || lower.endsWith('.dio')) return 'drawio';
  if (lower.endsWith('.txt')) return 'text';
  return 'unsupported';
}

export function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...SUPPORTED_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

/** Formats that support in-app editing + live preview */
export function isEditableFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.txt')
  );
}

/** Directories first, then alphabetical (case-insensitive). Matches typical explorer UX. */
export function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'ja', { sensitivity: 'base' });
  });
}

/**
 * Filter tree by name / relative path, plus optional content-match path set.
 */
export function filterTree(
  nodes: FileNode[],
  query: string,
  contentMatchPaths: string[] = [],
): FileNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const contentSet = new Set(contentMatchPaths.map((p) => p.replace(/\\/g, '/').toLowerCase()));
  const pathKey = (p: string) => p.replace(/\\/g, '/').toLowerCase();

  const walk = (list: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    for (const node of list) {
      if (node.kind === 'directory') {
        const children = walk(node.children ?? []);
        const selfHit =
          node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        if (children.length > 0 || selfHit) {
          result.push({ ...node, children });
        }
      } else {
        const nameHit =
          node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        const contentHit = contentSet.has(pathKey(node.path));
        if (nameHit || contentHit) {
          result.push(node);
        }
      }
    }
    return result;
  };

  return walk(nodes);
}
