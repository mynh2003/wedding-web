The WOFF2 fonts are hosted locally through `app/fonts.css`. The four font preloads
in `app/fonts.ts` use exactly the same URLs as the CSS, including on Windows builds.
They include Latin, Vietnamese, combining accents and common punctuation. Keep these
ranges when regenerating subsets; do not use an ASCII-only subset for invitations.

Google Fonts sources: https://github.com/google/fonts/tree/main/ofl

- `bevietnampro`, `cormorantgaramond`, `greatvibes`, `montserrat`, `playfairdisplay`
- Each family's OFL license is included beside the font files.
- Cormorant Garamond is instantiated at weight 400. Montserrat and Playfair Display
  retain their variable weights; normal and italic faces are separate files.

`flavinda.woff2` and `lora-reference-regular.woff2` are compressed subsets of the
existing project fonts `Flavinda.otf` and `lora-reference-regular.ttf`.
Original project files are retained.

The opening fonts are preloaded. Fonts used only later in the invitation are not
preloaded. Opening and hero text wait for their own font faces, rather than waiting
for every font on the page. CSS fallback metrics match the fonts' ascent, descent
and size as calculated by Next's font loader. Files in `browser/` contain a SHA-256
content hash in the filename and are cached as immutable. When updating a font,
regenerate its filename and update both the CSS and preload list.
