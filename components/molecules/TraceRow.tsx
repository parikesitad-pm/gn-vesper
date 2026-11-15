/**
 * One labelled fact in the inspector. It renders only the value it is given; it has no way to fetch, infer or
 * embellish anything.
 */
import type { ReactNode } from "react";
import "./TraceRow.css";

export function TraceRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="trace-row">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
  );
}
