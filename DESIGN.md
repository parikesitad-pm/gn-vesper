# Vesper interface

The page is an interactive presentation of Vesper, with a working command console and a single 3D vessel. The primary action opens Vesper.

## Palette

Default Dracula: warm black background `#211b1d`, secondary surface `#191416`, deepest surface `#120e10`, borders `#554047`, foreground `#f8f8f2`, secondary text `#c1b3b7`, action red `#ff5555`, ember `#ff3038`, success mint `#50fa7b`, cyan `#8be9fd`. The pilot chose a red-led Dracula identity.

Light and neon variants derive from the same palette. Exact tokens live in `app/globals.css`.

## Typography and layout

IBM Plex Sans carries reading and display text; JetBrains Mono carries command input, labels, and trace data. The desktop container is 1240px maximum with fluid margins. Mobile sections stack with 20px side margins. Controls use 4–8px corners; the command island uses 14px corners.

## Interaction

The header shows only the Vesper icon at rest. Hover or click the icon, or use Command/Super+K or Ctrl+K to open the command island. Escape closes it. The inline console offers ACT/KNOW examples, editable input, output, source links, and theme controls.

## Motion

GSAP handles the opening title, command-panel entrance, scroll progress, and pipeline tracking. Lenis uses the GSAP ticker. Three.js renders one procedural vessel with pointer response and scroll-linked rotation. Pause and reduced-motion settings disable presentation motion; static content stays visible. WebGL resources and GSAP contexts are disposed on unmount.

## Text and background motion

The hero title enters letter by letter, with one accessible heading label. Decorative command examples rotate every 3.5 seconds. Section headings move with scroll while retaining full text contrast. GSAP animates six background signal lanes; the existing Three.js scene moves its particle field without another canvas. Lenis remains on the GSAP ticker. Pause and reduced motion restore static text and background.

The island keeps its content mounted and morphs a separate material with scale transforms. The character stays undistorted. Escape, the esc control, and outside pointer presses dismiss it; there is no × button.

Performance check: the island retains one ResizeObserver across repeated open/close cycles. Decorative 3D pauses during command input. Production headless Chrome, 1280×900, 4× CPU, software WebGL: worst keyboard event 256 → 192 ms; keydown 208 → 128 ms. Three hero runs before: 37/39/39 FPS; after: 36/36/37 FPS. Input latency improved; hero FPS did not. These are lab samples, not field INP or a GPU benchmark.
