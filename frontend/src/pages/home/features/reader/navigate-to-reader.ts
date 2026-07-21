// 主页 → 阅读页导航（可注入，便于测试）
//
// 默认「软打开」：history.pushState + SoftReaderHost 全屏层，主页不卸载。
// replace / 非主页文档 / 跨域：仍 location.replace|assign。

import { captureHomeReturnState } from "../../../../shared/navigation/home-return-state.js";
import { trySoftOpenReader } from "../../../../shared/navigation/soft-reader.js";

export type ReaderNavigateOptions = {
  replace?: boolean;
};

export type ReaderNavigateFn = (url: string, options?: ReaderNavigateOptions) => void;

const defaultNavigate: ReaderNavigateFn = (url, { replace = false } = {}) => {
  const target = `${url || ""}`.trim();
  if (!target) return;
  // 记下滚动；软打开时主页本就不卸，仍可作兜底
  captureHomeReturnState({ allowBack: !replace });
  if (replace) {
    window.location.replace(target);
    return;
  }
  if (trySoftOpenReader(target)) {
    return;
  }
  window.location.assign(target);
};

let navigateImpl: ReaderNavigateFn = defaultNavigate;

/** 仅测试使用：注入假导航，测完后传 null 复位 */
export function setReaderNavigateForTests(fn: ReaderNavigateFn | null) {
  navigateImpl = fn || defaultNavigate;
}

export function navigateToReader(url: string, options: ReaderNavigateOptions = {}) {
  navigateImpl(url, options);
}
