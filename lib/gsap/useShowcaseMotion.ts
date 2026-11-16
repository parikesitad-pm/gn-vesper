import type { RefObject } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "./runtime";

export function useShowcaseMotion(root: RefObject<HTMLDivElement | null>, enabled: boolean, language: string) {
  useGSAP(() => {
    if (!enabled) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ autoRaf: false, duration: 0.85, anchors: true });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);

      gsap.timeline({ defaults: { ease: "expo.out", duration: 0.7 } })
        .from(".hero-title-line > span", { yPercent: 105, stagger: 0.07 })
        .from(".hero-intro, .hero-actions", { opacity: 0, y: 12, stagger: 0.06 }, "-=0.4")
        .from(".vessel-stage", { opacity: 0, scale: 0.94 }, "<")
        .from(".hero-bottom", { opacity: 0 }, "-=0.25");

      const progress = root.current?.querySelector(".reading-progress");
      if (progress) gsap.fromTo(progress, { scaleX: 0 }, {
        scaleX: 1, ease: "none", transformOrigin: "left",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.3 },
      });

      root.current?.querySelectorAll<HTMLElement>(".pipeline-step").forEach((step) => {
        gsap.from(step.querySelector(".pipeline-node"), {
          scale: 0.8, duration: 0.4, ease: "expo.out",
          scrollTrigger: { trigger: step, start: "top 78%", toggleActions: "play none none reverse" },
        });
        gsap.fromTo(step.querySelector(".pipeline-track-fill"), { scaleY: 0 }, {
          scaleY: 1, transformOrigin: "top", ease: "none",
          scrollTrigger: { trigger: step, start: "top 75%", end: "bottom 50%", scrub: 0.5 },
        });
      });
      gsap.fromTo(".footer-word", { xPercent: -5 }, {
        xPercent: 3, ease: "none",
        scrollTrigger: { trigger: ".site-footer", start: "top bottom", end: "bottom bottom", scrub: 0.8 },
      });
      const refresh = () => ScrollTrigger.refresh();
      document.fonts.ready.then(refresh);
      return () => { gsap.ticker.remove(tick); lenis.destroy(); };
    });
    return () => media.revert();
  }, { scope: root, dependencies: [enabled, language], revertOnUpdate: true });
}
