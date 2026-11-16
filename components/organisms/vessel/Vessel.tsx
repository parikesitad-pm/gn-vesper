"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Theme } from "@/lib/intent/types";
import { gsap, ScrollTrigger } from "@/lib/gsap/runtime";
import { createVessel } from "@/lib/three/createVessel";

export default function Vessel({ motion, theme }: { motion: boolean; theme: Theme }) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useRef({ motion, theme });
  useEffect(() => { settings.current = { motion, theme }; }, [motion, theme]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    element.appendChild(renderer.domElement);
    let dirty = true;
    const vessel = createVessel(() => { dirty = true; });
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0, 9.7);
    const pointer = { x: 0, y: 0 };
    const scroll = { progress: 0 };
    let visible = true;
    let lost = false;
    let elapsed = 0;
    let lastTheme: Theme | null = null;
    let lastMotion = true;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.render(vessel.scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(element);
    const move = (event: PointerEvent) => {
      if (!settings.current.motion || event.pointerType === "touch") return;
      const rect = element.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.65;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; renderer.domElement.dataset.ready = "false"; };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const context = gsap.context(() => {
      ScrollTrigger.create({ trigger: element.closest(".hero"), start: "top top", end: "bottom top", onUpdate: (self) => { scroll.progress = self.progress; } });
    }, element);
    const tick = (_time: number, deltaMs: number) => {
      if (lost || !visible || document.hidden) return;
      const current = settings.current;
      const changed = current.theme !== lastTheme;
      if (changed) {
        vessel.accent.color.set(current.theme === "neon" ? "#ff3038" : "#ff5555");
        vessel.accent.emissive.set(current.theme === "neon" ? "#ff3038" : "#ff5555");
        lastTheme = current.theme;
      }
      if (!current.motion && !lastMotion && !changed && !dirty) return;
      if (current.motion) {
        const delta = Math.min(deltaMs / 1000, 0.05);
        elapsed += delta;
        const smoothing = 1 - Math.exp(-5 * delta);
        vessel.assembly.rotation.y += (pointer.x - 0.25 + scroll.progress * 0.8 - vessel.assembly.rotation.y) * smoothing;
        vessel.assembly.rotation.x += (-pointer.y - 0.22 - vessel.assembly.rotation.x) * smoothing;
        vessel.assembly.position.y = Math.sin(elapsed * 0.65) * 0.09;
        vessel.orbit.rotation.z = elapsed * 0.055;
        vessel.core.rotation.y = Math.sin(elapsed * 0.35) * 0.08;
      }
      lastMotion = current.motion;
      renderer.render(vessel.scene, camera);
      dirty = false;
      if (renderer.domElement.dataset.ready !== "true") {
        renderer.domElement.dataset.ready = "true";
        element.dataset.drawCalls = String(renderer.info.render.calls);
      }
    };
    gsap.ticker.add(tick);
    resize();
    return () => {
      gsap.ticker.remove(tick); context.revert(); observer.disconnect(); visibility.disconnect();
      element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      vessel.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className="vessel-canvas" aria-hidden="true" />;
}
