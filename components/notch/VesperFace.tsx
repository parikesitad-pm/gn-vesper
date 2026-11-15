/**
 * Vesper's face — a placeholder.
 *
 * The handover allows the original pixel faces only if Dap approves them for redistribution, which has not
 * happened. So this is clearly marked placeholder art: a small pixel owl drawn here from scratch, one grid per
 * state, rendered as crisp squares so it scales like the original. It is deliberately plain; swapping in the
 * approved assets is a one-file change (see `public/vesper/README.md`).
 */
export type FaceState = "answer" | "think" | "sleep" | "oops";

/** 12×10 pixel grids. `.` empty, `#` body, `o` eye, `p` pupil, `-` closed eye, `x` cross, `v` beak. */
const GRIDS: Record<FaceState, string[]> = {
  answer: [
    "..########..",
    ".##########.",
    "############",
    "#oo######oo#",
    "#op######po#",
    "############",
    "#####vv#####",
    ".##########.",
    "..########..",
    "....####....",
  ],
  think: [
    "..########..",
    ".##########.",
    "############",
    "#oo######oo#",
    "#--######po#",
    "############",
    "#####vv#####",
    ".##########.",
    "..########..",
    "....####....",
  ],
  sleep: [
    "..########..",
    ".##########.",
    "############",
    "############",
    "#--######--#",
    "############",
    "#####vv#####",
    ".##########.",
    "..########..",
    "....####....",
  ],
  oops: [
    "..########..",
    ".##########.",
    "############",
    "#xx######xx#",
    "#xx######xx#",
    "############",
    "####vvvv####",
    ".##########.",
    "..########..",
    "....####....",
  ],
};

const CLASS: Record<string, string> = {
  "#": "vpx-body",
  o: "vpx-eye",
  p: "vpx-pupil",
  "-": "vpx-mark",
  x: "vpx-mark",
  v: "vpx-mark",
};

export function VesperFace({ state, size = 26, className }: { state: FaceState; size?: number; className?: string }) {
  const rows = GRIDS[state];
  return (
    <svg
      className={className}
      viewBox="0 0 12 10"
      width={size}
      height={(size * 10) / 12}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className={CLASS[ch]} />,
        ),
      )}
    </svg>
  );
}
