"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap/runtime";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRepositories } from "@/hooks/useRepositories";
import { RepoIsland } from "@/components/molecules/repo-island/RepoIsland";
import { Chip } from "@/components/atoms/Chip";
import { VesperFace, type FaceState } from "@/components/atoms/VesperFace";
import { CreatorCard } from "@/components/molecules/CreatorCard";
import { RequestControls, type RequestControlsProps } from "@/components/molecules/RequestControls";
import { AnswerOrigin } from "@/components/molecules/answer-origin/AnswerOrigin";
import { SourceList } from "@/components/molecules/SourceList";
import type { Copy } from "@/lib/copy";
import type { KnowledgeAnswer } from "@/lib/rag/types";
import "./Notch.css";

/** The visual state the notch is in. Drives the border, the face and what the tray shows. */
export type NotchState = "idle" | "input" | "thinking" | "result" | "answer" | "help" | "handoff" | "error";

export type NotchProps = {
  controls: RequestControlsProps;
  open: boolean;
  language: import("@/lib/intent/types").Language;
  state: NotchState;
  face: FaceState;
  /** The line shown in the row at rest and in the tray while open. */
  statusText: string;
  input: string;
  onInput: (value: string) => void;
  onSubmit: (value: string) => void;
  onOpen: () => void;
  onHover: (hovered: boolean) => void;
  onClose: () => void;
  examples: string[];
  onExample: (value: string) => void;
  copy: Copy;
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  /** The latest grounded creator answer. One at a time: no conversation history. */
  knowledge?: KnowledgeAnswer | null;
};

export function Notch({
  controls,
  open,
  language,
  state,
  face,
  statusText,
  input,
  onInput,
  onSubmit,
  onOpen,
  onHover,
  onClose,
  examples,
  onExample,
  copy,
  inputRef,
  busy,
  knowledge,
}: NotchProps) {
  const { unread } = useRepositories();
  const answering = !!knowledge && state === "answer";
  const shell = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !shell.current?.contains(target) && !target.closest(".hero-actions .btn, .vessel-target")) onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onClose]);
  useLayoutEffect(() => {
    const element = shell.current;
    if (!element) return;
    let observer: ResizeObserver;
    const context = gsap.context(() => {
      const material = element.querySelector(".notch-material");
      const content = element.querySelectorAll(".notch-face, .notch-form, .notch-tray");
      const duration = reduce || document.documentElement.dataset.motion === "off" ? 0 : open ? 0.32 : 0.22;
      const draw = (width: number, height: number) => {
        gsap.to(material, { scaleX: open ? 1 : 48 / width, scaleY: open ? 1 : 48 / height, opacity: open ? 1 : 0, duration, ease: "expo.out", overwrite: true });
      };
      gsap.to(content, { opacity: open ? 1 : 0, y: open ? 0 : -5, duration: duration * 0.7, delay: open ? 0.08 : 0, ease: "expo.out", overwrite: true });
      observer = new ResizeObserver(([entry]) => draw(entry.contentRect.width, entry.contentRect.height));
      observer.observe(element);
    }, shell);
    return () => {
      observer?.disconnect();
      // Preserve current transforms so interrupted transitions continue from their visible position.
      context.kill(false);
    };
  }, [open, reduce]);

  return (
    <div ref={shell} className="notch" onPointerEnter={(event) => { if (event.pointerType === "mouse") onHover(true); }} onPointerLeave={() => onHover(false)} data-open={open} data-state={state} data-face={face}>
      <div className="notch-material" aria-hidden="true" />
      <div className="notch-main">
        <span className="notch-face" inert={!open}>
          <VesperFace state={face} />
        </span>


          <form
            className="notch-form" inert={!open}
            onPointerDown={onOpen}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(input);
            }}
          >
            <span className="notch-prompt" aria-hidden="true">
              &#8250;
            </span>
            <input
              ref={inputRef}
              className="notch-input"
              name="q"
              type="text"
              value={input}
              onFocus={onOpen}
              onChange={(e) => onInput(e.target.value)}
              placeholder={language === "id" ? "Tanya atau perintah…" : "Ask or command…"}
              aria-label={copy.notchHint}
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              enterKeyHint="send"
            />
            <Chip type="submit" aria-label={copy.run} disabled={busy || input.trim().length === 0}>
              {copy.run}
            </Chip>
          </form>
          <button type="button" className="notch-open" inert={open} onClick={onOpen} aria-expanded={open} aria-controls="vesper-tray" aria-label={copy.notchHint} title={`${copy.notchHint} · ${copy.shortcut}`}>
            <VesperFace state={face} size={36} />
            {unread > 0 && <span className="notch-unread" aria-label={`${unread} unread repository updates`}>{unread > 9 ? "9+" : unread}</span>}
          </button>
        <button type="button" className="notch-dismiss" inert={!open} onClick={onClose} aria-label={copy.close}><kbd>esc</kbd></button>
      </div>

      <div id="vesper-tray" className="notch-tray" data-lenis-prevent="" inert={!open}>
        <div className="notch-tray-in">
          <div className="notch-tray-body"><RepoIsland language={language}>
            {answering ? (
              <div className="notch-know">
                <AnswerOrigin answer={knowledge} language={language} />
                <p className="notch-answer">{knowledge.answer}</p>
                <SourceList sources={knowledge.sources} label={copy.knowledge.sources} />
                <CreatorCard copy={copy} compact />
              </div>
            ) : (
              statusText &&
              state !== "idle" &&
              state !== "input" && (
                <p className="notch-tray-out" data-state={state}>
                  {statusText}
                </p>
              )
            )}

            <RequestControls {...controls} />
            <span className="notch-tray-label">{copy.examplesLabel}</span>
            {examples.map((ex) => (
              <Chip key={ex} disabled={busy} onClick={() => onExample(ex)}>
                {ex}
              </Chip>
            ))}
          </RepoIsland></div>
        </div>
      </div>

      {/* One polite live region for screen readers; the visible text above is decorative. */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusText}
      </div>
    </div>
  );
}
