// 主页内全屏阅读层：iframe 载入 reader.html，主页不卸载。
// 关闭：子页 postMessage → history.back → popstate 卸层。

import { useEffect, useState } from "react";
import {
  SOFT_READER_CLOSE_MESSAGE,
  SOFT_READER_FORCE_CLOSE_EVENT,
  SOFT_READER_OPEN_EVENT,
  closeSoftReaderOnHost,
  isSoftReaderHistoryState,
} from "../../../../shared/navigation/soft-reader.js";

export function SoftReaderHost() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const next = `${(event as CustomEvent)?.detail?.url || ""}`.trim();
      if (next) setUrl(next);
    }

    function onForceClose() {
      setUrl(null);
    }

    function onPopState() {
      if (isSoftReaderHistoryState(window.history.state) && window.history.state.readerUrl) {
        setUrl(window.history.state.readerUrl);
        return;
      }
      setUrl(null);
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== SOFT_READER_CLOSE_MESSAGE) return;
      closeSoftReaderOnHost();
    }

    window.addEventListener(SOFT_READER_OPEN_EVENT, onOpen as EventListener);
    window.addEventListener(SOFT_READER_FORCE_CLOSE_EVENT, onForceClose);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("message", onMessage);

    // 前进/后退恢复
    onPopState();

    return () => {
      window.removeEventListener(SOFT_READER_OPEN_EVENT, onOpen as EventListener);
      window.removeEventListener(SOFT_READER_FORCE_CLOSE_EVENT, onForceClose);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-soft-reader-open", Boolean(url));
    return () => {
      document.body.classList.remove("is-soft-reader-open");
    };
  }, [url]);

  if (!url) return null;

  return (
    <div
      id="soft-reader-host"
      className="soft-reader-host"
      role="dialog"
      aria-modal="true"
      aria-label="阅读器"
    >
      <iframe
        id="soft-reader-frame"
        key={url}
        className="soft-reader-frame"
        title="阅读器"
        src={url}
      />
    </div>
  );
}
