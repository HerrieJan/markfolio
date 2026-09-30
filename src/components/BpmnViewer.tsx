import BpmnJS from 'bpmn-js/lib/NavigatedViewer';
import { Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DiagramModal } from './DiagramModal';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

interface Props {
  xml: string;
}

export function BpmnViewer({ xml }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnJS | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const viewer = new BpmnJS({ container: hostRef.current });
    viewerRef.current = viewer;

    (async () => {
      try {
        await viewer.importXML(xml);
        const canvas = viewer.get('canvas') as { zoom: (type: string) => void };
        canvas.zoom('fit-viewport');
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'BPMN の読み込みに失敗しました');
      }
    })();

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [xml]);

  return (
    <>
      <div className="diagram-card group h-[480px] p-0">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-2 top-2 z-10 rounded bg-white/90 p-1.5 text-gray-600 opacity-0 shadow hover:bg-white group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-200"
          title="フルスクリーン"
        >
          <Maximize2 size={16} />
        </button>
        {error ? (
          <pre className="p-4 text-sm text-red-600">{error}</pre>
        ) : (
          <div ref={hostRef} className="bpmn-container h-full w-full" />
        )}
      </div>

      {fullscreen && (
        <DiagramModal title="BPMN" onClose={() => setFullscreen(false)}>
          <BpmnFullscreen xml={xml} />
        </DiagramModal>
      )}
    </>
  );
}

function BpmnFullscreen({ xml }: { xml: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const viewer = new BpmnJS({ container: ref.current });
    (async () => {
      await viewer.importXML(xml);
      const canvas = viewer.get('canvas') as { zoom: (type: string) => void };
      canvas.zoom('fit-viewport');
    })();
    return () => viewer.destroy();
  }, [xml]);

  return <div ref={ref} className="h-full w-full bg-white" />;
}
