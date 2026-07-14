// ReaderDialog iframe 宿主(dialogs 蓝图 §4)——对照
// components/dialogs/reader-dialog-template.js 逐 id/class 镜像。
//
// Dialog 渲染层(阶段 C 收官批,shadcn 改造):从原生 <dialog>+showModal/close
// 换成 radix-ui 的 Dialog 原语(DialogPrimitive.Root/Portal/Overlay/Content),
// 继续用现有 desktop-dialog/reader-dialog 视觉体系,不套默认皮肤。dialogStore
// 的 open/close 语义不动(铁律),onOpenChange(false) 统一路由到
// dialogStore.close()——Escape、背板点击(DismissableLayer 的 outside-click
// 检测)、关闭按钮(DialogPrimitive.Close)三条路径都走这一个回调。
//
// 不 forceMount Content(同其余 8 个对话框的决策,见
// shared/react/use-dialog-return-focus.js 头注释——forceMount 会让 Radix
// modal Content 内部的 hideOthers() 副作用在应用启动时就永久生效)。这意味着
// iframe(以及下面的 loading 遮罩、关闭按钮)不再是"常驻挂载,靠 CSS/浏览器
// 原生 dialog 语义隐藏",而是随 open 状态真实 mount/unmount。对下面几个 effect
// 的影响,逐一说明:
// - (a) 一次性挂载 effect 里"初始 srcdoc 占位"这步:ReaderDialog 组件本身
//   (而不是 Content)在 HomeApp 首帧就无条件挂载,所以这个 effect 仍然会跑;
//   只是首次运行时 open 还是 false,Content/iframe 尚未 mount,frameRef.current
//   是 null,setFrameSource 提前返回,是安全的 no-op(placeholder 占位本来就
//   只在对话框可见时才有意义,常驻挂载年代它也从未真正被用户看到过)。
// - (b) 打开/切换目标 effect 不受影响:它依赖 [open, payload],open 变 true
//   时 Content 已经在同一次 commit 里 mount 完成,effect 运行时 frameRef.current
//   已指向新挂载的 iframe。
// - (c) 关闭转场 effect 里的"iframe 复位为占位 srcdoc"这步,在 Content 已经
//   随 open=false 卸载之后基本会变成 no-op(frameRef.current 已因 iframe
//   卸载被置 null)——不影响正确性,因为 iframe 本身已经被销毁,不需要再重置
//   src;真正有实际效果、且不受影响的是 syncReaderRoute("")(清路由)。
//
// iframe src 切换必须保持命令式 ref 处理(蓝图 §4 铁律,照搬旧
// setReaderDialogFrameSource 的分支逻辑),不走 JSX 声明式 src 属性——换成
// Radix 后这一点不变,effect (a)/(b)/(c) 原样保留,只是 Content 的
// mount/unmount 生命周期变了。
//
// postMessage 契约逐字节核对 Phase2b 发送端(src/js/reader/
// progress-presenter.js:29-34):type "retainpdf-reader-progress"，字段
// { type, stage, percent, text }；来源校验 isTrustedWindowMessage 不改
// (见 useReaderPostMessage.js)。useReaderPostMessage/useReaderDialogProgress
// 挂在 ReaderDialog 组件自己身上(不在 Content 内部),不受 forceMount 决策
// 影响,持续监听 window message,只是 Content 未挂载时 frameRef.current 为
// null,可信来源校验自然不通过,不会产生误写入。
//
// 触发路径三条(recent-jobs 卡片「对照阅读」/library-search 岛的
// openReaderRequested 事件/URL 深链 ?view=reader&job_id=)都不经过 Radix
// Trigger(没有一处渲染 DialogPrimitive.Trigger),Radix 默认的 triggerRef
// 焦点归还是 no-op,复用 use-dialog-return-focus.js(同其余 8 个对话框的
// 先例)。
//
// 焦点陷阱边界(蓝图记录过的既有行为,不是 bug):iframe 内部(reader.html
// 本体)有自己的可聚焦元素,Radix 的 DismissableLayer/FocusScope 只管住宿主
// 页面这一层的 Tab 焦点陷阱,不会也不需要管 iframe 内部——两个独立的文档,
// 各自的 Tab 顺序天然隔离。
//
// 下载按钮死代码运行时复核结论:旧宿主模板(reader-dialog-template.js)
// 当前分支已经不渲染 source/merged/translated 三个下载按钮（下载入口
// 移进了 reader.html 本体的 ReaderDownloadMenu.jsx），controller.js 的
// handleSourceDownload/handleTranslatedDownload/handleMergedDownload/
// syncToolbarActions 四个函数在宿主侧已是死代码，本组件不移植；已用
// mock 场景跑 fresh Playwright 复核（home-react-dev.html?mock=succeeded），
// 确认对话框头部只有关闭按钮，无下载入口。

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { useAppEvent } from "../../../../shared/react/use-app-event.js";
import { useDialogReturnFocus } from "../../../../shared/react/use-dialog-return-focus.js";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import {
  READER_DIALOG_COPY,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "../../../../js/features/reader-dialog/contract.js";
import {
  buildReaderDocumentPageUrl,
  buildReaderPageUrl,
  buildReaderRouteUrl,
  requestedReaderJobIdFromLocation,
} from "../../../../js/features/reader-dialog/routing.js";
import { ReaderLoadingOverlay } from "./ReaderLoadingOverlay.jsx";
import { useReaderDialogProgress } from "./useReaderDialogProgress.js";
import { useReaderPostMessage } from "./useReaderPostMessage.js";

const OPEN_PROGRESS_SEED = 8;
const FRAME_LOAD_FALLBACK_MS = 1200;

// 镜像旧 components/dialogs/reader-dialog-rendering.js#setReaderDialogFrameSource。
function setFrameSource(frameEl, url = "about:blank") {
  if (!frameEl) {
    return;
  }
  const normalizedUrl = `${url || ""}`.trim();
  if (!normalizedUrl || normalizedUrl === "about:blank") {
    frameEl.removeAttribute("src");
    frameEl.setAttribute("srcdoc", READER_FRAME_PLACEHOLDER);
    return;
  }
  frameEl.removeAttribute("srcdoc");
  frameEl.src = normalizedUrl;
}

function syncReaderRoute(jobId = "") {
  window.history.replaceState(window.history.state, "", buildReaderRouteUrl(jobId));
}

function anchorFromEventDetail(detail = {}) {
  // 注意:Number(null) === 0——pageIdx 显式传 null(无锚点场景,recent-jobs
  // 卡片/URL 深链都是这样传的)时不能直接 Number() 转,否则会把"没有页码"
  // 误判成"第 0 页"，多余地在 URL 里带上 page_idx=0。
  const rawPageIdx = detail.pageIdx;
  const pageIdx = rawPageIdx === null || rawPageIdx === undefined ? NaN : Number(rawPageIdx);
  const blockId = `${detail.blockId || ""}`.trim();
  if (!Number.isFinite(pageIdx) && !blockId) {
    return null;
  }
  return {
    pageIdx: Number.isFinite(pageIdx) ? pageIdx : null,
    blockId,
  };
}

export function ReaderDialog() {
  const services = useHomeServices();
  const { dialogStore } = services.reader;
  const dialogState = useDialogState(dialogStore);
  const open = Boolean(dialogState.open);
  const payload = dialogState.payload || {};

  const frameRef = useRef(null);
  const textRef = useRef(null);
  const percentRef = useRef(null);
  const barRef = useRef(null);
  const hasOpenedRef = useRef(false);

  // 阶段 C 收官批踩到的真实时序坑(Radix Presence 两段挂载):Content 不
  // forceMount 后,`open` 从 false→true 的那次渲染里,Presence 内部状态机
  // 还是"unmounted"(见 @radix-ui/react-presence 源码——它靠一个
  // useLayoutEffect 在 DOM 落地后才 send("MOUNT"),这一渲染 Presence 仍返回
  // null,iframe/loading 遮罩这些 Content 子树内容那一刻还不存在于 DOM),
  // 真正把 iframe mount 到 DOM 是"下一次"渲染。而 effect (b)(下面,依赖
  // [open, payload])绑定的是第一次那个渲染,它的被动 effect flush 时机早于
  // iframe 真正 mount——实测(jsdom + 无 act() 环境下)validated:此时
  // frameRef.current 仍是 null,setFrameSource 直接 no-op,iframe 永远拿不到
  // 目标 src,对照阅读整个打不开。这是本项目常驻挂载年代(原生 <dialog>,
  // iframe 从不随对话框开合卸载)不存在的问题,9 个对话框里独此一份(其余
  // 8 个都不需要在 Content 卸载又重新挂载后,把一个跨 mount 周期的目标值
  // "对齐"到某个 ref 指向的 DOM 节点上)。
  //
  // 修复:iframe 的 ref 从"直接挂 frameRef"改成一个 callback ref——只要
  // iframe 真正挂载(不管是通过哪次渲染、哪个 commit 触发),就立刻把
  // pendingFrameUrlRef 里记录的"最新期望 src"应用上去,不依赖任何特定 effect
  // 恰好在那个时间点运行。effect (a)/(b)/(c) 里原来直接调
  // setFrameSource(frameRef.current, url) 的地方统一改走 applyFrameSource(url)
  // ——它做两件事:更新 pendingFrameUrlRef(供将来 iframe 挂载时兜底应用)+
  // 尝试立即应用(iframe 已挂载时这就是原来的行为,是常见路径)。
  const pendingFrameUrlRef = useRef("about:blank");
  const applyFrameSource = useCallback((url) => {
    pendingFrameUrlRef.current = url;
    setFrameSource(frameRef.current, url);
  }, []);
  const setFrameRef = useCallback((node) => {
    frameRef.current = node;
    if (node) {
      setFrameSource(node, pendingFrameUrlRef.current);
    }
  }, []);

  const [loadingVisible, setLoadingVisible] = useState(false);
  const { setProgress, resetProgress } = useReaderDialogProgress({ barRef, percentRef });
  const { onCloseAutoFocus } = useDialogReturnFocus(open);

  // loading 文案同样受上面那条 Presence 两段挂载时序影响(textRef 也在
  // Content 子树内),用同样的"pending 值 + 挂载时兜底应用"模式修复,避免
  // 打开瞬间文案短暂空白。
  const pendingLoadingTextRef = useRef(READER_DIALOG_COPY.preparing);
  const setLoadingText = useCallback((text) => {
    const normalized = `${text ?? READER_DIALOG_COPY.preparing}`;
    pendingLoadingTextRef.current = normalized;
    if (textRef.current) {
      textRef.current.textContent = normalized;
    }
  }, []);
  const setTextRef = useCallback((node) => {
    textRef.current = node;
    if (node) {
      node.textContent = pendingLoadingTextRef.current;
    }
  }, []);

  // 打开触发①②:recent-jobs 卡片 + ResultActions「对照阅读」+
  // library-search 岛都 dispatch openReaderRequested(蓝图 §4 施工范围第 6
  // 条),本 effect 是唯一消费点。③URL 深链启动(?view=reader&job_id=)不走
  // 这个事件——见下方一次性挂载 effect 的注释。
  useAppEvent(APP_EVENTS.openReaderRequested, (event) => {
    const detail = event?.detail || {};
    const jobId = `${detail.jobId || ""}`.trim();
    const anchor = anchorFromEventDetail(detail);
    if (jobId) {
      const url = buildReaderPageUrl(jobId, anchor);
      if (!url) {
        return;
      }
      dialogStore.open({ jobId, url, anchor });
      return;
    }
    // 无 job 的"读原文"(馆藏文档,F4):用 document_id 打开只读源文档阅读器。
    const documentId = `${detail.documentId || ""}`.trim();
    if (!documentId) {
      return;
    }
    const url = buildReaderDocumentPageUrl(documentId, anchor);
    if (!url) {
      return;
    }
    dialogStore.open({ jobId: "", documentId, url, anchor });
  });

  // (a) 一次性挂载 effect(不参与 open/close 状态机、不碰路由/history 之外的
  //     部分):iframe 初始 srcdoc 占位、loading 文案/进度条初值,外加 URL
  //     深链启动检查(蓝图 §4 施工范围第 6 条 ③)。
  //
  //     深链没有走 openReaderRequested 事件转发,是组件自己在这里直接读
  //     requestedReaderJobIdFromLocation() 并 open()——曾经改成
  //     composition.js#initialize() 里 setTimeout(0) 派发事件的写法,
  //     实测(jsdom 回归)会与本组件挂载后才注册的 useAppEvent 监听器竞速:
  //     initialize() 在 root.render() 之前调用,若两边都退化成
  //     setTimeout(0) 调度,派发可能先于监听器就绪,深链启动整个打不开
  //     对话框。组件自己在挂载 effect 里读 URL,不依赖任何跨模块时序假设。
  useEffect(() => {
    applyFrameSource("about:blank");
    setLoadingText(READER_DIALOG_COPY.preparing);
    resetProgress();
    const startupJobId = requestedReaderJobIdFromLocation();
    if (startupJobId) {
      const url = buildReaderPageUrl(startupJobId, null);
      if (url) {
        dialogStore.open({ jobId: startupJobId, url, anchor: null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (b) 打开/切换目标:同一次挂载期间可能反复调用 dialogStore.open()
  //     (例如已开着阅读器时又点了另一本书的「对照阅读」),payload 引用
  //     每次 open() 都会刷新,即便 open 本身已经是 true 也要重新求值
  //     iframe src/进度/路由(逐字节镜像旧 controller.js#open())。
  useEffect(() => {
    if (!open) {
      return;
    }
    hasOpenedRef.current = true;
    syncReaderRoute(payload.jobId || "");
    setLoadingVisible(true);
    resetProgress();
    setProgress(OPEN_PROGRESS_SEED);
    setLoadingText(READER_DIALOG_COPY.preparing);
    applyFrameSource(payload.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  // (c) 关闭转场:只在「确实打开过」之后才清路由/复位 loading——常驻挂载
  //     的首次渲染 open 本就是 false,不应该在 mount 瞬间抢跑
  //     syncReaderRoute("") 把 URL 深链(?view=reader&job_id=)清掉,
  //     在上面 (a) 的深链检查真正跑到 dialogStore.open() 之前就把它冲掉。
  useEffect(() => {
    if (open || !hasOpenedRef.current) {
      return;
    }
    setLoadingVisible(false);
    resetProgress();
    setLoadingText(READER_DIALOG_COPY.preparing);
    syncReaderRoute("");
    applyFrameSource("about:blank");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useReaderPostMessage({
    frameRef,
    onProgress: (percent, text) => {
      setLoadingVisible(true);
      setProgress(percent);
      setLoadingText(text);
    },
    onReadyHide: () => setLoadingVisible(false),
  });

  // iframe onLoad 兜底(旧 controller.js#bindEvents 的 onFrameLoad):postMessage
  // 迟迟不到时,frame 真实加载完成 1200ms 后仍隐藏 loading,避免卡死遮罩。
  const handleFrameLoad = useCallback(() => {
    window.setTimeout(() => {
      const frame = frameRef.current;
      const loaded = Boolean(frame?.src && frame.src !== "about:blank");
      if (loaded) {
        setLoadingVisible(false);
      }
    }, FRAME_LOAD_FALLBACK_MS);
  }, []);

  // Esc / 背板点击 / 关闭按钮都经这一个回调回写 store(dialogStore.close()
  // 对已关闭状态是幂等 no-op)。
  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      dialogStore.close();
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id={READER_DIALOG_IDS.dialog}
          className="desktop-dialog reader-dialog"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {/* 视觉上这个对话框没有标题文案(纯 iframe 视口 + 关闭按钮),但
              Radix 要求 Content 关联一个 Title 才算无障碍闭环(缺失会有 dev
              警告)——用 sr-only 挂一个屏幕阅读器可读的标题,不影响视觉,同
              其余 8 个对话框都有 DialogPrimitive.Title 的先例保持一致。 */}
          <DialogPrimitive.Title asChild>
            <h2 className="sr-only">对照阅读</h2>
          </DialogPrimitive.Title>
          <div className="reader-dialog-shell">
            <div className="reader-dialog-head">
              {/* 下载入口在阅读器本体的动作组里(reader.html),宿主只保留关闭。 */}
              <DialogPrimitive.Close asChild>
                <button
                  id={READER_DIALOG_IDS.closeButton}
                  type="button"
                  className="dialog-close-btn"
                  aria-label="关闭"
                >
                  ×
                </button>
              </DialogPrimitive.Close>
            </div>
            <ReaderLoadingOverlay
              visible={loadingVisible}
              textRef={setTextRef}
              percentRef={percentRef}
              barRef={barRef}
            />
            <iframe
              id={READER_DIALOG_IDS.frame}
              ref={setFrameRef}
              className="reader-dialog-frame"
              title="对照阅读"
              onLoad={handleFrameLoad}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
