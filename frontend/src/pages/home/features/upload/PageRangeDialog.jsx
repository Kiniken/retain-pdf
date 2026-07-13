// 专业翻译对话框(React 版 <page-range-dialog>,对照 components/dialogs/page-range-dialog.js)。
//
// 原生 <dialog> 的 showModal/close 属命令式 API:开合状态在 upload 视图 store
// (uploadFeature.openPageRangeDialog/closePageRangeDialog 写入),effect 负责
// 与 DOM 对齐;用户 Esc/表单 method=dialog 关闭时经 onClose 回写 store。
// 术语表下拉由 workflow store 的 glossaries/selectedGlossaryId 驱动
// (镜像 workflow/view.js setDeveloperGlossaryOptions 的选项语义,含
// 「已删除或不可用」兜底项)。

import { useEffect, useRef } from "react";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";

export function PageRangeDialog() {
  const services = useHomeServices();
  const upload = useStoreSnapshot(services.stores.uploadView);
  const workflow = useStoreSnapshot(services.stores.workflowView);
  const dialogRef = useRef(null);

  const open = Boolean(upload.pageRangeDialogOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  // 背板点击关闭(镜像 bindDialogBackdropClose)
  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      services.features.uploadFeature?.applyPageRanges();
    }
  }

  // Esc/表单提交等原生关闭路径 → 回写 store
  function handleNativeClose() {
    if (upload.pageRangeDialogOpen) {
      services.uploadViewActions.patch({ pageRangeDialogOpen: false });
    }
  }

  const selectedId = `${workflow.selectedGlossaryId || ""}`.trim();
  const hasSelected = !selectedId
    || workflow.glossaries.some((glossary) => glossary.glossaryId === selectedId);

  return (
    <page-range-dialog data-hydrated="1">
      <dialog
        id="page-range-dialog"
        className="desktop-dialog page-range-dialog professional-translate-dialog"
        ref={dialogRef}
        onClick={handleBackdropClick}
        onClose={handleNativeClose}
      >
        <form method="dialog" className="desktop-shell">
          <div className="desktop-head">
            <h2 id="page-range-title">专业翻译</h2>
            <button id="page-range-close-btn" type="submit" className="dialog-close-btn" aria-label="关闭">×</button>
          </div>
          <div className="desktop-body">
            <p id="page-range-limit-text" className="muted">选择本次翻译使用的术语表。页码范围可直接在上传区域填写。</p>
            <label className="professional-glossary-field">
              <span>术语表</span>
              <select
                id="job-glossary-id"
                value={selectedId}
                onChange={(event) => services.workflowViewActions.setSelectedGlossaryId(event.target.value)}
              >
                <option value="">不使用术语表</option>
                {workflow.glossaries.map((glossary) => (
                  <option key={glossary.glossaryId} value={glossary.glossaryId}>
                    {glossary.name}
                    {Number.isFinite(glossary.entryCount) ? ` (${glossary.entryCount})` : ""}
                  </option>
                ))}
                {!hasSelected ? (
                  <option value={selectedId}>{`已删除或不可用: ${selectedId}`}</option>
                ) : null}
              </select>
            </label>
            <div className="actions">
              <button
                id="page-range-clear-btn"
                type="button"
                className="app-button secondary"
                onClick={() => services.features.uploadFeature?.clearPageRanges()}
              >
                不使用
              </button>
              <button
                id="page-range-apply-btn"
                type="button"
                className="app-button"
                onClick={() => services.features.uploadFeature?.applyPageRanges()}
              >
                完成
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </page-range-dialog>
  );
}
