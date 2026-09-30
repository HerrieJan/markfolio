import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { filterTree } from '../services/fileSorting';
import { openDocument, reloadTree, setExpanded, toggleExpanded } from '../store/appSlice';
import type { FileNode } from '../types';
import { FileTree } from './FileTree';

function confirmDiscardIfDirty(isDirty: boolean): boolean {
  if (!isDirty) return true;
  return window.confirm('未保存の変更があります。破棄して別のファイルを開きますか？');
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  const {
    tree,
    searchQuery,
    contentMatchPaths,
    expanded,
    selectedPath,
    treeLoading,
    isDirty,
  } = useAppSelector((s) => s.app);

  const filtered = useMemo(
    () => filterTree(tree, searchQuery, contentMatchPaths),
    [tree, searchQuery, contentMatchPaths],
  );

  const handleSelect = (node: FileNode) => {
    if (node.kind === 'directory') {
      dispatch(toggleExpanded(node.path));
      return;
    }
    if (node.path === selectedPath) return;
    if (!confirmDiscardIfDirty(isDirty)) return;
    dispatch(openDocument(node));
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white dark:border-border-dark dark:bg-surface-dark-muted">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 dark:border-border-dark">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ファイル</span>
        <button
          type="button"
          onClick={() => {
            if (!confirmDiscardIfDirty(isDirty)) return;
            dispatch(reloadTree());
          }}
          disabled={treeLoading}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCw size={14} className={treeLoading ? 'animate-spin' : ''} />
          再読み込み
        </button>
      </div>

      <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-border-dark dark:text-gray-400">
        名前
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-1">
        <FileTree
          nodes={filtered}
          expanded={expanded}
          selectedPath={selectedPath}
          dirtyPath={isDirty ? selectedPath : null}
          onSelect={handleSelect}
          onToggle={(path) => dispatch(toggleExpanded(path))}
          onExpand={(path) => dispatch(setExpanded({ path, open: true }))}
        />
      </div>
    </aside>
  );
}
