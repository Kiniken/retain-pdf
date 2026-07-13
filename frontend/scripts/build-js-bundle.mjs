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

// 三页 MPA 各自打包的入口表——home/detail/reader 均已切换到 React 新世界:
// - home 已切换(Phase 3 cutover),产物名保持 app.bundle.js(index.html 引用不变,
//   减少 cutover diff 面;旧世界入口 app-bundle-entry.js 已删除)
// - detail 已切换到 React 新世界(Phase 1 cutover)
// - reader 已切换到 React 新世界(Phase 2b cutover);批注岛的预编译 ESM 通道
//   (src/js/generated/reader-annotations-app.js)随之退役,组件源码直接进 reader 包
const PAGE_BUNDLES = [
  {
    name: "home",
    entry: path.join(frontendRoot, "src/pages/home/entry.jsx"),
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
    // shadcn/ui 组件源码(src/components/ui/**)和 src/lib/utils.js 内部用
    // "@/..." 引用彼此(components.json 的 aliases 约定)。jsconfig.json 只
    // 对编辑器/类型检查生效,esbuild 打包本身不会读它——这里用 esbuild
    // 0.19+ 原生支持的 alias 选项显式声明同一份映射,否则构建期会报
    // "Could not resolve @/lib/utils" 之类的错误。
    alias: {
      "@": path.join(frontendRoot, "src"),
    },
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
