"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FaceState } from "@/components/atoms/VesperFace";
import { type NotchState } from "@/components/organisms/notch/Notch";
import { execute, type ActionContext, type Execution } from "@/lib/actions/registry";
import { COPY, type Copy } from "@/lib/copy";
import { remoteClassifier } from "@/lib/intent/classifier";
import { resolve } from "@/lib/intent/pipeline";
import type { Destination, Language, Theme, Trace } from "@/lib/intent/types";
import { askVesper, KnowledgeClientError } from "@/lib/knowledge/client";
import type { KnowledgeAnswer } from "@/lib/rag/types";
import { CREATOR } from "@/lib/rag/sources";

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

export function useVesper(aiAvailable: boolean) {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [motionOn, setMotionOn] = useState(true);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [exec, setExec] = useState<Execution | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeAnswer | null>(null);
  const [section, setSection] = useState<"playground" | "architecture" | "feedback">("playground");

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
      document.getElementById(dest)?.scrollIntoView({ behavior: motionOn && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto", block: "start" });
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
    const previous = restoreRef.current;
    if (!previous) return;
    if (previous.isConnected && previous !== document.body) previous.focus();
    else document.querySelector<HTMLButtonElement>(".notch-open")?.focus();
  }, [open]);

  // Abort an in-flight creator answer when the page goes away: one request, one answer, no history.
  useEffect(() => () => askAbort.current?.abort(), []);

  // Section-aware chips. The observer only changes suggestions; it never opens or closes the notch.
  useEffect(() => {
    const ids: ("playground" | "architecture" | "feedback")[] = ["playground", "architecture", "feedback"];
    const nodes = ids.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.id as "playground" | "architecture" | "feedback" | undefined;
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
      const controller = new AbortController();
      askAbort.current = controller;
      setInput("");
      setBusy(true);
      setExec(null);
      setKnowledge(null);
      setTrace(null);

      const { trace: nextTrace, intent, knowledge: request } = await resolve(line, {
        aiAvailable,
        classifier: aiAvailable ? (value) => remoteClassifier(value, controller.signal) : undefined,
      });

      if (controller.signal.aborted) return;

      if (request) {
        // Read-only knowledge path: the pipeline never executes retrieved text.
        setTrace(nextTrace);
        try {
          const answer = await askVesper(request.question, controller.signal);
          if (controller.signal.aborted) return;
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

  return { language, setLanguage, theme, setTheme, motionOn, setMotionOn, open, setOpen, input, setInput, busy, trace, knowledge, section, copy, inputRef, run, openNotch, state, face, statusText };
}
