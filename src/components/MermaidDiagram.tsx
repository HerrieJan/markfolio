import { Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';
import { useEffect, useId, useRef, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { DiagramModal } from './DiagramModal';

mermaid.initialize({
  startOnLoad: false,
  // Why: avoid executing script-like content from untrusted Markdown
  securityLevel: 'strict',
  fontFamily: 'Segoe UI, Hiragino Sans, Meiryo, sans-serif',
});

interface Props {
  chart: string;
}

export function MermaidDiagram({ chart }: Props) {
  const id = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Mermaid の描画に失敗しました');
          setSvg('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id, theme]);

  return (
    <>
      <div className="diagram-card group">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-2 top-2 rounded bg-white/90 p-1.5 text-gray-600 opacity-0 shadow hover:bg-white group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-200"
          title="フルスクリーン"
        >
          <Maximize2 size={16} />
        </button>
        {error ? (
          <pre className="text-sm text-red-600">{error}</pre>
        ) : (
          <div
            ref={containerRef}
            className="flex justify-center overflow-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {fullscreen && (
        <DiagramModal title="Mermaid" onClose={() => setFullscreen(false)}>
          <div
            className="flex h-full items-center justify-center overflow-auto p-4"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </DiagramModal>
      )}
    </>
  );
}
