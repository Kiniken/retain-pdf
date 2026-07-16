// 书架卡片/列表行共用的状态徽标(映射 PDF_MD_lib getLibraryCardBadge 的四态)。
// 返回 { label, cls, icon }(cls 是 shadcn 色系的 Tailwind 类,icon 是
// BadgeIcon 的 name key)或 null(无徽标)。icon 由 library-card-badge-icon.jsx
// 渲染成前置小图标(用户要求"馆藏用馆藏图标、翻译用翻译图标",其余状态一并
// 配齐保持一致)。

import { isRecentJobActive } from "../../../../js/features/recent-jobs/card-presenter.js";
import { isLibraryOnlyItem } from "../../../../js/features/documents-library/document-card-item.js";

export function libraryCardBadge(item = {}) {
  if (isLibraryOnlyItem(item)) {
    return { label: "馆藏", icon: "archive", cls: "border border-border bg-white/95 text-muted-foreground" };
  }
  const status = `${item.status || ""}`.trim();
  if (isRecentJobActive(item)) {
    return { label: "处理中", icon: "loader", cls: "bg-primary/12 text-primary" };
  }
  if (status === "succeeded") {
    return { label: "已翻译", icon: "languages", cls: "bg-primary text-primary-foreground" };
  }
  if (status === "failed") {
    return { label: "失败", icon: "alert", cls: "bg-destructive/12 text-destructive" };
  }
  if (status === "queued") {
    return { label: "排队中", icon: "clock", cls: "bg-muted text-muted-foreground" };
  }
  return null;
}
