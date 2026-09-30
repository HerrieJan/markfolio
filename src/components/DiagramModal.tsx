import { X } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function DiagramModal({ title, onClose, children }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, s + 0.1));
      if (e.key === '-') setScale((s) => Math.max(0.2, s - 0.1));
      if (e.key === '0') {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 text-white">
        <span className="text-sm">{title}</span>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span>Shift+ドラッグで移動 / ホイールでズーム</span>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
      </div>
      <div
        className="relative min-h-0 flex-1 cursor-default overflow-hidden"
        onWheel={(e) => {
          e.preventDefault();
          setScale((s) => Math.min(4, Math.max(0.2, s + (e.deltaY > 0 ? -0.1 : 0.1))));
        }}
        onMouseDown={(e) => {
          if (!e.shiftKey) return;
          dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        }}
        onMouseMove={(e) => {
          if (!dragging.current) return;
          setOffset({
            x: e.clientX - dragging.current.x,
            y: e.clientY - dragging.current.y,
          });
        }}
        onMouseUp={() => {
          dragging.current = null;
        }}
        onMouseLeave={() => {
          dragging.current = null;
        }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            height: '100%',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
