import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-sm prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-800 mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="text-sm text-slate-700 list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="text-sm text-slate-700 list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
          code: ({ children }) => (
            <code className="font-mono text-xs bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-100">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3 rounded-lg border border-slate-200">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-slate-50/50">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-xs">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-slate-700">{children}</td>
          ),
          hr: () => <hr className="my-4 border-slate-200" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-teal-400 pl-3 my-2 text-sm text-slate-600 italic bg-teal-50/30 py-2 rounded-r">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
