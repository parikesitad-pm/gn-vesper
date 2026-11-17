"use client";

import { type RefObject, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/runtime";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
  const answering = !!knowledge && state === "answer";
  const shell = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useGSAP(() => {
    if (!open || reduce || document.documentElement.dataset.motion === "off") return;
    gsap.from(".notch-form, .notch-x, .notch-tray-body", { opacity: 0, y: -6, duration: 0.22, stagger: 0.025, ease: "expo.out" });
  }, { scope: shell, dependencies: [open, reduce], revertOnUpdate: true });

  return (
    <div ref={shell} className="notch" onPointerEnter={(event) => { if (event.pointerType === "mouse") onHover(true); }} onPointerLeave={() => onHover(false)} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} data-open={open} data-state={state} data-face={face}>
      <div className="notch-main">
        {open && <span className="notch-face">
          <VesperFace state={face} />
        </span>}

        {open ? (
          <form
            className="notch-form"
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
              placeholder={copy.placeholder}
              aria-label={copy.notchHint}
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              enterKeyHint="send"
            />
            <Chip type="submit" disabled={busy || input.trim().length === 0}>
              {copy.run}
            </Chip>
          </form>
        ) : (
          <button type="button" className="notch-open" onClick={onOpen} aria-expanded={false} aria-controls="vesper-tray" aria-label={copy.notchHint} title={`${copy.notchHint} · ${copy.shortcut}`}>
            <VesperFace state={face} size={36} />
          </button>
        )}

        {open && (
          <button type="button" className="notch-x" onClick={onClose} aria-label={copy.close}>
            &times;
          </button>
        )}
      </div>

      <div id="vesper-tray" className="notch-tray" inert={!open}>
        <div className="notch-tray-in">
          <div className="notch-tray-body">
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
          </div>
        </div>
      </div>

      {/* One polite live region for screen readers; the visible text above is decorative. */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusText}
      </div>
    </div>
  );
}
