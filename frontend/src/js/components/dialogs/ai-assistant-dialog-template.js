import {
  AI_ASSISTANT_DIALOG_IDS,
} from "./ai-assistant-dialog-contract.js";

export function aiAssistantDialogTemplate() {
  return `
    <dialog id="${AI_ASSISTANT_DIALOG_IDS.dialog}" class="desktop-dialog ai-assistant-dialog">
      <div class="desktop-shell ai-assistant-shell">
        <div class="ai-assistant-head">
          <div>
            <h2>AI 问答</h2>
            <p>针对文档、页面或选中内容提问</p>
          </div>
          <button id="${AI_ASSISTANT_DIALOG_IDS.closeButton}" type="button" class="dialog-close-btn" aria-label="关闭">×</button>
        </div>
        <div class="ai-assistant-body">
          <div class="ai-assistant-context-bar" aria-label="问答范围">
            <button type="button" class="is-active">当前文档</button>
            <button type="button">当前页</button>
            <button type="button">选中内容</button>
          </div>
          <div class="ai-assistant-thread" aria-live="polite">
            <article class="ai-assistant-message">
              <span>RetainPDF AI</span>
              <p>这里会显示 PDF 问答结果。当前只是界面组件，后续可以接入文档范围、页码范围和引用来源。</p>
            </article>
          </div>
          <form class="ai-assistant-composer">
            <textarea id="${AI_ASSISTANT_DIALOG_IDS.input}" rows="3" placeholder="询问这份 PDF 的重点、术语、章节或翻译建议" disabled></textarea>
            <div class="ai-assistant-composer-foot">
              <span>问答 API 尚未接入</span>
              <button id="${AI_ASSISTANT_DIALOG_IDS.submitButton}" type="submit" disabled>发送</button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  `;
}

