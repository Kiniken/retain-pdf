import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { build } from "esbuild";

// detail.html 与 reader.html 不经打包,浏览器原生 ESM 直载 src/js 源码,
// import 路径写错只有运行时白屏才会暴露。这里用 esbuild 做一次纯解析
// (write: false),让断链在测试期就变红。

const PROJECT_ROOT = process.cwd();
const UNBUNDLED_PAGE_ENTRIES = [
  "src/js/job-detail/index.js",
  "src/js/reader/index.js",
];

for (const entry of UNBUNDLED_PAGE_ENTRIES) {
  test(`非打包入口 ${entry} 的所有 import 可解析`, async () => {
    let result;
    try {
      result = await build({
        entryPoints: [join(PROJECT_ROOT, entry)],
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        logLevel: "silent",
      });
    } catch (error) {
      const details = (error.errors || [])
        .map((item) => `${item.location?.file}:${item.location?.line} ${item.text}`)
        .join("\n  ");
      assert.fail(`import 解析失败:\n  ${details || error.message}`);
    }
    assert.equal(result.errors.length, 0);
  });
}
