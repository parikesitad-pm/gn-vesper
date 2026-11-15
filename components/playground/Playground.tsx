"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notch, type NotchState } from "@/components/notch/Notch";
import type { FaceState } from "@/components/notch/VesperFace";
import { execute, type ActionContext, type Execution } from "@/lib/actions/registry";
import { COPY, type Copy } from "@/lib/copy";
import { remoteClassifier } from "@/lib/intent/classifier";
import { resolve } from "@/lib/intent/pipeline";
import type { Destination, Language, Theme, Trace } from "@/lib/intent/types";
import { Inspector } from "./Inspector";
import "./Playground.css";

/** The example chips. Each one is a phrase the local rules answer, so Demo Mode shows something real. */
const EXAMPLES: Record<Language, string[]> = {
  en: ["Make it neon", "Switch to Indonesian", "Pause the motion", "Show the architecture", "Go back", "Help"],
  id: ["Buat neon", "Ganti ke bahasa Inggris", "Jeda animasi", "Tampilkan arsitektur", "Kembali", "Bantuan"],
};

/** Turns an adapter result into the line the visitor reads, in their language. */
function execText(exec: Execution, copy: Copy): string {
  switch (exec.key) {
    case "theme":
      return copy.status.theme(exec.arg as Theme);
    case "language":
      return copy.status.language(exec.arg as Language);
    case "motion.on":
      return copy.status.motionOn;
    case "motion.off":
      return copy.status.motionOff;
    case "navigate":
      return copy.status.navigate(exec.arg as Destination);
    case "back":
      return copy.status.back;
    case "back.none":
      return copy.status.backNone;
    case "help":
      return copy.status.help;
    case "handoff":
      return copy.status.handoff;
    default:
      return copy.status.error;
  }
}

export function Playground({ aiAvailable }: { aiAvailable: boolean }) {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [motionOn, setMotionOn] = useState(true);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [exec, setExec] = useState<Execution | null>(null);

  const copy = COPY[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const navStack = useRef<Destination[]>([]);

  // Theme, motion and language are the only things the actions change; they live on <html> so tokens cascade.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.motion = motionOn ? "on" : "off";
  }, [motionOn]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const scrollTo = useCallback(
    (dest: Destination) => {
      document.getElementById(dest)?.scrollIntoView({ behavior: motionOn ? "smooth" : "auto", block: "start" });
    },
    [motionOn],
  );

  const ctx: ActionContext = useMemo(
    () => ({
      setTheme,
      setLanguage,
      toggleMotion: () => {
        const next = !motionOn;
        setMotionOn(next);
        return next;
      },
      navigate: (dest) => {
        navStack.current.push(dest);
        scrollTo(dest);
      },
      back: () => {
        if (navStack.current.length < 2) return false;
        navStack.current.pop();
        scrollTo(navStack.current[navStack.current.length - 1]);
        return true;
      },
      help: () => scrollTo("playground"),
      handoff: () => {},
    }),
    [motionOn, scrollTo],
  );

  // ⌘K / Ctrl+K opens or focuses the notch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Escape closes it, and focus goes back to whatever had it before the notch opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    restoreRef.current?.focus?.();
  }, [open]);

  const run = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      setInput("");
      setBusy(true);
      setExec(null);
      setTrace(null);

      const { trace: nextTrace, intent } = await resolve(line, {
        aiAvailable,
        classifier: aiAvailable ? remoteClassifier : undefined,
      });

      setTrace(nextTrace);
      if (intent) setExec(execute(intent, ctx));
      setBusy(false);
    },
    [aiAvailable, ctx],
  );

  const openNotch = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // --- what the notch shows --------------------------------------------------------------------

  const state: NotchState = busy
    ? "thinking"
    : exec || trace
      ? exec?.key === "back.none"
        ? "help"
        : trace?.status === "handoff"
          ? "handoff"
          : trace?.status === "error"
            ? "error"
            : trace?.status === "uncertain"
              ? "help"
              : "result"
      : open
        ? "input"
        : "idle";

  const face: FaceState =
    state === "thinking" || state === "help"
      ? "think"
      : state === "error"
        ? "oops"
        : state === "idle"
          ? "sleep"
          : "answer";

  const statusText = busy
    ? copy.status.thinking
    : exec
      ? execText(exec, copy)
      : trace
        ? trace.status === "handoff"
          ? copy.status.handoff
          : trace.status === "error"
            ? copy.status.error
            : !trace.validation.ok && trace.validation.reason === "empty"
              ? copy.status.empty
              : copy.status.unsure
        : "";

  return (
    <>
      <Notch
        open={open}
        state={state}
        face={face}
        statusText={statusText}
        input={input}
        onInput={setInput}
        onSubmit={run}
        onOpen={openNotch}
        onClose={() => setOpen(false)}
        examples={EXAMPLES[language]}
        onExample={run}
        copy={copy}
        inputRef={inputRef}
        busy={busy}
      />

      <main className="page">
        <section id="playground" className="wrap hero">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="lede">{copy.lede}</p>
          <div className="hero-cta">
            <button type="button" className="btn" onClick={openNotch}>
              {copy.openCta}
            </button>
            <span className="hero-hint">
              {copy.shortcut} · {aiAvailable ? copy.aiOn : copy.aiOff}
            </span>
          </div>
        </section>

        <section className="wrap block">
          <h2>{copy.examplesTitle}</h2>
          <p className="lede">{copy.examplesLede}</p>
          <div className="example-grid">
            {EXAMPLES[language].map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => run(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </section>

        <section id="architecture" className="wrap block">
          <h2>{copy.architectureTitle}</h2>
          <p className="lede">{copy.architectureLede}</p>
          <ol className="steps">
            {copy.steps.map((s) => (
              <li key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="inspector" className="wrap block">
          <Inspector trace={trace} copy={copy} aiAvailable={aiAvailable} />
        </section>

        <section id="feedback" className="wrap block">
          <h2>{copy.feedbackTitle}</h2>
          <p className="lede">{copy.feedbackLede}</p>
          <ul className="questions">
            {copy.feedbackQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>

        <footer className="wrap foot">{copy.footer}</footer>
      </main>
    </>
  );
}
