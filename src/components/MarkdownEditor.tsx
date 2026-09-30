import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MarkdownEditor({ value, onChange, readOnly }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Keep caret stable; controlled textarea is fine for our doc sizes
  useEffect(() => {
    if (!ref.current) return;
    // Autofocus when entering edit/split
    if (!readOnly && document.activeElement !== ref.current) {
      // don't steal focus on every keystroke — only when empty selection focus is outside
    }
  }, [readOnly]);

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="h-full w-full resize-none border-0 bg-white p-4 font-mono text-sm leading-6 text-gray-900 outline-none dark:bg-surface-dark-muted dark:text-gray-100"
      placeholder="Markdown を入力..."
      aria-label="ドキュメントエディタ"
    />
  );
}
