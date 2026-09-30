import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentViewer } from './components/DocumentViewer';
import { DropOverlay } from './components/DropOverlay';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { useFileDrop } from './hooks/useFileDrop';
import {
  bootstrapApp,
  clearError,
  clearWarning,
  openFolder,
  searchDocumentContents,
} from './store/appSlice';
import { useThemeStore } from './store/themeStore';
import { isTauri } from './services/tauriBridge';

export default function App() {
  const dispatch = useAppDispatch();
  const { sidebarOpen, error, warning, loading, treeLoading, searchQuery, docsRoot, isDirty } =
    useAppSelector((s) => s.app);
  const setTheme = useThemeStore((s) => s.setTheme);
  const theme = useThemeStore((s) => s.theme);
  const { dragging } = useFileDrop();

  // Apply persisted theme once on mount (do not depend on theme — toggling must not re-bootstrap)
  useEffect(() => {
    setTheme(theme);
    dispatch(bootstrapApp());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only bootstrap
  }, [dispatch, setTheme]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;
    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('menu://open-folder', () => {
        if (isDirty && !window.confirm('未保存の変更があります。破棄してフォルダを開きますか？')) {
          return;
        }
        dispatch(openFolder());
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [dispatch, isDirty]);

  // Debounced content search when the query looks intentional
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2 || treeLoading) return;
    const handle = window.setTimeout(() => {
      dispatch(searchDocumentContents(q));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery, docsRoot, treeLoading, dispatch]);

  return (
    <div className="relative flex h-full flex-col bg-surface-muted dark:bg-surface-dark">
      <DropOverlay visible={dragging} />
      <Header />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && <Sidebar />}
        <main className="relative min-w-0 flex-1 overflow-hidden">
          {error && (
            <div className="flex items-start justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <span className="min-w-0 flex-1">{error}</span>
              <button
                type="button"
                onClick={() => dispatch(clearError())}
                className="shrink-0 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                aria-label="エラーを閉じる"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {warning && (
            <div className="flex items-start justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <span className="min-w-0 flex-1">{warning}</span>
              <button
                type="button"
                onClick={() => dispatch(clearWarning())}
                className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
                aria-label="警告を閉じる"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              読み込み中...
            </div>
          ) : (
            <>
              {treeLoading && (
                <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  更新中...
                </div>
              )}
              <DocumentViewer />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
