import { GLOSSARY_DOM_IDS } from "./glossary-manager-dialog-dom-contract.js";

export function glossaryManagerDialogTemplate() {
  return `
      <dialog id="${GLOSSARY_DOM_IDS.dialog}" class="desktop-dialog glossary-manager-dialog">
        <div class="desktop-shell glossary-manager-shell">
          <div class="desktop-head">
            <div class="credential-dialog-head">
              <h2>术语表</h2>
            </div>
            <button id="${GLOSSARY_DOM_IDS.closeButton}" type="button" class="dialog-close-btn" aria-label="关闭">×</button>
          </div>
          <div class="desktop-body glossary-manager-body">
            <aside class="glossary-list-panel">
              <div class="glossary-panel-head">
                <strong>列表</strong>
                <button id="${GLOSSARY_DOM_IDS.newButton}" type="button" class="app-button secondary">新建</button>
              </div>
              <div id="${GLOSSARY_DOM_IDS.list}" class="glossary-list"></div>
              <div id="${GLOSSARY_DOM_IDS.listEmpty}" class="events-empty hidden">暂无术语表</div>
            </aside>

            <section class="glossary-editor-panel">
              <label class="glossary-name-field">
                <span>名称</span>
                <input id="${GLOSSARY_DOM_IDS.nameInput}" type="text" autocomplete="off" placeholder="例如 量子化学术语" />
              </label>
              <div class="glossary-toolbar">
                <button id="${GLOSSARY_DOM_IDS.addRowButton}" type="button" class="app-button secondary">添加</button>
                <button id="${GLOSSARY_DOM_IDS.importButton}" type="button" class="app-button secondary">CSV</button>
                <button id="${GLOSSARY_DOM_IDS.exportButton}" type="button" class="app-button secondary">导出</button>
                <button id="${GLOSSARY_DOM_IDS.deleteButton}" type="button" class="app-button secondary danger">删除</button>
              </div>
              <div class="glossary-editor-scroll">
                <div class="glossary-table-wrap">
                  <table class="glossary-table">
                    <thead>
                      <tr>
                        <th class="glossary-col-source">原词</th>
                        <th class="glossary-col-target">译文</th>
                        <th class="glossary-col-note">备注</th>
                        <th class="glossary-col-level">类型</th>
                        <th class="glossary-col-match">匹配</th>
                        <th class="glossary-col-action"></th>
                      </tr>
                    </thead>
                    <tbody id="${GLOSSARY_DOM_IDS.entries}"></tbody>
                  </table>
                  <div id="${GLOSSARY_DOM_IDS.entriesEmpty}" class="events-empty">暂无词条</div>
                </div>
                <div class="glossary-import-panel hidden" id="${GLOSSARY_DOM_IDS.importPanel}">
                  <textarea id="${GLOSSARY_DOM_IDS.csvText}" rows="6" placeholder="原词,译文,类型,匹配模式,备注"></textarea>
                  <div class="glossary-import-actions">
                    <button id="${GLOSSARY_DOM_IDS.importApplyButton}" type="button" class="app-button">解析</button>
                    <button id="${GLOSSARY_DOM_IDS.importCancelButton}" type="button" class="app-button secondary">取消</button>
                  </div>
                </div>
              </div>
              <div class="glossary-footer">
                <span id="${GLOSSARY_DOM_IDS.status}" class="upload-status hidden"></span>
                <button id="${GLOSSARY_DOM_IDS.saveButton}" type="button" class="app-button">保存</button>
              </div>
            </section>
          </div>
        </div>
      </dialog>
    `;
}
