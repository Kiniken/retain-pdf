// ReaderDialog 的加载遮罩(dialogs 蓝图 §4)——逐 id/class 镜像
// components/dialogs/reader-dialog-template.js 的 loading 分支。
//
// 文本/百分比节点故意渲染为空壳(JSX 不带字面量子节点):进度在
// postMessage 高频回调下由 useReaderDialogProgress/父组件直接
// textRef.current.textContent = ... 写入,若 JSX 里带字面量子节点,
// visible 切换触发的父组件重渲会被 React 协调回 JSX 值,冲掉刚写入的
// 实时文本——这正是"不进 state"要规避的坑。

import { READER_DIALOG_IDS } from "../../../../js/features/reader-dialog/contract.js";

export function ReaderLoadingOverlay({ visible, textRef, percentRef, barRef }) {
  return (
    <div
      id={READER_DIALOG_IDS.loading}
      className={`reader-dialog-loading${visible ? "" : " hidden"}`}
      aria-live="polite"
    >
      <div className="reader-dialog-loading-card">
        <div className="reader-dialog-loading-head">
          <div id={READER_DIALOG_IDS.loadingText} ref={textRef} className="reader-dialog-loading-text" />
          <div id={READER_DIALOG_IDS.loadingPercent} ref={percentRef} className="reader-dialog-loading-percent" />
        </div>
        <div className="reader-dialog-loading-track">
          <span id={READER_DIALOG_IDS.loadingBar} ref={barRef} className="reader-dialog-loading-bar" />
        </div>
      </div>
    </div>
  );
}
