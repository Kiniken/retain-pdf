import { loadRecentJobImage } from "./image-loader.js";

function imageCacheVersionFromCover(cover) {
  const card = cover.closest?.("recent-job-card, .recent-job-item");
  return [
    card?.dataset?.jobId,
    card?.dataset?.status,
    card?.dataset?.updatedAt,
    card?.dataset?.displayStage,
    card?.dataset?.substage,
  ].map((value) => `${value ?? ""}`).join("|");
}

export function hydrateRecentJobImages(list) {
  list?.querySelectorAll?.(".recent-job-cover[data-image-url]")?.forEach((cover) => {
    const rawUrl = cover.getAttribute("data-image-url") || "";
    if (!rawUrl || cover.dataset.loaded === "1") {
      return;
    }
    cover.dataset.loaded = "1";
    loadRecentJobImage(rawUrl, { cacheVersion: imageCacheVersionFromCover(cover) })
      .then((objectUrl) => {
        if (!objectUrl) {
          return;
        }
        cover.style.backgroundImage = `url("${objectUrl}")`;
        cover.classList.add("has-image");
      })
      .catch(() => {
        cover.classList.add("is-missing");
      });
  });
}
