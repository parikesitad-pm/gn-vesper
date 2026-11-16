import type { KnowledgeAnswer } from "@/lib/rag/types";
import type { Language } from "@/lib/intent/types";
import "./AnswerOrigin.css";

export function AnswerOrigin({ answer, language }: { answer: KnowledgeAnswer; language: Language }) {
  const local = answer.provider === "local";
  const label = language === "id" ? "Dijawab oleh" : "Answered by";
  const mode = language === "id"
    ? { identity: "Fakta identitas lokal", extractive: "Kutipan sumber publik", unsupported: "Jawaban tidak tersedia", grounded: "Jawaban berbasis sumber" }
    : { identity: "Local identity facts", extractive: "Public source excerpt", unsupported: "Answer unavailable", grounded: "Source-grounded answer" };
  return <p className="answer-origin"><span>{label}</span> <strong>{local ? (language === "id" ? "Vesper lokal · tanpa model AI" : "Local Vesper · no AI model") : `${answer.provider} / ${answer.model}`}</strong><span>{mode[answer.mode]}</span></p>;
}
