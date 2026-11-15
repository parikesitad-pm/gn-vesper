# Vesper faces

The four faces Vesper shows in the notch are the **approved originals**:

| State | File | Used when |
| --- | --- | --- |
| `answer` | `vesper.svg` | The notch is open and showing an input, a result or a grounded answer |
| `think` | `vesper-think.svg` | Vesper is interpreting or showing a clarification |
| `sleep` | `vesper-sleep.svg` | The notch is idle at rest |
| `oops` | `vesper-oops.svg` | A provider, classifier or retrieval call failed |

They are included here by the repository owner for this standalone showcase. The private portfolio
repository they came from is **not** a dependency, and no portfolio code runs in this project. The artwork is
not a generic template asset; ask the owner before reusing it outside this repository.

## How they are rendered

`components/atoms/VesperFace.tsx` loads all four from `public/vesper/`, stacks them in one fixed-size box and
crossfades to the active face. Keeping all four mounted means switching state never changes layout and never
waits for an image mid-transition.

The faces are decorative: they are `aria-hidden`, and the notch's `aria-live` status is what announces state
to assistive technology. Motion is disabled by the global `[data-motion="off"]` rule and by
`prefers-reduced-motion`.

If you replace a face, keep the same filenames and the same square aspect ratio, and keep it `aria-hidden` so
the artwork never becomes the only way to understand state.
