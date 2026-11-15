"use client";

import { useState } from "react";
import type { Copy } from "@/lib/copy";
import type { Trace } from "@/lib/intent/types";

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="trace-row">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
  );
}

/**
 * The intent inspector. It renders only what the pipeline recorded — the same `Trace` the code produced — so
 * there is nothing here that could disagree with what actually happened. No chain-of-thought, no invented
 * confidence or token counts; latency is labelled "measured" because it is a real round-trip, not an estimate.
 */
export function Inspector({ trace, copy, aiAvailable }: { trace: Trace | null; copy: Copy; aiAvailable: boolean }) {
  const [open, setOpen] = useState(true);

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
            <Row label={copy.fields.input} value={trace.input} mono />
            <Row label={copy.fields.path} value={copy.pathLabels[trace.path]} />
            {trace.provider && <Row label={copy.fields.provider} value={`${trace.provider} · ${trace.model}`} mono />}
            {typeof trace.latencyMs === "number" && (
              <Row label={copy.fields.latency} value={`${trace.latencyMs} ms (measured)`} mono />
            )}
            {trace.rawReply && <Row label="raw reply" value={trace.rawReply} mono />}
            <Row
              label={copy.fields.parsed}
              value={trace.parsed ? `${trace.parsed.action || "—"}${trace.parsed.arg ? ` ${trace.parsed.arg}` : ""}` : "—"}
              mono
            />
            <Row
              label={copy.fields.validation}
              value={
                trace.validation.ok
                  ? `accepted → ${trace.validation.intent.action}${trace.validation.intent.arg ? ` ${trace.validation.intent.arg}` : ""}`
                  : `rejected: ${trace.validation.reason}`
              }
              mono
            />
            {trace.adapter && <Row label={copy.fields.adapter} value={trace.adapter} mono />}
            <Row label={copy.fields.outcome} value={trace.outcome} />
          </dl>
        ))}

      {!aiAvailable && <p className="inspector-note">{copy.aiOff}</p>}
    </div>
  );
}
