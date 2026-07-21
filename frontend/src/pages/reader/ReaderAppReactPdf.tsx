// React-pdf 阅读器视图：逻辑在 useReaderReactController；批注为新实现，不接旧抽屉。

import { useReaderReactController } from "./hooks/use-reader-react-controller.js";
import {
  ReaderCloseHome,
  ReaderModeTabs,
  ReaderReactBoot,
  ReaderCompareGrid,
  ReaderZoomHud,
  ReaderFab,
  ReaderNotesPanel,
  ReaderSelectionToolbar,
} from "./components/react-pdf/index.js";
import { DownloadToastHost } from "../../shared/react/DownloadToastHost.jsx";

export function ReaderAppReactPdf() {
  const c = useReaderReactController();
  const { boot, panes, shell, sessionFiles, notes } = c;

  return (
    <div className="reader-react-root" data-reader-engine="react-pdf">
      <ReaderReactBoot
        loading={boot.loading}
        failed={boot.failed}
        text={boot.text}
        percent={boot.percent}
      />

      {/* 整页阅读器：右上角关闭 → 回主页（替代旧 iframe 宿主关闭钮） */}
      <ReaderCloseHome />

      <ReaderModeTabs
        mode={c.mode}
        sourceOnly={c.sourceOnly}
        onModeChange={c.setModeKeepingPage}
      />

      {c.showHud ? (
        <ReaderFab
          notesOpen={notes.panelOpen}
          notesCount={notes.count}
          onToggleNotes={notes.togglePanel}
          download={c.download}
        />
      ) : null}

      <ReaderCompareGrid
        mode={c.mode}
        bindShell={shell.bindShell}
        shellEl={shell.shellEl}
        userZoom={c.userZoom}
        compareMode={panes.compareMode}
        shellWidth={shell.shellWidth}
        compareColWidth={shell.compareColWidth}
        rowHeights={c.rowHeights}
        mountSource={panes.mountSource}
        mountTranslated={panes.mountTranslated}
        showSource={panes.showSource}
        showTranslated={panes.showTranslated}
        sourceOnly={c.sourceOnly}
        sourceUrl={sessionFiles.sourceUrl}
        translatedUrl={sessionFiles.translatedUrl}
        sourceFile={sessionFiles.sourceFile}
        translatedFile={sessionFiles.translatedFile}
        onMetrics={panes.onMetrics}
        onNumPagesChange={panes.onNumPages}
      />

      {c.showHud ? (
        <ReaderZoomHud
          userZoom={c.userZoom}
          onZoomChange={c.onZoomChange}
          currentPage={c.currentPage}
          numPages={panes.hudNumPages}
          mode={c.mode}
          onGoToPage={c.goToPage}
        />
      ) : null}

      <ReaderNotesPanel
        open={notes.panelOpen}
        groups={notes.groups}
        count={notes.count}
        onClose={notes.closePanel}
        onJump={c.jumpToNote}
        onUpdateNote={notes.updateNote}
        onRemove={notes.remove}
        onExport={() => notes.exportMarkdown(c.documentTitle)}
      />

      <ReaderSelectionToolbar
        selection={c.selection}
        onAddNote={c.addNoteFromSelection}
        onDismiss={c.clearSelection}
      />

      <DownloadToastHost />
    </div>
  );
}
