# Vesper faces — placeholders

The faces Vesper shows in the notch (**answer**, **think**, **sleep**, **oops**) are
**placeholders**, drawn from scratch in this repository.

## Why placeholders

The original Vesper pixel faces live in a private portfolio repository and are subject to an
ownership/licensing review before redistribution. That review has **not** happened, so the original
assets are **not** included here and must not be added without the owner's explicit approval.

The placeholder faces are deliberately plain so that nobody mistakes them for the real ones. They
are defined as 12×10 pixel grids in `components/notch/VesperFace.tsx` and rendered as crisp SVG
squares, so they scale the same way the originals would.

## States

| State | Used when |
| --- | --- |
| `answer` | The notch is open and showing an input or a result |
| `think` | Vesper is interpreting, or showing a clarification |
| `sleep` | The notch is idle at rest |
| `oops` | The provider/classifier failed |

## How to swap in approved assets

Only do this once the assets have been approved for redistribution.

1. Add the approved files to this directory (`public/vesper/`), for example
   `vesper.svg`, `vesper-think.svg`, `vesper-sleep.svg`, `vesper-oops.svg`.
2. Update `components/notch/VesperFace.tsx` to render them instead of the inline grids, keeping the
   same `FaceState` values and the same public prop shape
   (`{ state, size, className }`) so no other file changes.
3. Keep them `aria-hidden` and decorative — the notch's status is already announced through its
   `aria-live` region, so the face must not become the only way to understand state.
4. Update the "Limitations" and placeholder notes in `README.md` and this file to reflect that the
   real assets are now in use, and record their license/provenance.

If you are unsure whether an asset may be redistributed, leave the placeholder in place and ask
first.
