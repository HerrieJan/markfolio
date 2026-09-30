import { FileUp } from 'lucide-react';

interface Props {
  visible: boolean;
}

export function DropOverlay({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-blue-500/15 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-500 bg-white/95 px-10 py-8 shadow-lg dark:bg-surface-dark-muted/95">
        <FileUp className="text-blue-600 dark:text-blue-400" size={36} />
        <p className="text-base font-medium text-gray-800 dark:text-gray-100">
          ファイルまたはフォルダをドロップして開く
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          .md / .bpmn / .drawio / .txt またはドキュメントフォルダ
        </p>
      </div>
    </div>
  );
}
