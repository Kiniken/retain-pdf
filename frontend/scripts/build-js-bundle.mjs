import { build, context } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const outdir = path.join(frontendRoot, "dist");

// --watch: esbuild context 增量重建(开发态:sourcemap 开、minify 关)
const watchMode = process.argv.includes("--watch");

// 三页 MPA 各自打包的入口表(React 迁移期逐页启用):
// - home 暂仍指向旧世界入口 app-bundle-entry.js,产物名保持 app.bundle.js
//   (index.html 引用不变;Phase 3 cutover 时换成 src/pages/home/entry.jsx → home.bundle.js)
// - detail 已切换到 React 新世界(Phase 1 cutover)
// - reader 已切换到 React 新世界(Phase 2b cutover);批注岛的预编译 ESM 通道
//   (src/js/generated/reader-annotations-app.js)随之退役,组件源码直接进 reader 包
const PAGE_BUNDLES = [
  {
    name: "home",
    entry: path.join(frontendRoot, "app-bundle-entry.js"),
    outfile: path.join(outdir, "app.bundle.js"),
  },
  {
    name: "detail",
    entry: path.join(frontendRoot, "src/pages/detail/entry.jsx"),
    outfile: path.join(outdir, "detail.bundle.js"),
  },
  {
    name: "reader",
    entry: path.join(frontendRoot, "src/pages/reader/entry.jsx"),
    outfile: path.join(outdir, "reader.bundle.js"),
  },
  // Phase 3a 临时开发入口:React 新世界 home 页(home-react-dev.html 加载),
  // 与旧世界 app.bundle.js 双轨并存供对照;home cutover 时删除本条目,
  // 并把上方 home 条目的 entry 换成 src/pages/home/entry.jsx。
  {
    name: "home-react-dev",
    entry: path.join(frontendRoot, "src/pages/home/entry.jsx"),
    outfile: path.join(outdir, "home-react-dev.bundle.js"),
  },
];

function bundleOptions({ entry, outfile }) {
  return {
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    // .jsx 走自动运行时(react/jsx-runtime),随页面包打包
    jsx: "automatic",
    loader: {
      ".html": "text",
    },
    minify: !watchMode,
    sourcemap: watchMode ? "inline" : false,
    logLevel: "info",
    legalComments: "none",
  };
}

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

if (watchMode) {
  const contexts = await Promise.all(
    PAGE_BUNDLES.map((page) => context(bundleOptions(page))),
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log(`[watch] 监听中:${PAGE_BUNDLES.map((p) => p.name).join(", ")}(Ctrl+C 退出)`);
} else {
  for (const page of PAGE_BUNDLES) {
    await build(bundleOptions(page));
  }
}
