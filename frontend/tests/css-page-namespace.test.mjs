import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// 三个页面共用一份编译后的 styles.css,页面级样式文件必须带页面命名空间,
// 否则会跨页污染。当前 reader/detail 两组文件已 100% 合规,本测试锁住约定,
// 禁止新增无命名空间的全局选择器。

const PROJECT_ROOT = process.cwd();
const STYLES_ROOT = join(PROJECT_ROOT, "src/styles");

const GROUPS = [
  {
    name: "reader 页/阅读器组件",
    files: [
      join(STYLES_ROOT, "reader-page.css"),
      join(STYLES_ROOT, "reader.css"),
      ...readdirSync(join(STYLES_ROOT, "reader"))
        .filter((f) => f.endsWith(".css"))
        .map((f) => join(STYLES_ROOT, "reader", f)),
    ],
    allowed: [
      /(\.|#)reader-/,
      /\[data-reader/,
      /^reader-dialog\b/, // <reader-dialog> 自定义标签选择器
      /body\.reader/,
      /^:root$/,
    ],
  },
  {
    name: "detail 页",
    files: [
      join(STYLES_ROOT, "pages.css"),
      ...readdirSync(join(STYLES_ROOT, "pages/detail"))
        .filter((f) => f.endsWith(".css"))
        .map((f) => join(STYLES_ROOT, "pages/detail", f)),
    ],
    allowed: [
      /(\.|#)detail-/,
      /\[data-detail/,
      /\.markdown-/, // detail 页 Markdown 预览区块
      /body\.detail/,
      /^:root$/,
    ],
  },
];

// 解析出规则选择器,跳过 @keyframes 内部的步进选择器(0%/from/to)
function ruleSelectors(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  const stack = [];
  let buffer = "";
  for (const ch of noComments) {
    if (ch === "{") {
      const header = buffer.trim();
      buffer = "";
      const inKeyframes = stack.some((h) => h.startsWith("@keyframes"));
      stack.push(header);
      if (header && !header.startsWith("@") && !inKeyframes) {
        selectors.push(header);
      }
    } else if (ch === "}") {
      stack.pop();
      buffer = "";
    } else if (ch === ";") {
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  return selectors;
}

for (const group of GROUPS) {
  test(`${group.name} 样式文件的选择器全部带页面命名空间`, () => {
    const violations = [];
    for (const file of group.files) {
      for (const selector of ruleSelectors(readFileSync(file, "utf8"))) {
        for (const part of selector.split(",")) {
          const trimmed = part.trim();
          if (!trimmed) {
            continue;
          }
          if (!group.allowed.some((pattern) => pattern.test(trimmed))) {
            violations.push(`${relative(PROJECT_ROOT, file)}: "${trimmed}"`);
          }
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `以下选择器没有页面命名空间,会污染其他页面(三页共用一份 styles.css):\n  ${violations.join("\n  ")}`,
    );
  });
}
