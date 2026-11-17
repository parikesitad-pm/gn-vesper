"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./VesperFace.css";

export type FaceState = "answer" | "think" | "sleep" | "oops";
const FACES: Record<FaceState, string> = {
  answer: "/vesper/vesper.svg",
  think: "/vesper/vesper-think.svg",
  sleep: "/vesper/vesper-sleep.svg",
  oops: "/vesper/vesper-oops.svg",
};

export function VesperFace({ state, size = 28, className }: { state: FaceState; size?: number; className?: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const face = state === "sleep" && engaged ? "answer" : state;
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <span ref={host} className={`vpx ${className ?? ""}`.trim()} style={{ width: size, height: size }} data-face={face} data-visible={visible} data-loading={!ready} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} aria-hidden="true">
    {(Object.keys(FACES) as FaceState[]).map(candidate => <Image key={candidate} className="vpx-img" data-active={candidate === face} src={FACES[candidate]} alt="" width={size} height={size} loading="eager" unoptimized onLoad={() => { if (candidate === face) setReady(true); }} />)}
    <span className="vpx-activity"><i /><i /><i /></span>
  </span>;
}
