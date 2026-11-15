/**
 * Public source pills for an answer. Every entry comes from a real public URL that the answer layer already
 * validated; this component never builds or guesses a link.
 */
import type { Source } from "@/lib/rag/types";
import "./SourceList.css";

export function SourceList({ sources, label }: { sources: Source[]; label: string }) {
  if (sources.length === 0) return null;

  return (
    <div className="source-list">
      <span className="source-list-label">{label}</span>
      {sources.map((source) => (
        <a
          key={source.url}
          className="source-link"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {source.title}
        </a>
      ))}
    </div>
  );
}
