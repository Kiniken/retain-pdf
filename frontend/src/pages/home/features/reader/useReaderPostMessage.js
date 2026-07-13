// postMessage 进度契约的监听端(dialogs 蓝图 §4)——逐字节对照
// Phase2b 发送端(src/js/reader/progress-presenter.js:29-34)与旧宿主
// features/reader-dialog/controller.js#bindEvents 的 window message 处理器:
//   type === READER_DIALOG_MESSAGES.progress("retainpdf-reader-progress")
//   字段 { type, stage, percent, text }；stage==="ready" && percent>=100
//   时延时 180ms 隐藏 loading 遮罩。
//
// 来源校验 isTrustedWindowMessage(event, frameWindow) 直接从 config/runtime.js
// import,不改校验逻辑本身(蓝图 §4 铁律)。

import { useEffect, useRef } from "react";
import { isTrustedWindowMessage } from "../../../../js/config/runtime.js";
import { READER_DIALOG_MESSAGES } from "../../../../js/features/reader-dialog/contract.js";

const READY_HIDE_DELAY_MS = 180;

export function useReaderPostMessage({ frameRef, onProgress, onReadyHide }) {
  const hideTimerRef = useRef(0);
  // handler 走 ref(镜像 shared/react/use-app-event.js 的做法):调用方内联箭头
  // 函数每次渲染都是新引用,订阅本体只挂一次,不因引用漂移反复解绑/重绑。
  const callbacksRef = useRef({ onProgress, onReadyHide });

  useEffect(() => {
    callbacksRef.current = { onProgress, onReadyHide };
  });

  useEffect(() => {
    function handleMessage(event) {
      if (!isTrustedWindowMessage(event, frameRef.current?.contentWindow)) {
        return;
      }
      const data = event.data;
      if (!data || data.type !== READER_DIALOG_MESSAGES.progress) {
        return;
      }
      callbacksRef.current.onProgress?.(data.percent, data.text, data.stage);
      if (Number(data.percent) >= 100 && data.stage === "ready") {
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = window.setTimeout(() => {
          hideTimerRef.current = 0;
          callbacksRef.current.onReadyHide?.();
        }, READY_HIDE_DELAY_MS);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = 0;
      }
    };
  }, [frameRef]);
}
