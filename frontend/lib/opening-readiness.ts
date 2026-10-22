// Decode the actual rendered image, including Next's selected srcset candidate.
export async function prepareOpeningImage(image: HTMLImageElement) {
  image.loading = "eager";
  if (!image.complete) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        window.clearTimeout(timeout);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("Không thể tải ảnh")); };
      const timeout = window.setTimeout(failed, 45000);
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
    });
  }
  if (!image.naturalWidth) throw new Error("Không thể tải ảnh");
  await image.decode();
}
