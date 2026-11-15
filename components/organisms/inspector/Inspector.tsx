"use client";

import { useState } from "react";
import { TraceRow } from "@/components/molecules/TraceRow";
import type { Copy } from "@/lib/copy";
import type { Trace } from "@/lib/intent/types";
import "./Inspector.css";

/**
 * The intent inspector. It renders only what the pipeline recorded — the same `Trace` the code produced — so
 * there is nothing here that could disagree with what actually happened. No chain-of-thought, no invented
 * confidence or token counts. Latency appears only when a provider call actually happened and is labelled
 * "measured", because it is a real round-trip, not an estimate.
 */
export function Inspector({ trace, copy, aiAvailable }: { trace: Trace | null; copy: Copy; aiAvailable: boolean }) {
  const [open, setOpen] = useState(true);

  const latency = typeof trace?.latencyMs === "number" && trace.latencyMs > 0 ? trace.latencyMs : null;

  return (
    <div className="inspector">
      <div className="inspector-head">
        <h2>{copy.inspectorTitle}</h2>
        <button type="button" className="ghost-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? copy.hide : copy.inspect}
        </button>
      </div>
      <p className="lede">{copy.inspectorLede}</p>

      {open &&
        (!trace ? (
          <p className="inspector-empty">{copy.empty}</p>
        ) : (
          <dl className="trace">
            <TraceRow label={copy.fields.input} value={trace.input} mono />
            {trace.kind && <TraceRow label={copy.fields.kind} value={copy.kindLabels[trace.kind]} />}
            <TraceRow label={copy.fields.path} value={copy.pathLabels[trace.path]} />
            {trace.provider && (
              <TraceRow label={copy.fields.provider} value={`${trace.provider} · ${trace.model}`} mono />
            )}
            {latency !== null && <TraceRow label={copy.fields.latency} value={`${latency} ms (measured)`} mono />}
            {trace.rawReply && <TraceRow label="raw reply" value={trace.rawReply} mono />}
            <TraceRow
              label={copy.fields.parsed}
              value={trace.parsed ? `${trace.parsed.action || "—"}${trace.parsed.arg ? ` ${trace.parsed.arg}` : ""}` : "—"}
              mono
            />
            <TraceRow
              label={copy.fields.validation}
              value={
                trace.validation.ok
                  ? `accepted → ${trace.validation.intent.action}${trace.validation.intent.arg ? ` ${trace.validation.intent.arg}` : ""}`
                  : `rejected: ${trace.validation.reason}`
              }
              mono
            />
            {trace.adapter && <TraceRow label={copy.fields.adapter} value={trace.adapter} mono />}
            {trace.attempts && trace.attempts.length > 0 && (
              <TraceRow
                label={copy.fields.attempts}
                value={
                  <span className="trace-list">
                    {trace.attempts.map((attempt, i) => (
                      <span key={`${attempt.provider}-${i}`} className="trace-attempt" data-ok={attempt.ok}>
                        {attempt.ok ? "✓" : "✕"} {attempt.provider}/{attempt.model} · {attempt.latencyMs} ms
                        {attempt.error ? ` · ${attempt.error}` : ""}
                      </span>
                    ))}
                  </span>
                }
              />
            )}
            {trace.knowledgeMode && (
              <TraceRow label={copy.fields.mode} value={copy.modeLabels[trace.knowledgeMode]} />
            )}
            {trace.sources && trace.sources.length > 0 && (
              <TraceRow
                label={copy.fields.sources}
                value={
                  <span className="trace-list">
                    {trace.sources.map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title}
                      </a>
                    ))}
                  </span>
                }
              />
            )}
            {trace.retrieval && trace.retrieval.length > 0 && (
              <TraceRow
                label={copy.fields.retrieved}
                value={
                  <span className="trace-list">
                    {trace.retrieval.map((hit) => (
                      <span key={`${hit.heading}-${hit.url}-${hit.score}`} className="trace-hit">
                        {hit.heading} · {hit.score}
                      </span>
                    ))}
                  </span>
                }
              />
            )}
            <TraceRow label={copy.fields.outcome} value={trace.outcome} />
          </dl>
        ))}

      {!aiAvailable && <p className="inspector-note">{copy.aiOff}</p>}
    </div>
  );
}
