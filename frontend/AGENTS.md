# Project instructions

Preserve these product requirements for the wedding invitation unless a later user request explicitly changes them. A later explicit request overrides the relevant requirement.

## Envelope opening and hero reveal

- Keep the invitation mobile-first and centered in a canvas no wider than 430px.
- Keep the envelope's upper panel pinned to the viewport top and the lower panel pinned to the viewport bottom. The upper panel must render above the lower panel.
- Keep the wax-seal monogram button centered on the upper panel's tip, visually stable on first load and reload, with a smooth gentle pulse. Fade the button before starting the envelope exit animation.
- Add directional dark shadow to the two diagonal edges of the upper envelope panel so they remain distinct from the lower panel. Keep the shadow confined to the edge and cast toward the lower panel.
- The opening must not reveal a blank white screen. Once opened, reveal the first hero section and its hero banner image beneath a transparent cover.
- Wait until the envelope has exited and the hero banner image has loaded before animating the hero text.
- Keep page scrolling locked until the hero banner and its text entrance animation have finished, then unlock scrolling.
- Respect `prefers-reduced-motion` for the opening and hero entrance animations.

## Change precedence

A later explicit user request can replace any of these requirements. Preserve all other requirements that the later request does not change.

## Static images and uploads

- New raster images, including AI-generated assets and manually added images, must be optimized to WebP or AVIF before they are referenced by production UI or preloads. Do not add PNG/JPEG originals to the public runtime asset set when an optimized version is available.
- Preserve transparency, aspect ratio, visible quality, layout, and animation behavior. Keep SVG for vector assets. Size raster images for their rendered size and high-density screens; remove EXIF/GPS and other unnecessary metadata.
- Use the frontend image optimization script for local static assets. Original source files may live outside the runtime public directory when needed for editing.
- Images uploaded through the dashboard must be validated and converted on the backend to WebP or AVIF before storage. Frontend checks are for user feedback; the backend must enforce file signatures, byte/pixel limits, supported formats, and conversion.
- When replacing an asset, update imports, CSS URLs, preloads, and fallback paths together. Verify dimensions and alpha transparency and check the actual byte reduction.
