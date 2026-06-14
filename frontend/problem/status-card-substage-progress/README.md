# 状态卡子阶段进度问题

## 背景

任务状态卡需要同时展示 OCR、翻译、渲染三个大阶段，以及各自的子阶段进度。后端事件可能包含：

- `stage` / `display_stage`
- `substage`
- `lane`
- `progress.unit/current/total/percent`

这里记录状态卡对子阶段的真实浏览器渲染验证，避免只靠 Node 单元测试判断。

## 覆盖场景

- OCR: `ocr_processing`，页进度 `28/33`
- 翻译: `page_policies`，页进度 `3/10`
- 渲染: `render_compile`，step 进度 `1/4`，前端合成为百分比进度

## 文件

- `index.html`: 最小复现页面，加载真实 `job-status-card` Web Component 和 `styles.css`
- `run.sh`: 自动启动静态服务、运行 Chromium 截图、导出 DOM 和 JSON 断言
- `status-card-smoke.png`: 手动或自动截图输出
- `status-card-smoke.json`: DOM 验证结果输出

## 运行

在 `frontend` 目录下执行：

```bash
problem/status-card-substage-progress/run.sh
```

也可以手动执行：

```bash
python3 scripts/serve_static.py --host 127.0.0.1 --port 41777 --root .
```

另一个终端执行：

```bash
chromium-browser \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --window-size=1800,760 \
  --screenshot=problem/status-card-substage-progress/status-card-smoke.png \
  http://127.0.0.1:41777/problem/status-card-substage-progress/index.html
```

DOM 验证：

```bash
chromium-browser \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --virtual-time-budget=3000 \
  --dump-dom \
  http://127.0.0.1:41777/problem/status-card-substage-progress/index.html \
  > problem/status-card-substage-progress/status-card-smoke.dom.html
```

## 预期

- OCR 卡片 active stage 为 `ocr`，active substage 为 `ocr_processing`
- 翻译卡片 active stage 为 `translate`，active substage 为 `page_policies`
- 渲染卡片 active stage 为 `render`，active substage 为 `render_compile`
- 进度文案分别为：
  - `第 28/33 页`
  - `第 3/10 页`
  - `编译 1/4`

## 最近验证

2026-06-14 19:46 已使用本机 Chromium 验证通过：

- 截图：`status-card-smoke.png`
- DOM：`status-card-smoke.dom.html`
- 结构化结果：`status-card-smoke.json`

验证结果：

```json
[
  {
    "id": "ocr-card",
    "activeStage": "ocr",
    "activeSubstage": "ocr_processing",
    "progressText": "第 28/33 页",
    "progressWidth": "84.8485%"
  },
  {
    "id": "translate-card",
    "activeStage": "translate",
    "activeSubstage": "page_policies",
    "progressText": "第 3/10 页",
    "progressWidth": "30%"
  },
  {
    "id": "render-card",
    "activeStage": "render",
    "activeSubstage": "render_compile",
    "progressText": "编译 1/4",
    "progressWidth": "85%"
  }
]
```
