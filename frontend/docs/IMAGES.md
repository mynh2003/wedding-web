# Static image policy

New raster assets must be WebP or AVIF in production UI. SVG vectors remain SVG. This applies to generated artwork and manually added assets. The rule is in `AGENTS.md`.

Place a source image temporarily in `public/`, then run from frontend:

```sh
npm run optimize:images -- public/assets/new-artwork.png
```

The script writes `new-artwork.optimized.webp` only when it is smaller. It preserves dimensions and alpha, applies EXIF orientation, strips metadata, uses lossless encoding for mask/monogram/heart assets and quality 90 for other artwork. Inspect the result, update imports, CSS URLs and preloads, and move the editable original to `source-assets/`. Do not repeatedly recompress an already optimized output. If an existing WebP is already smaller, keep it. AVIF can be supplied directly after equivalent checks; the automated default is WebP for browser compatibility and predictable decoding.

`image-optimization.json` records twelve replaced assets: 2,973,191 bytes down to 1,470,768 bytes (about 51%). These are file-size reductions, not measured page-load or Lighthouse improvements. The displayed layout, aspect ratios and animation gates are unchanged. Some assets are lazy-loaded, so the reduction in the first request depends on which sections are visited.

Dashboard uploads are converted by backend before storage, not by trusting a browser MIME label. See backend's security/upload documentation. Existing Supabase media is not retroactively converted.
