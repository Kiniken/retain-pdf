import { stageGroupForRawStage } from "./job-stage-contract.js";
import { canonicalStageOf, normalizeUserStage } from "./job-stage-presentation-utils.js";
import { firstNonEmpty, looksLikeProviderPercentProgress } from "./job-status-summary-helpers.js";
import {
  DETAIL_TEXT_MAP,
  TRANSLATION_SUBTYPE_LABELS,
  USER_STAGE_FLOW,
  USER_STAGE_TOTAL,
} from "./job-status-summary-stage-constants.js";

function rawStageOf(payload) {
  return firstNonEmpty(payload.current_stage, payload.stage, payload.runtime?.current_stage).toLowerCase();
}

function stageKeyOf(payload) {
  const canonicalStage = canonicalStageOf(payload);
  if (canonicalStage) {
    return canonicalStage;
  }
  const explicitUserStage = normalizeUserStage(firstNonEmpty(payload.user_stage, payload.payload?.user_stage));
  if (["ocr", "translate", "render", "done"].includes(explicitUserStage)) {
    return explicitUserStage;
  }
  const raw = rawStageOf(payload);
  const status = `${payload.status || ""}`.trim();
  const workflow = firstNonEmpty(payload.workflow, payload.job_type, payload.raw_response?.workflow);
  return stageGroupForRawStage(raw, status, workflow);
}

function stageSubtypeOf(payload) {
  const explicitSubstage = firstNonEmpty(payload.substage, payload.payload?.substage).toLowerCase();
  if (explicitSubstage) {
    if (explicitSubstage.includes("provider_processing") || explicitSubstage.includes("ocr_processing")) {
      return "ocr_processing";
    }
    if (explicitSubstage.includes("normalizing") || explicitSubstage.includes("normaliz")) {
      return stageKeyOf(payload) === "ocr" ? "normalizing" : "translation_prepare";
    }
    if (explicitSubstage.includes("translation_tail_retry") || explicitSubstage.includes("tail_retry")) {
      return "translation_tail_retry";
    }
    if (explicitSubstage.includes("agent_repair")) {
      return "agent_repair";
    }
    if (explicitSubstage.includes("final_untranslated_recovery") || explicitSubstage.includes("untranslated_recovery")) {
      return "final_untranslated_recovery";
    }
    if (explicitSubstage.includes("continuation") || explicitSubstage.includes("cross_page") || explicitSubstage.includes("cross_column")) {
      return "continuation_review";
    }
    if (explicitSubstage.includes("page_policies") || explicitSubstage.includes("page_policy")) {
      return "page_policies";
    }
    if (explicitSubstage.includes("domain")) {
      return "domain_inference";
    }
    if (explicitSubstage.includes("garbled")) {
      return "garbled_repair";
    }
    if (explicitSubstage.includes("render_compile")) {
      return "render_compile";
    }
    if (explicitSubstage.includes("render_prewarm") || explicitSubstage.includes("prewarm")) {
      return "render_prewarm";
    }
    if (explicitSubstage.includes("render_pages")) {
      return "render_pages";
    }
    if (explicitSubstage.includes("render_prepare")) {
      return "render_prepare";
    }
    if (explicitSubstage.includes("translation_prepare") || explicitSubstage.includes("prepare")) {
      return "translation_prepare";
    }
    if (explicitSubstage.includes("batch") || explicitSubstage.includes("translating")) {
      return "translation_batches";
    }
  }
  const raw = rawStageOf(payload);
  const detail = firstNonEmpty(payload.stage_detail, payload.runtime?.current_stage).toLowerCase();
  const text = `${raw} ${detail}`;
  if (raw.includes("startup")) {
    return "startup";
  }
  if (raw.includes("provider_processing") || raw.includes("ocr_processing")) {
    return "ocr_processing";
  }
  if (raw.includes("normalizing") || raw.includes("normaliz")) {
    return stageKeyOf(payload) === "ocr" ? "normalizing" : "translation_prepare";
  }
  if (raw.includes("translation_tail_retry") || raw.includes("tail_retry")) {
    return "translation_tail_retry";
  }
  if (raw.includes("agent_repair")) {
    return "agent_repair";
  }
  if (raw.includes("final_untranslated_recovery") || raw.includes("untranslated_recovery")) {
    return "final_untranslated_recovery";
  }
  if (
    raw.includes("continuation_review")
    || raw.includes("continuation")
    || raw.includes("cross_page")
    || raw.includes("cross_column")
    || text.includes("跨栏")
    || text.includes("跨页")
    || text.includes("连续段")
  ) {
    return "continuation_review";
  }
  if (raw.includes("page_policies") || raw.includes("page_policy") || text.includes("页面策略") || text.includes("块分类")) {
    return "page_policies";
  }
  if (raw.includes("domain_inference") || text.includes("领域") || text.includes("术语")) {
    return "domain_inference";
  }
  if (text.includes("乱码") || text.includes("garbled")) {
    return "garbled_repair";
  }
  if (raw.includes("render_prewarm") || text.includes("prewarm")) {
    return "render_prewarm";
  }
  if (raw.includes("translation_prepare")) {
    return "translation_prepare";
  }
  if (raw.includes("translat") || raw.includes("translate_batch")) {
    return "translation_batches";
  }
  return "";
}

function stageFlowForKey(stageKey) {
  return USER_STAGE_FLOW.find((stage) => stage.key === stageKey) || null;
}

function normalizedStageText(payload) {
  const stageKey = stageKeyOf(payload);
  const substage = firstNonEmpty(payload.substage, payload.payload?.substage);
  const detail = firstNonEmpty(payload.stage_detail, payload.runtime?.current_stage);
  return `${stageKey} ${substage} ${detail}`.toLowerCase();
}

function cleanOcrDetail(rawDetail) {
  return rawDetail.replace(/^OCR\s*子任务[:：]\s*/i, "").trim();
}

function ocrDetailForPayload(rawStage, rawDetail) {
  const cleaned = cleanOcrDetail(rawDetail);
  const text = `${rawStage} ${cleaned}`.toLowerCase();
  if (!stageKeyOf({ current_stage: rawStage }).includes("ocr")) {
    return "";
  }
  if (rawStage.includes("ocr_upload") || rawStage.includes("mineru_upload")) {
    if (text.includes("等待排队") || text.includes("pending")) {
      return cleaned || "OCR 任务已提交，等待解析";
    }
    return "正在上传 PDF";
  }
  if (rawStage.includes("ocr_processing") || rawStage.includes("mineru_processing")) {
    return cleaned || "正在执行云端 OCR";
  }
  if (rawStage.includes("ocr_result_ready")) {
    return cleaned || "OCR 结果已就绪";
  }
  if (rawStage.includes("normaliz")) {
    return cleaned || "正在生成标准化 OCR 文档";
  }
  if (rawStage.includes("ocr_submitting")) {
    return cleaned || "正在启动 OCR 子任务";
  }
  return "";
}

function detailForPayload(payload, fallback) {
  const rawDetail = firstNonEmpty(payload.stage_detail, payload.runtime?.current_stage);
  const rawStage = rawStageOf(payload);
  const rawSubstage = firstNonEmpty(payload.substage, payload.payload?.substage).toLowerCase();
  const stageKey = stageKeyOf(payload);
  const subtype = stageSubtypeOf(payload);
  if (stageKey === "ocr") {
    if (subtype === "ocr_processing") {
      return "正在执行云端 OCR";
    }
    if (subtype === "normalizing") {
      return "正在整理 OCR 结果";
    }
  }
  if (
    stageKey === "translate"
    && (
      rawStage.includes("render")
      || rawSubstage.includes("render")
      || rawDetail.toLowerCase().includes("render")
      || rawDetail.toLowerCase().includes("prewarm")
      || rawDetail.toLowerCase().includes("typst")
    )
  ) {
    return fallback || "正在翻译正文内容";
  }
  const ocrDetail = ocrDetailForPayload(rawStage, rawDetail);
  if (ocrDetail) {
    return ocrDetail;
  }
  const text = `${stageKey} ${rawStage} ${rawSubstage} ${rawDetail}`.toLowerCase();
  const mapped = DETAIL_TEXT_MAP.find((item) => {
    if (stageKey !== "queued" && item.matches.some((keyword) => ["queue", "queued", "pending", "执行槽位", "排队"].includes(keyword))) {
      return false;
    }
    if (stageKey === "translate" && item.matches.some((keyword) => ["ocr", "upload", "normaliz", "paddle", "mineru", "submit"].includes(keyword))) {
      return false;
    }
    return item.matches.some((keyword) => text.includes(keyword));
  });
  if (mapped) {
    return mapped.detail;
  }
  return rawDetail || fallback;
}

function userStageFlowIndex(text) {
  if (["render", "渲染", "生成 pdf", "sav", "保存"].some((keyword) => text.includes(keyword))) {
    return USER_STAGE_FLOW.findIndex((stage) => stage.key === "render");
  }
  if ([
    "translat",
    "开始翻译",
    "翻译",
    "continuation_review",
    "page_policies",
    "garbled",
    "garbled_repair",
    "translation_tail_retry",
    "agent_repair",
    "final_untranslated_recovery",
    "translation_prepare",
    "翻译批次",
    "跨栏",
    "跨页",
    "连续段",
    "页面策略",
    "块分类",
    "乱码",
  ].some((keyword) => text.includes(keyword))) {
    return USER_STAGE_FLOW.findIndex((stage) => stage.key === "translate");
  }
  if (["ocr", "parse", "mineru", "paddle", "normaliz", "standard", "document", "startup", "标准化", "ocr_result_ready"].some((keyword) => text.includes(keyword))) {
    return USER_STAGE_FLOW.findIndex((stage) => stage.key === "ocr");
  }
  return -1;
}

function userStageFor(payload) {
  const stageKey = stageKeyOf(payload);
  const detailText = normalizedStageText(payload);
  if (payload.status === "succeeded") {
    return {
      key: "done",
      label: "完成",
      detail: "翻译 PDF 已生成",
      step: USER_STAGE_TOTAL,
      total: USER_STAGE_TOTAL,
    };
  }
  if (payload.status === "failed") {
    return {
      key: "failed",
      label: "失败",
      detail: "任务失败，请查看详情",
      step: null,
      total: USER_STAGE_TOTAL,
    };
  }
  if (payload.status === "canceled") {
    return {
      key: "canceled",
      label: "已取消",
      detail: "任务已取消",
      step: null,
      total: USER_STAGE_TOTAL,
    };
  }
  if (
    (payload.status === "queued"
      || stageKey === "queued"
      || detailText.includes("queue")
      || detailText.includes("pending")
      || detailText.includes("排队"))
    && !["ocr", "translate", "render"].includes(stageKey)
  ) {
    return {
      key: "queued",
      label: "排队中",
      detail: detailForPayload(payload, "等待可用执行槽位"),
      step: null,
      total: USER_STAGE_TOTAL,
    };
  }
  const directStage = stageFlowForKey(stageKey);
  if (directStage) {
    const matchIndex = USER_STAGE_FLOW.findIndex((stage) => stage.key === directStage.key);
    return {
      ...directStage,
      detail: detailForPayload(payload, directStage.detail),
      step: matchIndex + 1,
      total: USER_STAGE_TOTAL,
    };
  }
  const matchIndex = userStageFlowIndex(detailText);
  if (matchIndex >= 0) {
    const stage = USER_STAGE_FLOW[matchIndex];
    return {
      ...stage,
      detail: detailForPayload(payload, stage.detail),
      step: matchIndex + 1,
      total: USER_STAGE_TOTAL,
    };
  }
  if (payload.status === "running") {
    return {
      key: "running",
      label: "处理中",
      detail: detailForPayload(payload, "正在处理任务"),
      step: null,
      total: USER_STAGE_TOTAL,
    };
  }
  return {
    key: "idle",
    label: "等待中",
    detail: "等待任务开始",
    step: null,
    total: USER_STAGE_TOTAL,
  };
}

function userStageLabel(payload) {
  const stage = userStageFor(payload);
  if (stage.step && stage.total && payload.status !== "succeeded") {
    const subtype = stageSubtypeOf(payload);
    const subtypeLabel = TRANSLATION_SUBTYPE_LABELS[subtype] || stage.label;
    return `第 ${stage.step}/${stage.total} 步 · ${subtypeLabel}`;
  }
  return stage.label;
}

export {
  DETAIL_TEXT_MAP,
  USER_STAGE_FLOW,
  USER_STAGE_TOTAL,
  detailForPayload,
  normalizedStageText,
  rawStageOf,
  stageFlowForKey,
  stageKeyOf,
  stageSubtypeOf,
  userStageFlowIndex,
  userStageFor,
  userStageLabel,
};
