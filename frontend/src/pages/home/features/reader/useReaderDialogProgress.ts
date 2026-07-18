// 阅读器加载进度条(dialogs 蓝图 §4)——rAF easing 动画,逐帧直写
// bar/percent 元素的 style.width / textContent(不进 React state),
// 镜像旧世界 features/reader-dialog/view.js#animateReaderProgressValue 的
// 缓动曲线与节流参数,行为逐字节对齐。

import { useCallback, useEffect, useRef } from "react";

function easeOutCubic(value) {
  return 1 - ((1 - value) ** 3);
}

// jsdom 测试环境的既有约定(status/useStagedProgressAnimation.js 等既存 hook
// 全部走 setTimeout,本 hook 是新世界第一个手写 rAF 循环)只 polyfill
// requestAnimationFrame,不 polyfill cancelAnimationFrame——防御性判空,
// 真实浏览器恒有该函数,不影响生产行为。
function cancelFrame(frameId) {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(frameId);
  }
}

export function useReaderDialogProgress({ barRef, percentRef }) {
  const progressState = useRef({ value: 0, target: 0, rafId: 0 });

  const applyWidth = useCallback((value) => {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    if (barRef.current) {
      barRef.current.style.width = `${safeValue}%`;
    }
    if (percentRef.current) {
      percentRef.current.textContent = `${safeValue.toFixed(0)}%`;
    }
  }, [barRef, percentRef]);

  const setProgress = useCallback((nextValue) => {
    const state = progressState.current;
    const target = Math.max(0, Math.min(100, Number(nextValue) || 0));
    const from = Number(state.value) || 0;

    if (Math.abs(from - target) < 0.1) {
      state.value = target;
      state.target = target;
      applyWidth(target);
      return;
    }

    state.target = target;
    if (state.rafId) {
      cancelFrame(state.rafId);
      state.rafId = 0;
    }

    const duration = Math.max(480, Math.min(1400, Math.abs(target - from) * 18));
    const startedAt = performance.now();

    // 故意不用 rAF 回调参数传入的时间戳,自己重新读 performance.now()——
    // 这份仓库 jsdom 测试的既有约定统一把 requestAnimationFrame polyfill 成
    // `(cb) => setTimeout(() => cb(0), 0)`(参数写死 0,不是真实高精度时间),
    // 若信任回调参数,elapsed 会恒为负数,缓动永远卡在 t=0 死循环。真实浏览器
    // 下两种取时间戳的方式效果等价(同一帧内 performance.now() 与 rAF 参数
    // 几乎不差),生产行为不变。
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      const value = from + ((target - from) * easeOutCubic(t));
      state.value = value;
      applyWidth(value);
      if (t < 1) {
        state.rafId = requestAnimationFrame(tick);
        return;
      }
      state.value = target;
      state.rafId = 0;
      applyWidth(target);
    };

    state.rafId = requestAnimationFrame(tick);
  }, [applyWidth]);

  const resetProgress = useCallback(() => {
    const state = progressState.current;
    if (state.rafId) {
      cancelFrame(state.rafId);
      state.rafId = 0;
    }
    state.value = 0;
    state.target = 0;
    applyWidth(0);
  }, [applyWidth]);

  useEffect(() => () => {
    if (progressState.current.rafId) {
      cancelFrame(progressState.current.rafId);
      progressState.current.rafId = 0;
    }
  }, []);

  return { setProgress, resetProgress };
}
