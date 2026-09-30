import clsx from 'clsx';
import { Columns2, Eye, FilePenLine, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  discardDraft,
  saveDocument,
  setDraftContent,
  setViewMode,
} from '../store/appSlice';
import { isEditableViewerType, type ViewMode } from '../types';
import { BpmnViewer } from './BpmnViewer';
import { DrawioViewer } from './DrawioViewer';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownRenderer } from './MarkdownRenderer';

const MODE_OPTIONS: { id: ViewMode; label: string; icon: typeof Eye; title: string }[] = [
  { id: 'view', label: '閲覧', icon: Eye, title: 'プレビューのみ' },
  { id: 'edit', label: '編集', icon: FilePenLine, title: 'エディタのみ' },
  { id: 'split', label: '分割', icon: Columns2, title: '編集 + ライブプレビュー' },
];

export function DocumentViewer() {
  const dispatch = useAppDispatch();
  const { document, draftContent, viewMode, isDirty, saving } = useAppSelector((s) => s.app);
  const editable = !!document && isEditableViewerType(document.viewerType);
  const previewContent = useDebouncedValue(draftContent, 250);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const crumbs = useMemo(
    () => (document ? ['root', ...document.relativePath.split('/')] : []),
    [document],
  );

  const onSave = useCallback(() => {
    if (!editable || !isDirty || saving) return;
    dispatch(saveDocument());
  }, [dispatch, editable, isDirty, saving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const next = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(0.75, Math.max(0.25, next)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Markfolio</p>
        <p className="text-sm">左のファイルツリーからドキュメントを選択してください</p>
      </div>
    );
  }

  const effectiveMode: ViewMode = editable ? viewMode : 'view';
  const showEditor = effectiveMode === 'edit' || effectiveMode === 'split';
  const showPreview = effectiveMode === 'view' || effectiveMode === 'split';

  const renderPreview = (content: string) => {
    if (document.viewerType === 'markdown') {
      return <MarkdownRenderer content={content} />;
    }
    if (document.viewerType === 'text') {
      return <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>;
    }
    if (document.viewerType === 'bpmn') {
      return <BpmnViewer xml={document.content} />;
    }
    if (document.viewerType === 'drawio') {
      return <DrawioViewer xml={document.content} />;
    }
    return <p className="text-sm text-gray-500">このファイル形式はサポートされていません。</p>;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-3 py-1.5 dark:border-border-dark dark:bg-surface-dark-muted">
        <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          {crumbs.map((c, i) => (
            <span key={`${c}-${i}`} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
              <span
                className={clsx(
                  'truncate',
                  i === crumbs.length - 1 && 'text-gray-800 dark:text-gray-100',
                )}
              >
                {c}
                {i === crumbs.length - 1 && isDirty ? ' •' : ''}
              </span>
            </span>
          ))}
        </div>

        {editable && (
          <div className="flex shrink-0 items-center gap-1">
            <div className="mr-1 flex rounded-md border border-border p-0.5 dark:border-border-dark">
              {MODE_OPTIONS.map(({ id, label, icon: Icon, title }) => (
                <button
                  key={id}
                  type="button"
                  title={title}
                  onClick={() => dispatch(setViewMode(id))}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
                    effectiveMode === id
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              title="変更を破棄"
              disabled={!isDirty || saving}
              onClick={() => {
                if (window.confirm('未保存の変更を破棄しますか？')) {
                  dispatch(discardDraft());
                }
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RotateCcw size={13} />
              破棄
            </button>

            <button
              type="button"
              title="保存 (Ctrl+S)"
              disabled={!isDirty || saving}
              onClick={onSave}
              className="inline-flex items-center gap-1 rounded bg-gray-900 px-2.5 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              <Save size={13} />
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        )}

        {!editable && (
          <span className="shrink-0 text-[11px] text-gray-400">この形式は閲覧のみです</span>
        )}
      </div>

      <div ref={splitRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        {showEditor && (
          <div
            className="min-h-0 min-w-0 overflow-hidden border-r border-border dark:border-border-dark"
            style={{
              width: showPreview ? `${splitRatio * 100}%` : '100%',
              display: showEditor ? 'block' : 'none',
            }}
          >
            <MarkdownEditor
              value={draftContent}
              onChange={(v) => dispatch(setDraftContent(v))}
            />
          </div>
        )}

        {showEditor && showPreview && (
          <div
            role="separator"
            aria-orientation="vertical"
            title="ドラッグして幅を変更"
            onMouseDown={() => {
              dragging.current = true;
            }}
            className="z-10 w-1 shrink-0 cursor-col-resize bg-border hover:bg-blue-400 dark:bg-border-dark dark:hover:bg-blue-500"
          />
        )}

        {showPreview && (
          <div
            className="min-h-0 min-w-0 flex-1 overflow-auto bg-surface-muted p-4 dark:bg-surface-dark"
            style={
              showEditor
                ? { width: `${(1 - splitRatio) * 100}%`, flex: 'none' }
                : undefined
            }
          >
            <div
              className={clsx(
                'min-h-full rounded-lg border border-border bg-white p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark-muted',
                effectiveMode === 'view' && 'mx-auto max-w-4xl',
              )}
            >
              {renderPreview(
                editable && effectiveMode !== 'view' ? previewContent : document.content,
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
