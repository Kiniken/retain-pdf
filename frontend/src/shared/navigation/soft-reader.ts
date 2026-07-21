// 主页「软打开」阅读器：不 location.assign，用 history.pushState + 全屏层，
// 主页 DOM 不卸载 → 关闭不刷新、滚动天然保留。
// 地址栏仍是 reader.html?…，刷新会落到真正的阅读页。

export const SOFT_READER_HISTORY_FLAG = "retainpdfSoftReader";
export const SOFT_READER_OPEN_EVENT = "retainpdf:soft-reader-open";
export const SOFT_READER_FORCE_CLOSE_EVENT = "retainpdf:soft-reader-force-close";
/** iframe → 父页：请求关闭软阅读层 */
export const SOFT_READER_CLOSE_MESSAGE = "retainpdf:soft-reader-close";

export type SoftReaderHistoryState = {
  [SOFT_READER_HISTORY_FLAG]?: boolean;
  readerUrl?: string;
};

export function isHomeDocumentPath(pathname = ""): boolean {
  const p = `${pathname || ""}`;
  if (/reader\.html/i.test(p)) return false;
  if (/detail\.html/i.test(p)) return false;
  return true;
}

export function isSoftReaderHistoryState(state: unknown): state is SoftReaderHistoryState {
  return Boolean(state && typeof state === "object" && (state as SoftReaderHistoryState)[SOFT_READER_HISTORY_FLAG]);
}

/** 在主页文档上软打开；成功返回 true（已 pushState + 发事件） */
export function trySoftOpenReader(url: string): boolean {
  if (typeof window === "undefined") return false;
  const target = `${url || ""}`.trim();
  if (!target) return false;
  if (!isHomeDocumentPath(window.location.pathname)) return false;

  try {
    const absolute = new URL(target, window.location.href).href;
    if (new URL(absolute).origin !== window.location.origin) {
      return false;
    }
    const state: SoftReaderHistoryState = {
      [SOFT_READER_HISTORY_FLAG]: true,
      readerUrl: absolute,
    };
    window.history.pushState(state, "", absolute);
    window.dispatchEvent(
      new CustomEvent(SOFT_READER_OPEN_EVENT, { detail: { url: absolute } }),
    );
    return true;
  } catch {
    return false;
  }
}

/** 父页收到关闭请求：优先 history.back 卸掉软层 */
export function closeSoftReaderOnHost() {
  if (typeof window === "undefined") return;
  if (isSoftReaderHistoryState(window.history.state)) {
    window.history.back();
    return;
  }
  // 无对应 history 条目时：URL 改回主页并强制卸层
  try {
    const home = new URL("./index.html", window.location.href);
    window.history.replaceState(null, "", `${home.pathname}${home.search}${home.hash}`);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SOFT_READER_FORCE_CLOSE_EVENT));
}
