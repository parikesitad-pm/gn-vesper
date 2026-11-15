"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/atoms/Chip";
import type { FaceState } from "@/components/atoms/VesperFace";
import { CreatorCard } from "@/components/molecules/CreatorCard";
import { Inspector } from "@/components/organisms/inspector/Inspector";
import { Notch, type NotchState } from "@/components/organisms/notch/Notch";
import { execute, type ActionContext, type Execution } from "@/lib/actions/registry";
import { COPY, type Copy } from "@/lib/copy";
import { remoteClassifier } from "@/lib/intent/classifier";
import { resolve } from "@/lib/intent/pipeline";
import type { Destination, Language, Theme, Trace } from "@/lib/intent/types";
import { askVesper, KnowledgeClientError } from "@/lib/knowledge/client";
import type { KnowledgeAnswer } from "@/lib/rag/types";
import { CREATOR } from "@/lib/rag/sources";
import "./Playground.css";

const COMMANDS: Record<Language, string[]> = {
  en: ["Make it neon", "Switch to Indonesian", "Pause the motion", "Show the architecture", "Open the creator's website", "Show me what you can do"],
  id: ["Buat neon", "Ganti ke bahasa Inggris", "Jeda animasi", "Tampilkan arsitektur", "Buka website dap_", "Tampilkan apa yang bisa kamu lakukan"],
};

const QUESTIONS: Record<Language, string[]> = {
  en: ["Who are you?", "Who created Vesper?", "Who is Owl?", "What are dap_'s skills?", "Where is dap_ based?"],
  id: ["Siapa kamu?", "Siapa pembuat Vesper?", "Siapa Owl?", "Apa keahlian dap_?", "Di mana dap_ tinggal?"],
};

type Section = "playground" | "architecture" | "feedback";

/** Smallest coherent context-aware suggestion set: commands near the playground, questions near feedback. */
function examplesFor(language: Language, section: Section): string[] {
  const commands = COMMANDS[language];
  const questions = QUESTIONS[language];
  if (section === "architecture") return [...commands.slice(0, 4), questions[0]!, questions[2]!];
  if (section === "feedback") return [...questions, ...commands.slice(0, 2)];
  return [...commands.slice(0, 3), ...questions.slice(0, 3)];
}

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
    case "creator":
      return copy.status.creator;
    case "creator.blocked":
      return copy.status.creatorBlocked;
    case "handoff":
      return copy.status.handoff;
    default:
      return copy.status.error;
  }
}

/** Merge the answer route's measured facts into the pipeline's trace without inventing anything. */
function withKnowledge(trace: Trace, knowledge: KnowledgeAnswer): Trace {
  const measured = knowledge.provider !== "local" || knowledge.latencyMs > 0;
  return {
    ...trace,
    kind: "know",
    status: "answer",
    provider: knowledge.provider,
    model: knowledge.model,
    latencyMs: measured ? knowledge.latencyMs : undefined,
    attempts: knowledge.attempts.length > 0 ? knowledge.attempts : undefined,
    sources: knowledge.sources,
    retrieval: knowledge.retrieval,
    knowledgeMode: knowledge.mode,
    outcome: `Knowledge answer via ${knowledge.provider}/${knowledge.model} (${knowledge.mode}).`,
  };
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
  const [knowledge, setKnowledge] = useState<KnowledgeAnswer | null>(null);
  const [section, setSection] = useState<Section>("playground");

  const copy = COPY[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const navStack = useRef<Destination[]>([]);
  const askAbort = useRef<AbortController | null>(null);

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
      openCreator: () => {
        // Fixed allow-listed URL only. `noopener` is set after open so popup-block detection stays accurate.
        const win = window.open(CREATOR.url, "_blank");
        if (!win) return false;
        try {
          win.opener = null;
        } catch {
          // cross-origin window: nothing else to do
        }
        return true;
      },
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

  // Abort an in-flight creator answer when the page goes away: one request, one answer, no history.
  useEffect(() => () => askAbort.current?.abort(), []);

  // Section-aware chips. The observer only changes suggestions; it never opens or closes the notch.
  useEffect(() => {
    const ids: Section[] = ["playground", "architecture", "feedback"];
    const nodes = ids.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.id as Section | undefined;
        if (id && ids.includes(id)) setSection(id);
      },
      { rootMargin: "-24% 0px -55% 0px", threshold: [0, 0.25, 0.6] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const run = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      askAbort.current?.abort();
      setInput("");
      setBusy(true);
      setExec(null);
      setKnowledge(null);
      setTrace(null);

      const { trace: nextTrace, intent, knowledge: request } = await resolve(line, {
        aiAvailable,
        classifier: aiAvailable ? remoteClassifier : undefined,
      });

      if (request) {
        // Read-only knowledge path: the pipeline never executes retrieved text.
        setTrace(nextTrace);
        const controller = new AbortController();
        askAbort.current = controller;
        try {
          const answer = await askVesper(request.question, controller.signal);
          setKnowledge(answer);
          setTrace(withKnowledge(nextTrace, answer));
        } catch (err) {
          if (controller.signal.aborted) return;
          const attempts = err instanceof KnowledgeClientError ? err.attempts : undefined;
          setTrace({
            ...nextTrace,
            status: "error",
            attempts,
            outcome: err instanceof Error ? err.message : "answer-failed",
          });
        } finally {
          if (!controller.signal.aborted) setBusy(false);
        }
        return;
      }

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
    : knowledge
      ? "answer"
      : exec || trace
        ? exec?.key === "back.none"
          ? "help"
          : trace?.status === "handoff"
            ? "handoff"
            : trace?.status === "error"
              ? "error"
              : trace?.status === "uncertain"
                ? "help"
                : trace?.status === "answer"
                  ? "answer"
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
    : knowledge
      ? knowledge.answer
      : exec
        ? execText(exec, copy)
        : trace
          ? trace.status === "handoff"
            ? copy.status.handoff
            : trace.status === "error"
              ? copy.knowledge.error
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
        examples={examplesFor(language, section)}
        onExample={run}
        copy={copy}
        inputRef={inputRef}
        busy={busy}
        knowledge={knowledge}
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
            {examplesFor(language, section).map((ex) => (
              <Chip key={ex} onClick={() => run(ex)}>
                {ex}
              </Chip>
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

        <footer className="wrap foot">
          <p>{copy.footer}</p>
          <CreatorCard copy={copy} />
        </footer>
      </main>
    </>
  );
}
