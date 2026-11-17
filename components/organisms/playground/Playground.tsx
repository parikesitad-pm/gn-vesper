"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/atoms/Arrow";
import { FooterCredit } from "@/components/atoms/FooterCredit/FooterCredit";
import { Hero } from "@/components/organisms/hero/Hero";
import { CommandLab } from "@/components/organisms/command-lab/CommandLab";
import { Architecture } from "@/components/organisms/architecture/Architecture";
import { Inspector } from "@/components/organisms/inspector/Inspector";
import { Notch } from "@/components/organisms/notch/Notch";
import { SHOWCASE } from "@/data/showcase";
import { useVesper } from "@/hooks/useVesper";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useShowcaseMotion } from "@/lib/gsap/useShowcaseMotion";
import "./Playground.css";

export function Playground({ aiAvailable, year }: { aiAvailable: boolean; year: number }) {
  const root = useRef<HTMLDivElement>(null);
  const vesper = useVesper(aiAvailable);
  const [hoverPreview, setHoverPreview] = useState(false);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setHoverPreview(false); };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);
  const reduce = useReducedMotion();
  const motion = vesper.motionOn && !reduce;
  const text = SHOWCASE[vesper.language];
  useShowcaseMotion(root, motion, vesper.language);

  return <div ref={root} className="showcase">
    <div className="signal-background" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span className="signal-lane" key={i} style={{ left: `${8 + i * 17}%`, top: `${(i % 3) * 24 - 20}%` }}><i /></span>)}</div>
    <a href="#command-input" className="skip-link">Skip to command input</a>
    <div className="reading-progress" aria-hidden="true" />
    <header className="site-header wrap">
      <a className="wordmark" href="#home" aria-label="Vesper home"><span className="wordmark-symbol" aria-hidden="true">v<span>.</span></span><span>vesper<span className="wordmark-id">GN-013</span></span></a>
      <nav className="site-nav" aria-label="Main navigation"><a href="#playground">{text.nav[0]}</a><a href="#architecture">{text.nav[1]}</a></nav>
      <div className="header-controls"><Link className="docs-link" href="/docs">Docs</Link><button className="language-switch" onClick={() => vesper.setLanguage(vesper.language === "en" ? "id" : "en")} aria-label={text.language}>{vesper.language.toUpperCase()}<span>↗</span></button><button className="motion-switch" onClick={() => vesper.setMotionOn(!vesper.motionOn)} aria-label={motion ? text.pause : text.resume} aria-pressed={!motion} disabled={reduce}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{motion ? <path d="M5 3v10M11 3v10" /> : <path d="m5 3 7 5-7 5Z" />}</svg></button></div>
    </header>
    <Notch controls={vesper} language={vesper.language} open={vesper.open || hoverPreview} onHover={setHoverPreview} state={vesper.state} face={hoverPreview && vesper.face === "sleep" ? "answer" : vesper.face} statusText={vesper.statusText} input={vesper.input} onInput={vesper.setInput} onSubmit={vesper.run} onOpen={vesper.openNotch} onClose={() => { setHoverPreview(false); vesper.setOpen(false); }} examples={vesper.section === "architecture" ? [text.actions[0], text.actions[2], text.questions[2]] : vesper.section === "feedback" ? [text.actions[4], text.questions[1], text.questions[3]] : [...text.actions.slice(0, 3), ...text.questions.slice(0, 3)]} onExample={(value) => { vesper.openNotch(); void vesper.run(value); }} copy={vesper.copy} inputRef={vesper.inputRef} busy={vesper.busy} knowledge={vesper.knowledge} />
    <main className="page wrap">
      <Hero text={text} onOpen={vesper.openNotch} onHover={setHoverPreview} motion={motion} theme={vesper.theme} aiAvailable={aiAvailable} />
      <CommandLab controls={vesper} language={vesper.language} text={text} busy={vesper.busy} run={vesper.run} status={vesper.statusText} knowledge={vesper.knowledge} trace={vesper.trace} face={vesper.face} theme={vesper.theme} setTheme={vesper.setTheme} />
      <Architecture text={text} copy={vesper.copy} />
      <section id="inspector" className="observatory section-space"><span className="section-index">03 / OBSERVATORY</span><Inspector trace={vesper.trace} copy={vesper.copy} aiAvailable={aiAvailable} /></section>
      <section id="feedback" className="feedback section-space"><div><span className="section-index">04 / OPEN PROCESS</span><h2>{text.endTitle.split("\n").map((line, i) => <span key={i}>{line}</span>)}</h2></div><div><p>{text.endBody}</p><a className="text-link" href="https://github.com/parikesitad-pm/gn-vesper/issues" target="_blank" rel="noopener noreferrer">{text.feedback}<Arrow diagonal /></a></div></section>
    </main>
    <footer className="site-footer wrap"><div className="footer-top"><FooterCredit year={year} /><a className="text-link" href="https://github.com/parikesitad-pm/gn-vesper" target="_blank" rel="noopener noreferrer">{text.source}<Arrow diagonal /></a></div><div className="footer-word" aria-hidden="true">vesper<span>.</span></div><div className="footer-bottom"><span>GN-013 / VESPER</span><span>ONE LINE. ONE INTENT.</span><a href="#home">BACK TO TOP ↑</a></div></footer>
  </div>;
}
