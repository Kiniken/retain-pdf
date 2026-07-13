// 卡片封面图加载 hook(蓝图 §2 features/library/,风险缓解 §8.3)。
//
// 复用:image-loader.js facade 的 loadFirstRecentJobImage(模块级 objectURL
// 缓存,从不 revoke——React 卸载**不得** revoke,失效只走
// invalidateRecentJobImages,这里完全不触碰缓存生命周期);card-presenter.js
// facade 的 recentJobRawImageUrls 取候选 URL 列表。
//
// imageCacheVersionOf 从 recent-job-card.js:12-29 拷贝(facade 未导出这个纯
// 函数,按蓝图口径直接拷贝而非新增导出面)。token 防竞态:job 切换或候选 URL
// 变化时递增 token,异步 resolve 回来时核对 token 仍是最新才写 state,防止
// 卡片快速复用时旧请求的图片覆盖新请求。

import { useEffect, useRef, useState } from "react";
import { loadFirstRecentJobImage } from "../../../../js/features/recent-jobs/image-loader.js";
import { recentJobRawImageUrls } from "../../../../js/features/recent-jobs/card-presenter.js";

function imageCacheVersionOf(item = {}) {
  const progress = item.progress && typeof item.progress === "object" ? item.progress : {};
  const runtimeProgress = item.runtime_status?.progress && typeof item.runtime_status.progress === "object"
    ? item.runtime_status.progress
    : {};
  return [
    item.updated_at, item.status, item.display_stage, item.substage,
    progress.current, progress.total, progress.percent,
    runtimeProgress.current, runtimeProgress.total, runtimeProgress.percent,
  ].map((value) => `${value ?? ""}`).join("|");
}

export function useRecentJobCover(item) {
  const [coverUrl, setCoverUrl] = useState(null);
  const tokenRef = useRef(0);

  const rawUrls = recentJobRawImageUrls(item);
  const cacheVersion = imageCacheVersionOf(item);
  const rawUrlsKey = rawUrls.join("|");

  useEffect(() => {
    const token = (tokenRef.current += 1);
    if (rawUrls.length === 0) {
      setCoverUrl(null);
      return undefined;
    }
    let cancelled = false;
    loadFirstRecentJobImage(rawUrls, { cacheVersion })
      .then((url) => {
        if (cancelled || tokenRef.current !== token) {
          return;
        }
        setCoverUrl(url || null);
      })
      .catch(() => {
        if (cancelled || tokenRef.current !== token) {
          return;
        }
        setCoverUrl(null);
      });
    return () => {
      cancelled = true;
    };
    // rawUrlsKey/cacheVersion 是 rawUrls/cacheVersion 的 primitive 化,用作
    // effect 依赖(数组/对象每次渲染新引用,不能直接进依赖表)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawUrlsKey, cacheVersion]);

  return coverUrl;
}
