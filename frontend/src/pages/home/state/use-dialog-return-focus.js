// Radix Dialog 关闭后的焦点归还补偿(阶段 C:shadcn 改造,dialog 渲染层换血)。
//
// Radix 默认的"关闭后焦点归还触发元素"依赖 DialogPrimitive.Trigger 记录
// context.triggerRef——但本项目的 CredentialsDialog/GlossariesDialog/
// SettingsHubDialog/AppUpdateBanner 这 4 个对话框都不是"Trigger 和 Content
// 同一子树"的经典用法:它们全部通过跨子树的 dialogStore.open()/APP_EVENTS
// 打开(触发按钮在 HeroUpload/SettingsHubDialog 面板/AppShellHeader 等完全
// 不同的组件里),没有渲染 DialogPrimitive.Trigger,Radix 无法知道"是谁打开
// 了我",于是默认的 onCloseAutoFocus(尝试 focus triggerRef.current)是
// no-op——实测验证:关闭后焦点会落到 <body>,不会回到用户刚才点击的按钮。
//
// 这里手动补上等价语义:open 从 false→true 的那一刻,记下当时的
// document.activeElement(几乎总是用户刚点击的触发按钮),对话框关闭时
// (DialogPrimitive.Content 的 onCloseAutoFocus)把焦点还给它,并
// preventDefault 掉 Radix 自己的默认行为。

import { useEffect, useRef } from "react";

export function useDialogReturnFocus(open) {
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement;
    }
  }, [open]);

  function onCloseAutoFocus(event) {
    event.preventDefault();
    const target = previouslyFocusedRef.current;
    if (target && typeof target.focus === "function" && document.contains(target)) {
      target.focus();
    }
  }

  return { onCloseAutoFocus };
}
