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
