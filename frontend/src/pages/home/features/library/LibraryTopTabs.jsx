// 主页顶部"图书馆 / 分类"分栏(裸 Tabs 原语,不经 src/components/ui/tabs.jsx
// 默认皮肤——同 StatusDetailDialog/SettingsHubDialog 的既有选择,用项目自有
// class,不接 shadcn 默认视觉)。
//
// 图标化(用户要求"少文字多图标"):每个 tab 前置一个语义图标(图书馆=书、
// 分类=文件夹),文字保留但压缩——两个主导航项去掉文字会伤 wayfinding
// (apple-design skill:导航项要有可辨识的名字),所以走 icon + 短文字。
//
// 激活的 tab 是纯页面级 UI 态,提升到 HomeApp.jsx 的一个 useState(不建独立
// store/不持久化——刷新页面回到"图书馆"是可接受的默认行为)。

import { Tabs as TabsPrimitive } from "radix-ui";

// 图书馆:library(书脊排列在书架上,比单本书更"图书馆")
function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </svg>
  );
}
// 合集:layers(多本叠成一摞,对应"合集=一堆书归到一起")
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

// key 保持 "categories"(内部逻辑 + 契约 id library-top-tab-categories 不变,
// 测试引用),只把展示文案从"分类"改成"合集"——和书籍详情/批量里的"加入
// 合集"统一叫法。
const TABS = [
  { key: "library", label: "图书馆", Icon: IconLibrary },
  { key: "categories", label: "合集", Icon: IconLayers },
];

export function LibraryTopTabs({ active, onChange }) {
  return (
    <TabsPrimitive.Root
      className="library-top-tabs-root"
      value={active}
      onValueChange={onChange}
    >
      <TabsPrimitive.List className="library-top-tabs" aria-label="图书馆视图">
        {TABS.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.key}
            value={tab.key}
            id={`library-top-tab-${tab.key}`}
            className={`library-top-tab ${active === tab.key ? "is-active" : ""}`.trim()}
          >
            <tab.Icon />
            <span>{tab.label}</span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
