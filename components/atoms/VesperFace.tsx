/**
 * Vesper's approved pixel faces, rendered from `public/vesper/`.
 *
 * All four are stacked in one fixed-size box and crossfaded, so switching state never changes layout and the
 * browser never waits for an image mid-transition. The face is decorative: the notch's `aria-live` region is
 * what announces state. Motion is disabled by the global `[data-motion="off"]` and reduced-motion rules.
 */
import Image from "next/image";
import "./VesperFace.css";

export type FaceState = "answer" | "think" | "sleep" | "oops";

const FACES: Record<FaceState, { src: string; label: string }> = {
  answer: { src: "/vesper/vesper.svg", label: "Vesper, awake" },
  think: { src: "/vesper/vesper-think.svg", label: "Vesper, thinking" },
  sleep: { src: "/vesper/vesper-sleep.svg", label: "Vesper, asleep" },
  oops: { src: "/vesper/vesper-oops.svg", label: "Vesper, something went wrong" },
};

export function VesperFace({ state, size = 28, className }: { state: FaceState; size?: number; className?: string }) {
  return (
    <span className={`vpx ${className ?? ""}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      {(Object.keys(FACES) as FaceState[]).map((face) => (
        <Image
          key={face}
          className="vpx-img"
          data-active={face === state}
          src={FACES[face].src}
          alt=""
          width={size}
          height={size}
          loading="eager"
          unoptimized
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{FACES[state].label}</span>
    </span>
  );
}
