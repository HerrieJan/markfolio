import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import type { FileNode } from '../types';

interface Props {
  nodes: FileNode[];
  expanded: Record<string, boolean>;
  selectedPath: string | null;
  dirtyPath?: string | null;
  depth?: number;
  onSelect: (node: FileNode) => void;
  onToggle: (path: string) => void;
  onExpand: (path: string) => void;
}

export function FileTree({
  nodes,
  expanded,
  selectedPath,
  dirtyPath = null,
  depth = 0,
  onSelect,
  onToggle,
  onExpand,
}: Props) {
  return (
    <ul className="select-none">
      {nodes.map((node) => {
        const isOpen = !!expanded[node.path];
        const isSelected = selectedPath === node.path;
        const isDirty = dirtyPath === node.path;

        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node)}
              className={clsx(
                'flex w-full items-center gap-1.5 px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700/60',
                isSelected && 'bg-gray-200/80 dark:bg-gray-700',
              )}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              {node.kind === 'directory' ? (
                <>
                  <span
                    className="inline-flex w-4 shrink-0 text-gray-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(node.path);
                    }}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  {isOpen ? (
                    <FolderOpen size={15} className="shrink-0 text-amber-500" />
                  ) : (
                    <Folder size={15} className="shrink-0 text-amber-500" />
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex w-4 shrink-0" />
                  <FileText size={15} className="shrink-0 text-blue-500" />
                </>
              )}
              <span className="truncate text-gray-800 dark:text-gray-100">
                {node.name}
                {isDirty ? ' •' : ''}
              </span>
            </button>

            {node.kind === 'directory' && isOpen && node.children && (
              <FileTree
                nodes={node.children}
                expanded={expanded}
                selectedPath={selectedPath}
                dirtyPath={dirtyPath}
                depth={depth + 1}
                onSelect={(n) => {
                  if (n.kind === 'directory') onExpand(node.path);
                  onSelect(n);
                }}
                onToggle={onToggle}
                onExpand={onExpand}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
