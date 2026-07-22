# 前端 CSS 架构（按页拆分）

三页**不再共用一份**全站 `styles.css`。构建产出三份独立包：

| HTML | 入口源码 | 产物 |
|------|----------|------|
| `index.html` | `entries/home.css` | `dist/css/home.css` |
| `detail.html` | `entries/detail.css` | `dist/css/detail.css` |
| `reader.html` | `entries/reader.css` | `dist/css/reader.css` |
| `?engine=legacy` | `entries/reader-legacy.css` | `dist/css/reader-legacy.css`（动态注入） |

兼容：`styles.css` = `home.css` 副本（旧文档/脚本）；**HTML 已改指向 `dist/css/*`**。

## 目录

```text
src/styles/
  entries/           # 页面入口（谁 import 什么 = 耦合边界）
    home.css
    detail.css
    reader.css          # 默认 react-pdf
    reader-legacy.css   # ?engine=legacy 附加包
  core/              # 跨页最小共享
    tailwind-theme.css
    download-toast.css
  tokens.css / base.css / shadcn-theme.css / dialog-shell.css
  components*.css    # 共享 UI（button-link/label/mono…；阅读器尽量不引整包）
  pages/home/*       # 主页领域（components.utilities 拆出 + library/status/upload…）
  pages.css + pages/detail/*
  reader/ + reader.utilities.css
```

## 耦合规则

1. **页面专属样式只进对应 entry**  
   - 主页：书架、上传工作流、状态卡、凭据、合集…  
   - 详情：`pages.css` + `pages/detail/*`  
   - 阅读默认：`reader/layout|chrome|content|react-pdf|fab*|float-ai*|hud…`  
   - 阅读 legacy：`layout-legacy|chrome-legacy|side-drawer|favorites|selection|ai|annotations…`  
2. **跨页只放 `core/` + tokens/base/dialog-shell**（以及确有必要时的 components）  
3. **禁止**再把全站 import 塞回 `src/input.css`  
4. 新增样式：先判断属于哪一页 → 写进该域文件 → 确认已由对应 `entries/*.css` import  
5. 门禁：`tests/css-page-namespace.test.mjs`（reader/detail 选择器前缀）

## 构建

```bash
npm run build:css          # → dist/css/{home,detail,reader,reader-legacy}.css
npm run watch:css          # 各入口并行 --watch
```

`scripts/stamp-cache-version.mjs` 按页给 HTML 引用的 `dist/css/*.css` 打 `?v=hash`  
（`reader-legacy.css` 由 JS 动态注入，一般无 HTML 引用、不参与 stamp）。

## 体量（minify 后约）

| 包 | 量级 | 说明 |
|----|------|------|
| home | ~175KB | 主页域最多 |
| reader | 默认 react-pdf 精简包 | 无书架/工作流、无 legacy 抽屉 |
| reader-legacy | 附加包 | 仅 `?engine=legacy` |
| detail | ~86KB | 最轻 |

阅读页不再加载 `library-view` / `translation-workflow-*` 等主页规则。

## desktop / button-link

| 符号 | 基准位置 |
|------|----------|
| `desktop-shell/head/body/dialog` | `dialog-shell.css`（唯一 `@utility`） |
| `button-link` / `label` / `mono` | `components.utilities.css`（home+detail 共享） |
| status-card / app-button / inline-error… | `pages/home/components.utilities.css`（仅 home） |
| 下载 toast | `core/download-toast.css` |

## 相关

- `scripts/build-css.mjs` · `scripts/stamp-cache-version.mjs`  
- `src/FEATURES.md` · `frontend/README.md`
