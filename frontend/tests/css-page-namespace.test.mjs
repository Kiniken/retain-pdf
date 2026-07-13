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

// 解析出规则选择器,跳过 @keyframes 内部的步进选择器(0%/from/to)。
//
// Tailwind v4 迁移后,部分样式文件改用了原生 CSS 嵌套(`&:hover`/`& p`/`&.foo`)
// 和 `@utility <name> { ... }` 语法(v4 官方迁移工具的产物)。这两种写法编译后
// 等价于旧版摊平的复合选择器,但字面文本不再自带页面前缀,所以这里需要把 `&`
// 展开成最近一层的选择器上下文(`@utility <name>` 视为 `.<name>`),否则会把
// 完全合规的嵌套选择器误判成"没有命名空间"。
function ruleSelectors(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  // 每一层记录 { header, resolved }:resolved 为 null 表示这一层是透传的
  // at-rule(@media/@keyframes 等),不建立新的选择器上下文,`&` 应穿透它去找
  // 最近一层真正的选择器/`@utility` 上下文。
  const stack = [];
  let buffer = "";

  const nearestResolved = () => {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i].resolved) {
        return stack[i].resolved;
      }
    }
    return [""];
  };

  const resolveHeader = (header) => {
    const parents = nearestResolved();
    return header
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .flatMap((part) =>
        part.includes("&") ? parents.map((parent) => part.split("&").join(parent)) : [part],
      );
  };

  for (const ch of noComments) {
    if (ch === "{") {
      const header = buffer.trim();
      buffer = "";
      const inKeyframes = stack.some((frame) => frame.header.startsWith("@keyframes"));

      if (/^@utility\s+/.test(header)) {
        const name = header.replace(/^@utility\s+/, "").trim();
        stack.push({ header, resolved: [`.${name}`] });
      } else if (header.startsWith("@") || inKeyframes) {
        stack.push({ header, resolved: null });
      } else {
        const resolved = resolveHeader(header);
        selectors.push(...resolved);
        stack.push({ header, resolved });
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
