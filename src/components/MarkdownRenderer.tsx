import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { MermaidDiagram } from './MermaidDiagram';
import 'highlight.js/styles/github-dark.css';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const components: Components = {
    // Why: fenced blocks are wrapped as <pre><code>; handle mermaid at `pre` to avoid invalid nesting
    pre({ children }) {
      const child = Array.isArray(children) ? children[0] : children;
      if (
        child &&
        typeof child === 'object' &&
        'props' in child &&
        child.props &&
        typeof child.props === 'object'
      ) {
        const props = child.props as { className?: string; children?: unknown };
        const match = /language-(\w+)/.exec(props.className || '');
        if (match?.[1] === 'mermaid') {
          const code = String(props.children ?? '').replace(/\n$/, '');
          return <MermaidDiagram chart={code} />;
        }
      }
      return <pre>{children}</pre>;
    },
    code(props) {
      const { className, children, ...rest } = props;
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
