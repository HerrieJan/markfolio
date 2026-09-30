import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { openDroppedPaths } from '../store/appSlice';
import { isTauri } from '../services/tauriBridge';

/**
 * Listen for OS file/folder drops on the Tauri window and open them.
 * Shows an overlay while the pointer is dragging over the app.
 */
export function useFileDrop() {
  const dispatch = useAppDispatch();
  const isDirty = useAppSelector((s) => s.app.isDirty);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      if (cancelled) return;

      const stop = await getCurrentWebview().onDragDropEvent((event) => {
        const { payload } = event;
        if (payload.type === 'enter' || payload.type === 'over') {
          setDragging(true);
          return;
        }
        if (payload.type === 'leave') {
          setDragging(false);
          return;
        }
        if (payload.type === 'drop') {
          setDragging(false);
          if (!payload.paths?.length) return;
          // Read latest dirty flag via confirm; closure may be stale — confirm is still correct UX
          if (
            isDirty &&
            !window.confirm('未保存の変更があります。破棄してドロップした項目を開きますか？')
          ) {
            return;
          }
          dispatch(openDroppedPaths(payload.paths));
        }
      });

      if (cancelled) {
        stop();
        return;
      }
      unlisten = stop;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [dispatch, isDirty]);

  return { dragging };
}
