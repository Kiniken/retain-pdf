// 给三页 HTML 里引用的 styles.css / *.bundle.js 打上内容哈希的 ?v= 缓存串。
//
// 背景(真实踩坑):index.html 长期把 styles.css 和 app.bundle.js 钉死成
// `?v=20260617-runtime-cache` 这个静态串——重新构建后产物变了、但 URL(连
// 查询串)一字不变,浏览器命中启发式缓存(python http.server 只发 Last-Modified、
// 不发 Cache-Control,浏览器会在一段"启发式新鲜期"内直接吃缓存不回源),于是
// 普通刷新拿到的还是旧 JS/CSS,"改了代码看不到效果"。detail.html/reader.html
// 干脆没带任何 ?v=,同样受启发式缓存影响,只是没那么显性。
//
// 正解:构建产物后,按每个资源的内容哈希写 ?v=<hash>——内容不变 → URL 不变
// (正常命中缓存),内容一变 → URL 变(强制回源)。这是标准做法,且对静态
// 服务器 / desktop file:// / 生产带 Cache-Control 三种部署都成立。
//
// 幂等:反复跑只会把 ?v= 覆盖成当前内容对应的哈希,同内容多次跑结果一致。
// 挂在 build:css / build:js 末尾各调一次;stamp 每次都从磁盘重算全部哈希,
// 所以只重建其中一类产物也能得到一致结果(另一类读到的还是原内容,哈希不变)。

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// 每页 HTML 引用的资源(相对 frontend 根),stamp 会把这些 href/src 上的 ?v=
// 改写成对应文件的内容哈希。
const PAGES = [
  { html: "index.html", assets: ["styles.css", "dist/app.bundle.js"] },
  { html: "detail.html", assets: ["styles.css", "dist/detail.bundle.js"] },
  { html: "reader.html", assets: ["styles.css", "dist/reader.bundle.js"] },
];

function contentHash(absPath) {
  const buf = readFileSync(absPath);
  return createHash("sha256").update(buf).digest("hex").slice(0, 10);
}

// 把 html 里对某个 asset 的引用(href/src="./asset" 或 "./asset?v=旧值")统一
// 改写成 "./asset?v=<hash>"。asset 里的 . 和 / 需要转义进正则。
function stampAssetRef(htmlText, asset, hash) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(["']\\.\\/${escaped})(\\?v=[^"']*)?(["'])`, "g");
  return htmlText.replace(pattern, `$1?v=${hash}$3`);
}

let changed = 0;
for (const page of PAGES) {
  const htmlPath = join(FRONTEND_ROOT, page.html);
  if (!existsSync(htmlPath)) {
    continue;
  }
  let htmlText = readFileSync(htmlPath, "utf8");
  const before = htmlText;
  for (const asset of page.assets) {
    const assetPath = join(FRONTEND_ROOT, asset);
    if (!existsSync(assetPath)) {
      continue;
    }
    htmlText = stampAssetRef(htmlText, asset, contentHash(assetPath));
  }
  if (htmlText !== before) {
    writeFileSync(htmlPath, htmlText);
    changed += 1;
  }
}

console.log(`[stamp-cache-version] 已更新 ${changed} 个 HTML 的资源缓存串`);
