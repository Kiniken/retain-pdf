// 应用外壳头部(对照 src/js/components/layout/app-shell-header.js 逐节点镜像)。
//
// 保留 <app-shell-header> 标签与 .app-shell-header 类(CSS 选择器平权);
// 内含品牌链接、隐藏的 hero 动作组。
//
// app-update 详情 dialog 不在这里:3a 阶段曾在此临时挂一份静态骨架
// (id 契约先落地),3b AppUpdateBanner agent(蓝图 §5)把按钮 + 详情 dialog
// 合并进同一个 AppUpdateBanner.jsx、挂到 SettingsHubDialog"更新"tab 下,这里
// 的骨架已清理——两处渲染同一个 #app-update-dialog id 会违反视觉基线/门禁。

export function AppShellHeader() {
  return (
    <app-shell-header class="app-shell-header">
      <header className="topbar library-topbar">
        <a
          className="hero-repo-link library-brand-link"
          href="https://github.com/wxyhgk/retain-pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img className="hero-repo-logo" src="src/assets/RetainPDF-logo.svg" alt="RetainPDF logo" />
          <span>RetainPDF</span>
        </a>
        <div className="hero-actions hidden" aria-hidden="true">
          <button id="developer-btn" type="button" className="secondary hidden" aria-hidden="true">开发者</button>
          <button id="open-output-btn" type="button" className="secondary hidden">打开输出目录</button>
        </div>
      </header>
    </app-shell-header>
  );
}
