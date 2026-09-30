import { Maximize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DiagramModal } from './DiagramModal';

interface Props {
  xml: string;
}

/** diagrams.net hash URLs break around this size in practice */
const MAX_EMBED_CHARS = 80_000;

/**
 * Renders .drawio XML via diagrams.net embed viewer.
 * Why: draw.io files are mxfile XML; the official embed viewer is the most faithful renderer.
 */
export function DrawioViewer({ xml }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const tooLarge = xml.length > MAX_EMBED_CHARS;
  const offlineHint = !navigator.onLine;

  const src = useMemo(() => {
    if (tooLarge) return '';
    const encoded = encodeURIComponent(xml);
    return `https://viewer.diagrams.net/?highlight=0000ff&edit=_blank&layers=1&nav=1&title=diagram#R${encoded}`;
  }, [xml, tooLarge]);

  if (tooLarge) {
    return (
      <div className="diagram-card text-sm text-gray-600 dark:text-gray-300">
        <p className="font-medium text-gray-800 dark:text-gray-100">
          draw.io ファイルが大きすぎて埋め込み表示できません
        </p>
        <p className="mt-2">
          ファイルサイズの目安を超えています。diagrams.net で直接開くか、分割してください。
        </p>
        <pre className="mt-4 max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">
          {xml.slice(0, 2000)}
          {xml.length > 2000 ? '\n…' : ''}
        </pre>
      </div>
    );
  }

  return (
    <>
      <div className="diagram-card group h-[560px] p-0">
        {offlineHint && (
          <div className="absolute inset-x-0 top-0 z-10 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-100">
            draw.io 表示にはインターネット接続が必要です
          </div>
        )}
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-2 top-2 z-10 rounded bg-white/90 p-1.5 text-gray-600 opacity-0 shadow hover:bg-white group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-200"
          title="フルスクリーン"
        >
          <Maximize2 size={16} />
        </button>
        <iframe title="drawio" src={src} className="h-full w-full border-0" />
      </div>

      {fullscreen && (
        <DiagramModal title="draw.io" onClose={() => setFullscreen(false)}>
          <iframe title="drawio-full" src={src} className="h-full w-full border-0 bg-white" />
        </DiagramModal>
      )}
    </>
  );
}
