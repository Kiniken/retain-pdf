import {
  normalizeSubstageKey,
  substageDetail,
  substageProgressRange,
} from "./job-stage-substage-contract.js";

function percentForProgress(progress) {
  const rawCurrent = progress?.current;
  const rawTotal = progress?.total;
  const current = Number(rawCurrent);
  const total = Number(rawTotal);
  if (rawCurrent !== null && rawCurrent !== undefined && rawTotal !== null && rawTotal !== undefined && Number.isFinite(current) && Number.isFinite(total)) {
    if (total > 0) {
      return Math.max(0, Math.min(1, current / total));
    }
    return current >= 0 ? 1 : null;
  }
  const percent = Number(progress?.progressPercent);
  if (Number.isFinite(percent)) {
    return Math.max(0, Math.min(1, percent > 1 ? percent / 100 : percent));
  }
  return null;
}

function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.max(0, Math.min(100, numericValue));
}

function localPercentForSubstage(ratio = null) {
  const safeRatio = ratio === null || ratio === undefined
    ? 0
    : Math.max(0, Math.min(1, Number(ratio)));
  if (!Number.isFinite(safeRatio)) {
    return null;
  }
  return clampPercent(safeRatio * 100);
}

function hasMeasurableProgress(progress) {
  const current = Number(progress?.current);
  const total = Number(progress?.total);
  return Number.isFinite(current) && Number.isFinite(total) && total > 0;
}

function sourceProgressUnitForRecord(progressRecord = {}) {
  return `${progressRecord.sourceProgressUnit
    || progressRecord.progressUnit
    || progressRecord.payload?.progress?.unit
    || progressRecord.payload?.progress_unit
    || ""}`.trim();
}

function translationSubstageKeyForRecord(progressRecord = {}) {
  const candidates = [
    progressRecord.substageKey,
    progressRecord.visualStageKey,
    progressRecord.payload?.substage,
    progressRecord.payload?.stage,
    progressRecord.payload?.current_stage,
    progressRecord.payload?.internal_stage,
    progressRecord.payload?.stage_detail,
    progressRecord.payload?.message,
  ];
  for (const candidate of candidates) {
    const key = normalizeSubstageKey(candidate);
    if (key && substageProgressRange(key)) {
      return key;
    }
  }
  const unit = sourceProgressUnitForRecord(progressRecord);
  if (unit === "batch") {
    return "translation_batches";
  }
  return "";
}

function fallbackRatioForSubstage(progressRecord = {}, substageKey = "") {
  if (!substageKey) {
    return null;
  }
  const hasProgressSignal = Boolean(sourceProgressUnitForRecord(progressRecord))
    || Boolean(progressRecord.payload?.progress && typeof progressRecord.payload.progress === "object");
  return hasProgressSignal ? 0 : null;
}

function fallbackProgressForRecord(progressRecord = {}, substageKey = "") {
  if (!substageKey) {
    return null;
  }
  const ratio = percentForProgress(progressRecord) ?? fallbackRatioForSubstage(progressRecord, substageKey);
  if (ratio === null) {
    return null;
  }
  return {
    current: Math.round(ratio * 100),
    total: 100,
    progressUnit: "percent",
  };
}

function progressTextForRecord(progressRecord = {}, substageKey = "", ratio = null) {
  const sourceUnit = sourceProgressUnitForRecord(progressRecord);
  const hasMeasurableTotal = Number(progressRecord.total) > 0;
  if (sourceUnit === "none" || !hasMeasurableTotal) {
    return substageDetail(substageKey) || progressRecord.progressText || "";
  }
  if (substageKey === "translation_batches" && ratio >= 1) {
    return "翻译批次完成";
  }
  return progressRecord.progressText || substageDetail(substageKey) || "";
}

export function compositeTranslationProgressFromRecord(progressRecord = null) {
  if (!progressRecord || progressRecord.stageKey !== "translate") {
    return progressRecord;
  }
  const substageKey = translationSubstageKeyForRecord(progressRecord);
  if (!substageProgressRange(substageKey)) {
    return progressRecord;
  }
  const ratio = percentForProgress(progressRecord) ?? fallbackRatioForSubstage(progressRecord, substageKey);
  const fallbackProgress = fallbackProgressForRecord(progressRecord, substageKey);
  if (!hasMeasurableProgress(progressRecord) && !fallbackProgress) {
    return progressRecord;
  }
  const measured = hasMeasurableProgress(progressRecord);
  const progressUnit = measured ? progressRecord.progressUnit : fallbackProgress.progressUnit;
  return {
    ...progressRecord,
    current: measured ? progressRecord.current : fallbackProgress.current,
    total: measured ? progressRecord.total : fallbackProgress.total,
    displayPercent: localPercentForSubstage(ratio),
    progressUnit,
    sourceProgressUnit: sourceProgressUnitForRecord(progressRecord),
    progressText: progressTextForRecord(progressRecord, substageKey, ratio),
    substageKey,
    payload: {
      ...progressRecord.payload,
      substage: progressRecord.payload?.substage || substageKey,
      progress_unit: progressUnit,
    },
    indeterminate: false,
  };
}
