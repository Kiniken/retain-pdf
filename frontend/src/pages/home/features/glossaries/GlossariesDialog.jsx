// GlossariesDialog(React 版 <glossary-manager-dialog>,对照
// components/dialogs/glossary-manager-dialog-template.js 逐 id 镜像 +
// features/glossaries/controller.js(kept 控制器)的开合/读取/保存编排)。
//
// 原生 <dialog> 语义(蓝图 §0.2):常驻挂载(entry 起就存在于 HomeApp 树里),
// effect 依 glossariesDialogStore 的 open 状态驱动 showModal()/close();背板
// 点击 + 关闭按钮都回写 store,不依赖旧 app-shell/view.js:bindDialogBackdropClose。
//
// 打开入口:SettingsHubDialog"词表"tab 的 #glossary-btn 调用
// services.glossaries.dialogStore.open()(蓝图 §0.4);本组件内部的 open 状态
// 迁移 effect(见 useGlossariesController.js)把这次打开接回 controller.js 的
// open(),补上"打开即刷新列表"的旧语义。

import { useEffect, useRef } from "react";
import { GLOSSARY_DOM_IDS } from "./glossaries-dom-ids.js";
import { useGlossariesController } from "./useGlossariesController.js";
import { GlossaryList } from "./GlossaryList.jsx";
import { GlossaryEditor } from "./GlossaryEditor.jsx";
import { GlossaryImportPanel } from "./GlossaryImportPanel.jsx";

export function GlossariesDialog() {
  const { open, view, store, dialogStore, handlers } = useGlossariesController();
  const dialogRef = useRef(null);

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

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      dialogStore.close();
    }
  }

  function handleNativeClose() {
    dialogStore.close();
  }

  const status = view.status || { message: "", tone: "" };
  const statusContent = `${status.message || ""}`.trim();
  const statusClasses = [
    "upload-status",
    statusContent ? "" : "hidden",
    status.tone === "valid" ? "is-valid" : "",
    status.tone === "error" ? "is-error" : "",
  ].filter(Boolean).join(" ");

  return (
    <dialog
      id={GLOSSARY_DOM_IDS.dialog}
      className="desktop-dialog glossary-manager-dialog"
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <div className="desktop-shell glossary-manager-shell">
        <div className="desktop-head">
          <div className="credential-dialog-head">
            <h2>术语表</h2>
          </div>
          <button
            id={GLOSSARY_DOM_IDS.closeButton}
            type="button"
            className="dialog-close-btn"
            aria-label="关闭"
            onClick={() => handlers?.close?.()}
          >
            ×
          </button>
        </div>
        <div className="desktop-body glossary-manager-body">
          <GlossaryList
            items={view.items}
            selectedId={view.selectedId}
            onSelect={(glossaryId) => handlers?.selectGlossary?.(glossaryId)}
            onCreateNew={() => handlers?.createNew?.()}
          />

          <section className="glossary-editor-panel">
            <label className="glossary-name-field">
              <span>名称</span>
              <input
                id={GLOSSARY_DOM_IDS.nameInput}
                type="text"
                autoComplete="off"
                placeholder="例如 量子化学术语"
                value={view.draft.name}
                onChange={(event) => store.actions.setName(event.target.value)}
              />
            </label>
            <div className="glossary-toolbar">
              <button id={GLOSSARY_DOM_IDS.addRowButton} type="button" className="app-button secondary" onClick={() => handlers?.addRow?.()}>添加</button>
              <button id={GLOSSARY_DOM_IDS.importButton} type="button" className="app-button secondary" onClick={() => handlers?.showImport?.()}>CSV</button>
              <button id={GLOSSARY_DOM_IDS.exportButton} type="button" className="app-button secondary" onClick={() => handlers?.exportCurrent?.()}>导出</button>
              <button id={GLOSSARY_DOM_IDS.deleteButton} type="button" className="app-button secondary danger" onClick={() => handlers?.deleteCurrent?.()}>删除</button>
            </div>
            <div className="glossary-editor-scroll">
              <GlossaryEditor
                entries={view.draft.entries}
                onFieldChange={(index, field, value) => store.actions.updateEntryField({ index, field, value })}
                onRemoveRow={(index) => store.actions.removeEntryRow(index)}
              />
              <GlossaryImportPanel
                visible={view.importVisible}
                csvText={view.csvText}
                onCsvTextChange={(value) => store.actions.setCsvText(value)}
                onApply={() => handlers?.applyImport?.()}
                onCancel={() => handlers?.hideImport?.()}
              />
            </div>
            <div className="glossary-footer">
              <span id={GLOSSARY_DOM_IDS.status} className={statusClasses}>{statusContent}</span>
              <button id={GLOSSARY_DOM_IDS.saveButton} type="button" className="app-button" onClick={() => handlers?.save?.()}>保存</button>
            </div>
          </section>
        </div>
      </div>
    </dialog>
  );
}
