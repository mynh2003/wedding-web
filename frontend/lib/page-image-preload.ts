// Warm the actual responsive image selected by the browser. Do not request the
// original URL separately: that would bypass Next's sizes/srcset and load twice.
export function bindPageImagePreload(page: HTMLElement) {
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const target = entry.target as HTMLElement;
      const images = target.tagName === "IMG" ? [target as HTMLImageElement] :
        Array.from(target.querySelectorAll<HTMLImageElement>("img[loading='lazy']"));
      images.forEach((image) => {
        image.decoding = "async";
        image.loading = "eager";
        observer.unobserve(image);
      });
      observer.unobserve(target);
    });
  }, { root: page, rootMargin: `${Math.max(1000, page.clientHeight * 2)}px 0px`, threshold: 0 });

  const watch = (node: Element) => {
    const groups = node.matches("[data-image-preload-group]") ? [node] : [];
    groups.push(...node.querySelectorAll("[data-image-preload-group]"));
    groups.forEach((group) => {
      if (seen.has(group)) return;
      seen.add(group);
      observer.observe(group);
    });
    const images = node.matches("img[loading='lazy']") ? [node as HTMLImageElement] : [];
    images.push(...node.querySelectorAll<HTMLImageElement>("img[loading='lazy']"));
    images.forEach((image) => {
      if (seen.has(image) || (image.complete && image.naturalWidth > 0)) return;
      seen.add(image);
      observer.observe(image);
    });
  };
  watch(page);
  const changes = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) watch(node as Element);
    }));
  });
  changes.observe(page, { childList: true, subtree: true });
  return () => { observer.disconnect(); changes.disconnect(); };
}
