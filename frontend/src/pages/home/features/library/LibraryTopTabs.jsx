// 主页顶部"图书馆 / 分类"分栏(裸 Tabs 原语,不经 src/components/ui/tabs.jsx
// 默认皮肤——同 StatusDetailDialog/SettingsHubDialog 的既有选择,用项目自有
// class,不接 shadcn 默认视觉)。
//
// 激活的 tab 是纯页面级 UI 态,提升到 HomeApp.jsx 的一个 useState(不建独立
// store/不持久化——刷新页面回到"图书馆"是可接受的默认行为,镜像
// LibraryTopTabs 之外本次会话里"分类"整体功能不需要跨会话记忆的判断)。

import { Tabs as TabsPrimitive } from "radix-ui";

const TABS = [
  { key: "library", label: "图书馆" },
  { key: "categories", label: "分类" },
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
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
