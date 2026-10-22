# Backend instructions

- Keep this application installable and buildable without sibling or repository-root source.
- Public database reads use anonymous RLS. Privileged credentials stay in server-only modules and are never returned, logged, or included in public configuration.
- Image uploads must be checked by actual file signature and decoded with a pixel limit before conversion to WebP/AVIF. Preserve orientation, aspect ratio and transparency, strip EXIF/GPS, and store the converted MIME type, extension and bytes together. Keep audio validation independent of image conversion.
- Keep auth errors generic, apply server-side abuse controls, and preserve same-origin admin authentication and localhost/LAN development behavior.
