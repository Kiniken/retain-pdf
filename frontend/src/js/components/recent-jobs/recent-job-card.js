import {
  isRecentJobActive,
  recentJobProgressPercent,
  recentJobRawImageUrl,
  recentJobRawImageUrls,
  recentJobStageLabel,
  recentJobStatusLabel,
  recentJobTitle,
} from "./recent-job-card-presenter.js";
import { loadFirstRecentJobImage } from "./recent-job-card-image-loader.js";

function imageCacheVersionOf(item = {}) {
  const progress = item.progress && typeof item.progress === "object" ? item.progress : {};
  const runtimeProgress = item.runtime_status?.progress && typeof item.runtime_status.progress === "object"
    ? item.runtime_status.progress
    : {};
  return [
    item.updated_at,
    item.status,
    item.display_stage,
    item.substage,
    progress.current,
    progress.total,
    progress.percent,
    runtimeProgress.current,
    runtimeProgress.total,
    runtimeProgress.percent,
  ].map((value) => `${value ?? ""}`).join("|");
}

function createIconButton({ className, title, label, svg }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = title;
  button.setAttribute("aria-label", label);
  button.innerHTML = svg;
  return button;
}

function createDeleteControls() {
  const fragment = document.createDocumentFragment();
  const button = createIconButton({
    className: "recent-job-delete",
    title: "删除",
    label: "删除任务",
    svg: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M6 7l1 14h10l1-14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
  });
  button.setAttribute("aria-expanded", "false");
  const popover = document.createElement("div");
  popover.className = "recent-job-delete-popover";
  popover.setAttribute("role", "group");
  popover.setAttribute("aria-label", "确认删除");
  popover.hidden = true;
  popover.inert = true;
  popover.innerHTML = `
    <div>删除这本书？</div>
    <div class="recent-job-delete-actions">
      <button type="button" class="recent-job-delete-cancel">取消</button>
      <button type="button" class="recent-job-delete-confirm">删除</button>
    </div>
  `;
  fragment.append(button, popover);
  return fragment;
}

function syncDeletePopover(card, open = card.classList.contains("is-confirming-delete")) {
  card.classList.toggle("is-confirming-delete", open);
  const deleteButton = card.querySelector(".recent-job-delete");
  if (deleteButton) {
    deleteButton.setAttribute("aria-expanded", open ? "true" : "false");
  }
  const popover = card.querySelector(".recent-job-delete-popover");
  if (popover) {
    popover.hidden = !open;
    popover.inert = !open;
  }
}

function closeSiblingDeletePopovers(card) {
  card.parentElement?.querySelectorAll?.("recent-job-card.is-confirming-delete, .recent-job-item.is-confirming-delete")
    .forEach((node) => {
      if (node !== card) {
        syncDeletePopover(node, false);
      }
    });
}

export class RecentJobCard extends HTMLElement {
  #item = null;
  #imageLoadToken = 0;

  constructor() {
    super();
    this.addEventListener("click", (event) => this.#onClick(event));
    this.addEventListener("keydown", (event) => this.#onKeyDown(event));
  }

  set item(value) {
    this.#item = value || {};
    this.#render();
  }

  get item() {
    return this.#item;
  }

  get jobId() {
    return `${this.#item?.job_id || this.dataset.jobId || ""}`.trim();
  }

  #emit(type) {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: { jobId: this.jobId, item: this.#item },
    }));
  }

  #onClick(event) {
    const cancelButton = event.target?.closest?.(".recent-job-delete-cancel");
    if (cancelButton && this.contains(cancelButton)) {
      event.preventDefault();
      event.stopPropagation();
      syncDeletePopover(this, false);
      return;
    }

    const confirmButton = event.target?.closest?.(".recent-job-delete-confirm");
    if (confirmButton && this.contains(confirmButton)) {
      event.preventDefault();
      event.stopPropagation();
      syncDeletePopover(this, false);
      this.#emit("recent-job-delete");
      return;
    }

    const deleteButton = event.target?.closest?.(".recent-job-delete");
    if (deleteButton && this.contains(deleteButton)) {
      event.preventDefault();
      event.stopPropagation();
      closeSiblingDeletePopovers(this);
      syncDeletePopover(this, !this.classList.contains("is-confirming-delete"));
      return;
    }

    const readerButton = event.target?.closest?.(".recent-job-reader");
    if (readerButton && this.contains(readerButton)) {
      event.preventDefault();
      event.stopPropagation();
      syncDeletePopover(this, false);
      this.#emit("recent-job-reader");
      return;
    }

    event.preventDefault();
    closeSiblingDeletePopovers(this);
    this.#emit("recent-job-select");
  }

  #onKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (event.target?.closest?.("button")) {
      return;
    }
    event.preventDefault();
    syncDeletePopover(this, false);
    this.#emit("recent-job-select");
  }

  #render() {
    const item = this.#item || {};
    const active = isRecentJobActive(item);
    const title = recentJobTitle(item);
    const pageCount = item.page_count || "-";
    const updatedAt = item.updated_at || "-";
    const fullTitle = item.title || item.display_name || item.job_id || "-";

    this.className = `recent-job-item ${active ? "is-active-job" : ""}`.trim();
    this.setAttribute("role", "button");
    this.tabIndex = 0;
    this.dataset.jobId = item.job_id || "";
    this.dataset.status = item.status || "";
    this.dataset.updatedAt = item.updated_at || "";
    this.dataset.displayStage = item.display_stage || "";
    this.dataset.substage = item.substage || "";

    const coverWrap = document.createElement("div");
    coverWrap.className = "recent-job-cover-wrap";

    const cover = document.createElement("div");
    cover.className = "recent-job-cover";
    const imageUrls = recentJobRawImageUrls(item);
    const imageUrl = recentJobRawImageUrl(item);
    if (imageUrl) {
      cover.dataset.imageUrl = imageUrl;
    }

    const fallback = document.createElement("span");
    fallback.className = "recent-job-cover-fallback";
    fallback.textContent = title.slice(0, 1);
    cover.append(fallback);

    const activeOverlay = this.#createActiveOverlay(item);
    if (activeOverlay) {
      cover.append(activeOverlay);
    }
    cover.append(this.#createHoverActions());

    const status = document.createElement("span");
    status.className = "recent-job-status";
    status.textContent = active ? recentJobStageLabel(item) : recentJobStatusLabel(item.status);

    coverWrap.append(cover, status, createDeleteControls());

    const titleWrap = document.createElement("div");
    titleWrap.className = "recent-job-title-wrap";
    const titleEl = document.createElement("span");
    titleEl.className = "recent-job-id";
    titleEl.title = fullTitle;
    titleEl.textContent = title;
    const meta = document.createElement("span");
    meta.className = "recent-job-real-id mono";
    meta.textContent = `${pageCount} 页 · ${updatedAt}`;
    titleWrap.append(titleEl, meta);

    this.replaceChildren(coverWrap, titleWrap);
    this.#loadCoverImage(cover, imageUrls, imageCacheVersionOf(item));
    syncDeletePopover(this, false);
  }

  #createHoverActions() {
    const actions = document.createElement("div");
    actions.className = "recent-job-hover-actions";
    actions.append(createIconButton({
      className: "recent-job-hover-btn recent-job-reader",
      title: "对照阅读",
      label: "对照阅读",
      svg: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.8 12s3.4-5.8 9.2-5.8S21.2 12 21.2 12s-3.4 5.8-9.2 5.8S2.8 12 2.8 12Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/>
        </svg>
      `,
    }));
    return actions;
  }

  #createActiveOverlay(item) {
    if (!isRecentJobActive(item)) {
      return null;
    }
    const percent = recentJobProgressPercent(item);
    const percentText = Number.isFinite(percent) ? `${Math.round(percent)}%` : "";
    const width = Number.isFinite(percent) ? `${percent.toFixed(2)}%` : "0%";
    const overlay = document.createElement("div");
    overlay.className = "recent-job-active-overlay";
    overlay.setAttribute("aria-label", recentJobStageLabel(item));
    overlay.innerHTML = `
      <span class="recent-job-active-label">${recentJobStageLabel(item)}</span>
      ${percentText ? `<span class="recent-job-active-percent">${percentText}</span>` : ""}
      <span class="recent-job-active-track" aria-hidden="true">
        <span class="recent-job-active-bar" style="width:${width}"></span>
      </span>
    `;
    return overlay;
  }

  #loadCoverImage(cover, rawUrls, cacheVersion = "") {
    const token = ++this.#imageLoadToken;
    if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
      return;
    }
    cover.dataset.loaded = "1";
    loadFirstRecentJobImage(rawUrls, { cacheVersion })
      .then((objectUrl) => {
        if (token !== this.#imageLoadToken || !objectUrl) {
          return;
        }
        cover.style.backgroundImage = `url("${objectUrl}")`;
        cover.classList.add("has-image");
      })
      .catch(() => {
        if (token === this.#imageLoadToken) {
          cover.classList.add("is-missing");
        }
      });
  }
}

if (!customElements.get("recent-job-card")) {
  customElements.define("recent-job-card", RecentJobCard);
}
