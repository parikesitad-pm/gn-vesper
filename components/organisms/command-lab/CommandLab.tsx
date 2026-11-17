"use client";

import { type KeyboardEvent, useState } from "react";
import { Arrow } from "@/components/atoms/Arrow";
import { VesperFace, type FaceState } from "@/components/atoms/VesperFace";
import { RequestControls, type RequestControlsProps } from "@/components/molecules/RequestControls";
import { AnswerOrigin } from "@/components/molecules/answer-origin/AnswerOrigin";
import { SourceList } from "@/components/molecules/SourceList";
import type { ShowcaseCopy } from "@/data/showcase";
import type { KnowledgeAnswer } from "@/lib/rag/types";
import type { Theme, Trace } from "@/lib/intent/types";
import "./CommandLab.css";

export function CommandLab({ controls, text, language, busy, run, status, knowledge, trace, face, theme, setTheme }: {
  controls: RequestControlsProps; text: ShowcaseCopy; language: import("@/lib/intent/types").Language; busy: boolean; run: (input: string) => Promise<void>; status: string;
  knowledge: KnowledgeAnswer | null; trace: Trace | null; face: FaceState; theme: Theme; setTheme: (theme: Theme) => void;
}) {
  const [tab, setTab] = useState<"act" | "know">("act");
  const [draft, setDraft] = useState("");
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "act" : event.key === "End" ? "know" : tab === "act" ? "know" : "act";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  const phrases = tab === "act" ? text.actions : text.questions;
  return <section id="playground" className="command-lab section-space">
    <div className="section-heading"><span className="section-index">01 / PLAYGROUND</span><h2>{text.labTitle}</h2><p>{text.labIntro}</p></div>
    <div className="console-shell">
      <div className="console-toolbar"><span className="console-file"><span className="status-dot" />vesper.intent</span><span className="console-mode">ACT / KNOW</span></div>
      <div className="console-body">
        <div className="console-workspace">
          <div className="console-tabs" role="tablist" aria-label="Intent mode">
            <button onKeyDown={onTabKey} role="tab" id="tab-act" tabIndex={tab === "act" ? 0 : -1} aria-selected={tab === "act"} aria-controls="intent-panel" onClick={() => setTab("act")}><span>ACT</span>{text.act}</button>
            <button onKeyDown={onTabKey} role="tab" id="tab-know" tabIndex={tab === "know" ? 0 : -1} aria-selected={tab === "know"} aria-controls="intent-panel" onClick={() => setTab("know")}><span>KNOW</span>{text.know}</button>
          </div>
          <div id="intent-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            <form className="console-form" onSubmit={(event) => { event.preventDefault(); if (!busy && draft.trim()) { void run(draft); setDraft(""); } }}>
              <span className="console-prompt" aria-hidden="true">$</span>
              <input id="command-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={200} aria-label={text.input} placeholder={tab === "act" ? text.placeholder : text.questionPlaceholder} autoComplete="off" />
              <button type="submit" disabled={busy || !draft.trim()} aria-label={tab === "act" ? text.run : text.ask}><Arrow /></button>
            </form>
            <div className="console-suggestions">{phrases.map((phrase) => <button disabled={busy} key={phrase} onClick={() => void run(phrase)}>{phrase}<Arrow diagonal /></button>)}</div>
          </div>
        </div>
        <div className="console-output" aria-busy={busy}>
          <div className="output-header"><span>OUTPUT</span><span>{busy ? "RUNNING" : trace ? trace.kind?.toUpperCase() ?? "ACT" : "IDLE"}</span></div>
          <VesperFace state={face} size={48} />
          <div role="status" aria-live="polite" className="output-text"><p>{status || text.empty}</p>{!status && <span>{text.emptyDetail}</span>}</div>
          <RequestControls {...controls} />
          {knowledge && <AnswerOrigin answer={knowledge} language={language} />}
          {knowledge && <SourceList sources={knowledge.sources} label="Sources" />}
          {trace && <a className="output-inspect" href="#inspector">{text.nav[2]}<Arrow diagonal /></a>}
        </div>
      </div>
      <div className="console-status"><span>{text.current}</span><div className="theme-options" role="group" aria-label={text.theme}>{(["dark", "light", "neon"] as const).map((option) => <button key={option} data-theme-option={option} aria-pressed={theme === option} onClick={() => setTheme(option)}><span />{option === "dark" ? "Dracula" : option}</button>)}</div><span className="console-language">EN / ID</span></div>
    </div>
  </section>;
}
