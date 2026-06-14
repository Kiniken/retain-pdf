function setActionLinkState(link, { ready = false, url = "" } = {}) {
  if (!link) {
    return;
  }
  const enabled = Boolean(ready && url);
  link.classList.toggle("hidden", !ready);
  link.classList.toggle("disabled", !enabled);
  link.setAttribute("aria-disabled", enabled ? "false" : "true");
  link.href = enabled ? url : "#";
  link.setAttribute("href", enabled ? url : "#");
  link.dataset.url = enabled ? url : "";
}

function setProgressComponents(host, {
  percent = 0,
  text = "",
  indeterminate = false,
} = {}) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const roundedPercent = Math.round(safePercent);
  const ring = host.querySelector("#status-progress-ring");
  const ringMeta = host.querySelector("#status-progress-ring-meta");
  const progressBar = host.querySelector("#status-progress-bar");
  const progressPercent = host.querySelector("#status-progress-percent");
  if (ring) {
    ring.value = safePercent;
    ring.setAttribute("value", `${safePercent}`);
    ring.textContent = indeterminate ? "..." : `${roundedPercent}%`;
  }
  if (ringMeta) {
    ringMeta.textContent = text || (indeterminate ? "处理中" : `${roundedPercent}%`);
  }
  if (progressPercent) {
    progressPercent.textContent = indeterminate ? "处理中" : `${roundedPercent}%`;
  }
  if (progressBar) {
    progressBar.value = safePercent;
    progressBar.setAttribute("value", `${safePercent}`);
    progressBar.toggleAttribute("indeterminate", Boolean(indeterminate));
  }
}

export function syncPrimaryActions(host, {
  pdfReady = false,
  readerReady = false,
  markdownBundleReady = false,
  pdfUrl = "",
  readerUrl = "",
  markdownBundleUrl = "",
  sourcePdfReady = false,
  sourcePdfUrl = "",
} = {}) {
  const pdfBtn = host.querySelector("#pdf-btn");
  const readerBtn = host.querySelector("#reader-btn");
  const markdownBundleBtn = host.querySelector("#status-markdown-bundle-btn");
  const sourcePdfBtn = host.querySelector("#source-pdf-btn");
  const actionRow = host.querySelector(".status-result-actions");
  const body = host.querySelector(".status-wa-body");
  const hasActions = markdownBundleReady || pdfReady || readerReady || sourcePdfReady;
  setActionLinkState(markdownBundleBtn, { ready: markdownBundleReady, url: markdownBundleUrl });
  setActionLinkState(pdfBtn, { ready: pdfReady, url: pdfUrl });
  setActionLinkState(readerBtn, { ready: readerReady, url: readerUrl });
  setActionLinkState(sourcePdfBtn, { ready: sourcePdfReady, url: sourcePdfUrl });
  actionRow?.classList.toggle("hidden", !hasActions);
  body?.classList.toggle("has-result-actions", hasActions);
}

export function setElapsed(host, value = "-") {
  const elapsed = host.querySelector("#status-ring-elapsed");
  if (elapsed) {
    elapsed.textContent = value;
  }
}

export function setProgress(host, {
  current = NaN,
  total = NaN,
  fallbackText = "-",
  percent = NaN,
  progressText = "",
  progressUnit = "",
  stageKey = "",
  forceVisible = null,
  indeterminate = false,
} = {}) {
  const normalizedStageKey = `${stageKey || ""}`.trim();
  const shouldShowProgress = forceVisible ?? ["ocr", "translate", "render"].includes(normalizedStageKey);
  const block = host.querySelector(".status-progress-block");
  const bar = host.querySelector("#job-progress-bar");
  const text = host.querySelector("#job-progress-text");
  if (!bar || !text) {
    return;
  }
  block?.classList.toggle("hidden", !shouldShowProgress);
  if (!shouldShowProgress) {
    bar.style.width = "0%";
    bar.classList.remove("is-indeterminate");
    text.textContent = "";
    setProgressComponents(host, { percent: 0, text: "-", indeterminate: false });
    return;
  }
  const numericCurrent = Number(current);
  const numericTotal = Number(total);
  const numericPercent = Number(percent);
  const normalizedProgressUnit = `${progressUnit || ""}`.trim();
  bar.classList.toggle("is-indeterminate", Boolean(indeterminate));
  if (indeterminate) {
    bar.style.width = "42%";
    text.textContent = progressText || fallbackText;
    setProgressComponents(host, {
      percent: 42,
      text: progressText || fallbackText,
      indeterminate: true,
    });
    return;
  }
  const hasNumbers = Number.isFinite(numericCurrent) && Number.isFinite(numericTotal) && numericTotal > 0;
  if (hasNumbers && normalizedProgressUnit === "percent") {
    const safePercent = Math.max(0, Math.min(100, (numericCurrent / numericTotal) * 100));
    bar.style.width = `${safePercent}%`;
    text.textContent = progressText || `进度 ${safePercent.toFixed(0)}%`;
    setProgressComponents(host, {
      percent: safePercent,
      text: text.textContent,
      indeterminate: false,
    });
    return;
  }
  if (!hasNumbers) {
    if (Number.isFinite(numericPercent)) {
      const safePercent = Math.max(0, Math.min(100, numericPercent));
      bar.style.width = `${safePercent}%`;
      text.textContent = progressText || `进度 ${safePercent.toFixed(0)}%`;
      setProgressComponents(host, {
        percent: safePercent,
        text: text.textContent,
        indeterminate: false,
      });
      return;
    }
    bar.style.width = "0%";
    text.textContent = progressText || fallbackText;
    setProgressComponents(host, {
      percent: 0,
      text: text.textContent,
      indeterminate: false,
    });
    return;
  }
  const computedPercent = (numericCurrent / numericTotal) * 100;
  const safePercent = Math.max(0, Math.min(100, computedPercent));
  bar.style.width = `${safePercent}%`;
  text.textContent = progressText || `${numericCurrent} / ${numericTotal} (${safePercent.toFixed(0)}%)`;
  setProgressComponents(host, {
    percent: safePercent,
    text: text.textContent,
    indeterminate: false,
  });
}

export function setCancelEnabled(host, enabled) {
  const button = host.querySelector("#cancel-btn");
  if (button) {
    button.disabled = !enabled;
  }
}
