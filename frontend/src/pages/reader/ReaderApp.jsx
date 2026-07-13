// 阅读器编排根(Phase 2b 全量):静态 JSX 复刻 reader.html 的可见骨架,
// DOM 顺序与旧页 body 保持一致(paint/stacking 依赖顺序)。
// 启动编排(boot loading → 数据加载 → 双 PDF 挂载 → HUD → 各工具接线)在
// useReaderBoot 里,PDF/摘录/批注锚点等命令式核心走 src/js/reader/;
// 抽屉开合、AI 问答 UI、下载菜单、顶栏动作组为 React(见 components/)。

import { useState } from "react";
import { ReaderBootLoading } from "./components/ReaderBootLoading.jsx";
import { ReaderTopbar } from "./components/ReaderTopbar.jsx";
import { ReaderTopbarActions } from "./components/ReaderTopbarActions.jsx";
import { ReaderLeftNav } from "./components/ReaderLeftNav.jsx";
import { ReaderColumnChrome } from "./components/ReaderColumnChrome.jsx";
import { ReaderScrollShell } from "./components/ReaderScrollShell.jsx";
import {
  ReaderAiDrawer,
  ReaderAnnotationsDrawer,
  ReaderFavoritesDrawer,
  ReaderMarkdownDrawer,
} from "./components/ReaderSideDrawers.jsx";
import { DownloadToastHost } from "./components/DownloadToastHost.jsx";
import { createReaderDrawerStore } from "./state/drawer-store.js";
import { useReaderBoot } from "./hooks/use-reader-boot.js";

export function ReaderApp() {
  const [drawerStore] = useState(() => createReaderDrawerStore());
  const runtime = useReaderBoot(drawerStore);
  return (
    <>
      <ReaderBootLoading />
      <ReaderTopbar />
      <ReaderTopbarActions drawerStore={drawerStore} downloadContext={runtime.downloads} />
      <ReaderLeftNav />
      <ReaderColumnChrome />
      <ReaderScrollShell />
      <ReaderFavoritesDrawer drawerStore={drawerStore} />
      <ReaderAnnotationsDrawer drawerStore={drawerStore} ports={runtime.annotations} />
      <ReaderMarkdownDrawer drawerStore={drawerStore} />
      <ReaderAiDrawer drawerStore={drawerStore} chatPorts={runtime.chat} />
      <DownloadToastHost />
    </>
  );
}
