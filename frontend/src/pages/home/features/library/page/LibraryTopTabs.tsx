// 主页顶部"图书馆 / 合集 / 收藏"分栏(裸 Tabs 原语,不经 src/components/ui/tabs.jsx
// 默认皮肤——同 StatusDetailDialog/SettingsHubDialog 的既有选择,用项目自有
// class,不接 shadcn 默认视觉)。
//
// 图标化:每个 tab 前置语义图标 + 短文字(纯图标伤 wayfinding)。
// 激活 tab 是纯页面级 UI 态(HomeApp useState),不持久化——刷新回到图书馆。

import { Tabs as TabsPrimitive } from "radix-ui";

// 图书馆:书脊排列在书架上
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
// 合集:多层叠书
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}
// 收藏:书签(段落级摘录/笔记,与合集=文档分组区分)
function IconBookmark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// key 保持 "categories"(契约 id library-top-tab-categories / 测试引用不变)。
// "favorites" 为新增:收藏列表入口。
const TABS = [
  { key: "library", label: "图书馆", Icon: IconLibrary },
  { key: "categories", label: "合集", Icon: IconLayers },
  { key: "favorites", label: "收藏", Icon: IconBookmark },
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
