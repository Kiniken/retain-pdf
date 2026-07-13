// AI 问答的 React UI:会话栏(下拉/新建/删除)+ 消息线程 + composer。
// DOM 结构与类名对齐旧 chat.js 的产物(reader-ai-message / -body-el / -progress /
// reader-ai-citations 等),CSS 与 jsdom 测试断言不变。
// 气泡正文是命令式孤岛:React 只渲染 article/label/body 骨架,内容由
// use-reader-ai-chat 经 answer-view 句柄写入;骨架 props 恒定,追加消息时
// React 对既有气泡零 DOM 写入,命令式内容与类切换不会被虚拟 DOM 冲掉。

import { memo, useEffect } from "react";
import { useReaderAiChat } from "../ai/use-reader-ai-chat.js";

const AiMessage = memo(function AiMessage({ entry }) {
  return (
    <article
      className={`reader-ai-message reader-ai-message-${entry.role}`}
      ref={entry.view.attachRoot}
    >
      <span>{entry.title}</span>
      {/* body 为 div:Markdown 会产出块级元素(标题/列表/代码块),不能塞进 <p> */}
      <div
        className="reader-ai-message-body-el"
        data-reader-ai-message-body="1"
        ref={entry.view.attachBody}
      ></div>
    </article>
  );
});

// controllerRef(可选):把编排句柄(submit/newConversation/switchConversation/
// deleteConversation)暴露给外部——jsdom 测试直接驱动编排层(等价旧 chat.js 的
// 控制器 API 调用),规避 node:test 下 React 根事件委托在重挂后停摆的环境问题。
export function ReaderAiChat({ ports, controllerRef = null }) {
  const chat = useReaderAiChat(ports);
  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = chat;
    }
  });
  const busy = chat.composer.phase === "busy";
  const disabled = chat.composer.phase === "disabled";
  const onlyEmptySession = chat.sessions.length <= 1 && !(chat.sessions[0]?.messageCount);

  return (
    <>
      <div className="reader-ai-sessions" data-reader-ai-sessions="">
        <select
          id="reader-ai-session-select"
          className="reader-ai-session-select"
          aria-label="切换历史对话"
          value={chat.activeSessionId}
          disabled={chat.sessions.length <= 1}
          onChange={(event) => {
            const id = `${event.target.value || ""}`;
            if (id && id !== chat.activeSessionId) {
              void chat.switchConversation(id);
            }
          }}
        >
          {chat.sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.messageCount ? session.title : `${session.title}（空）`}
            </option>
          ))}
        </select>
        <button
          id="reader-ai-new-btn"
          type="button"
          className="reader-ai-session-btn"
          title="新建对话"
          onClick={() => void chat.newConversation()}
        >＋ 新对话</button>
        <button
          id="reader-ai-delete-btn"
          type="button"
          className="reader-ai-session-btn reader-ai-session-btn-danger"
          title="删除当前对话"
          aria-label="删除当前对话"
          disabled={onlyEmptySession}
          onClick={() => void chat.deleteConversation()}
        >删除</button>
      </div>
      <div id="reader-ai-thread" className="reader-ai-thread" aria-live="polite" ref={chat.threadRef}>
        {chat.messages.map((entry) => (
          <AiMessage key={entry.id} entry={entry} />
        ))}
      </div>
      <form
        className="reader-ai-composer"
        data-reader-ai-composer=""
        onSubmit={(event) => {
          event.preventDefault();
          void chat.submit();
        }}
      >
        <textarea
          id="reader-ai-input"
          placeholder="针对这份文档提问…"
          aria-label="输入问题"
          value={chat.input}
          disabled={disabled || busy}
          onChange={(event) => chat.setInput(event.target.value)}
        ></textarea>
        <div className="reader-ai-composer-foot">
          <span id="reader-ai-status">{chat.composer.text}</span>
          <button id="reader-ai-submit-btn" type="submit" disabled={disabled || busy}>
            {busy ? "生成中" : "发送"}
          </button>
        </div>
      </form>
    </>
  );
}
