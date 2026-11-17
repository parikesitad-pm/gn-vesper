import { Chip } from "@/components/atoms/Chip";
import type { Language } from "@/lib/intent/types";

export type RequestControlsProps = { busy: boolean; canRetry: boolean; canUndo: boolean; cancel: () => void; retry: () => void; undo: () => void; language: Language };
export function RequestControls({ busy, canRetry, canUndo, cancel, retry, undo, language }: RequestControlsProps) {
  return <div className="request-controls">
    {busy && <Chip onClick={cancel}>{language === "id" ? "Batalkan" : "Cancel"}</Chip>}
    {!busy && canRetry && <Chip onClick={retry}>{language === "id" ? "Coba lagi" : "Retry"}</Chip>}
    {!busy && canUndo && <Chip onClick={undo}>{language === "id" ? "Urungkan aksi" : "Undo action"}</Chip>}
  </div>;
}
