"use client";

import dynamic from "next/dynamic";
import { Arrow } from "@/components/atoms/Arrow";
import { VesperFace } from "@/components/atoms/VesperFace";
import type { ShowcaseCopy } from "@/data/showcase";
import type { Theme } from "@/lib/intent/types";
import "./Hero.css";

const Vessel = dynamic(() => import("@/components/organisms/vessel/Vessel"), { ssr: false });

export function Hero({ text, onOpen, onHover, motion, theme, aiAvailable }: {
  text: ShowcaseCopy; onOpen: () => void; onHover: (hovered: boolean) => void; motion: boolean; theme: Theme; aiAvailable: boolean;
}) {
  return <section id="home" className="hero">
    <div className="hero-copy">
      <h1>{text.title.map((line, index) => <span className="hero-title-line" key={index}><span>{line}</span></span>)}</h1>
      <p className="hero-intro">{text.intro}</p>
      <div className="hero-actions">
        <button className="btn" onClick={onOpen} onPointerEnter={(event) => { if (event.pointerType === "mouse") onHover(true); }} onPointerLeave={() => onHover(false)}>{text.open}<Arrow /></button>
        <span className="hero-shortcut"><kbd>⌘</kbd><kbd>K</kbd><span>/ Ctrl K</span></span>
      </div>
      <a className="hero-explore" href="#architecture">{text.explore}<Arrow diagonal /></a>
    </div>
    <div className="vessel-stage">
      <div className="stage-corner stage-corner-tl" aria-hidden="true" />
      <div className="stage-corner stage-corner-br" aria-hidden="true" />
      <div className="stage-meta"><span>ENTITY / GN-013</span><span>VESPER</span></div>
      <div className="vessel-grid" aria-hidden="true" />
      <button className="vessel-target" onClick={onOpen} aria-label={text.open}>
        <span className="vessel-poster" aria-hidden="true"><span className="poster-orbit" /><span className="poster-orbit secondary" /><span className="poster-core"><VesperFace state="answer" size={104} /></span></span>
        <Vessel motion={motion} theme={theme} />
      </button>
      <span className="stage-coordinate" aria-hidden="true">x 013<br />y 000<br />z 001</span>
      <div className="stage-caption"><span className="status-dot" /><span>{motion ? text.ready : text.paused}</span><span className="stage-live">{motion ? "LIVE" : "STILL"}</span></div>
      <p className="stage-hint">{text.vessel}</p>
    </div>
    <div className="hero-bottom">
      <a href="#playground" className="scroll-cue"><span className="scroll-line" />{text.scroll}<span>↓</span></a>
      <div className="hero-system"><span className="status-dot" />{aiAvailable ? text.ai : text.demo}<span className="system-separator">/</span>EN + ID</div>
    </div>
  </section>;
}
