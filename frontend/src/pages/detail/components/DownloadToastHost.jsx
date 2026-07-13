// 下载进度 toast 宿主。utils/download-feedback.js 的契约是查询 <download-toast>
// 元素并调用其 setState/hide;旧页由 src/js/components/feedback/download-toast.js
// 注册自定义元素提供实现,但新世界禁止 import 旧组件层(architecture-boundaries)。
// 这里改为:React 渲染同构的内部 DOM(类名/结构与旧元素一致,CSS 复用),
// 并在挂载时把 setState/hide 两个方法钉在宿主元素上——download-feedback 无感知。
// 内容更新全走命令式(与旧元素相同),React 首次 commit 后不再触碰这些节点。
// (与 src/pages/reader/components/DownloadToastHost.jsx 同一模式,detail 页缺失
// 该注册导致下载进度提示失效,此处补齐。)

import { useCallback } from "react";

function applyToastState(host, {
  visible = false,
  title = "下载中",
  status = "正在准备...",
  meta = "等待响应...",
  percent = NaN,
  tone = "progress",
} = {}) {
  host.classList.toggle("hidden", !visible);
  host.dataset.tone = tone;
  const titleEl = host.querySelector("#download-toast-title");
  const statusEl = host.querySelector("#download-toast-status");
  const metaEl = host.querySelector("#download-toast-meta");
  const barEl = host.querySelector("#download-toast-bar");
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (statusEl) {
    statusEl.textContent = status;
  }
  if (metaEl) {
    metaEl.textContent = meta;
  }
  if (barEl) {
    const width = Number.isFinite(percent)
      ? Math.max(4, Math.min(100, Number(percent) || 0))
      : 18;
    barEl.style.width = `${width}%`;
  }
}

export function DownloadToastHost() {
  const attach = useCallback((host) => {
    if (!host) {
      return;
    }
    host.setState = (state) => applyToastState(host, state);
    host.hide = () => host.classList.add("hidden");
  }, []);

  return (
    <download-toast class="download-toast hidden" aria-live="polite" ref={attach}>
      <div className="download-toast-card">
        <div className="download-toast-head">
          <div id="download-toast-title" className="download-toast-title">下载中</div>
          <div id="download-toast-status" className="download-toast-status">正在准备...</div>
        </div>
        <div className="download-toast-track">
          <span id="download-toast-bar" className="download-toast-bar"></span>
        </div>
        <div id="download-toast-meta" className="download-toast-meta">等待响应...</div>
      </div>
    </download-toast>
  );
}
