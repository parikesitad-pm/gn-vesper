"use client";

import { type RefObject } from "react";
import { Chip } from "@/components/atoms/Chip";
import { VesperFace, type FaceState } from "@/components/atoms/VesperFace";
import { CreatorCard } from "@/components/molecules/CreatorCard";
import { SourceList } from "@/components/molecules/SourceList";
import type { Copy } from "@/lib/copy";
import type { KnowledgeAnswer } from "@/lib/rag/types";
import "./Notch.css";

/** The visual state the notch is in. Drives the border, the face and what the tray shows. */
export type NotchState = "idle" | "input" | "thinking" | "result" | "answer" | "help" | "handoff" | "error";

export type NotchProps = {
  open: boolean;
  state: NotchState;
  face: FaceState;
  /** The line shown in the row at rest and in the tray while open. */
  statusText: string;
  input: string;
  onInput: (value: string) => void;
  onSubmit: (value: string) => void;
  onOpen: () => void;
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
  open,
  state,
  face,
  statusText,
  input,
  onInput,
  onSubmit,
  onOpen,
  onClose,
  examples,
  onExample,
  copy,
  inputRef,
  busy,
  knowledge,
}: NotchProps) {
  const answering = !!knowledge && state === "answer";

  return (
    <div className="notch" data-open={open} data-state={state} data-face={face}>
      <div className="notch-main">
        <span className="notch-face">
          <VesperFace state={face} />
        </span>

        {open ? (
          <form
            className="notch-form"
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
          <button type="button" className="notch-open" onClick={onOpen} aria-expanded={false}>
            <span>{statusText || copy.notchHint}</span>
            <kbd className="notch-kbd">{copy.shortcut}</kbd>
          </button>
        )}

        {open && (
          <button type="button" className="notch-x" onClick={onClose} aria-label={copy.close}>
            &times;
          </button>
        )}
      </div>

      <div className="notch-tray">
        <div className="notch-tray-in">
          <div className="notch-tray-body">
            {answering ? (
              <div className="notch-know">
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

            <span className="notch-tray-label">{copy.examplesLabel}</span>
            {examples.map((ex) => (
              <Chip key={ex} onClick={() => onExample(ex)}>
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
