"use client";
import { useEffect, useState } from "react";
import { Notch } from "@/components/organisms/notch/Notch";
import { useVesper } from "@/hooks/useVesper";
export function WatcherIsland({ aiAvailable }: { aiAvailable: boolean }) {
  const vesper = useVesper(aiAvailable);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setHover(false); };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);
  return <Notch controls={vesper} language={vesper.language} open={vesper.open || hover} onHover={setHover} state={vesper.state} face={hover && vesper.face === "sleep" ? "answer" : vesper.face} statusText={vesper.statusText} input={vesper.input} onInput={vesper.setInput} onSubmit={vesper.run} onOpen={vesper.openNotch} onClose={() => { setHover(false); vesper.setOpen(false); }} examples={vesper.language === "id" ? ["Buat neon", "Siapa kamu?"] : ["Make it neon", "Who are you?"]} onExample={value => { vesper.openNotch(); void vesper.run(value); }} copy={vesper.copy} inputRef={vesper.inputRef} busy={vesper.busy} knowledge={vesper.knowledge} />;
}
