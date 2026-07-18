// ReaderDialog 开合状态(dialogs 蓝图 §4)——沿用 §0.3 的 createDialogStore 通用
// 工厂,镜像 status-detail-dialog-store.js 的先例。payload 形状
// { jobId, url, anchor }:jobId 用于路由同步(?job_id=&view=reader)与
// job-runtime 轮询关联,url 是 buildReaderPageUrl(jobId, anchor) 算好的
// iframe 目标地址,anchor 是 { pageIdx, blockId } | null(供未来深链场景读)。

import { createDialogStore } from "../../state/dialog-store.js";

export type ReaderDialogPayload = {
  jobId?: string;
  documentId?: string;
  url?: string;
  anchor?: { pageIdx?: number | null; blockId?: string } | null;
};

export function createReaderDialogStore() {
  return createDialogStore<ReaderDialogPayload>({ jobId: "", url: "", anchor: null });
}
