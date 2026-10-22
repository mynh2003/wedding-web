// Load only the faces and glyphs used by the visible opening/hero text.
// Waiting for document.fonts.ready would also wait for fonts below the fold.
export async function loadElementFonts(elements: Iterable<HTMLElement>) {
  if (!document.fonts) return;
  const requests = new Map<string, string>();
  for (const element of elements) {
    const style = getComputedStyle(element);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    requests.set(font, (requests.get(font) ?? "") + (element.textContent ?? ""));
  }
  await Promise.allSettled(Array.from(requests, async ([font, text]) => document.fonts.load(font, text)));
}
