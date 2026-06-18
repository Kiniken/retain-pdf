import {
  eventRecordForMainStatus,
  keepForwardStageKey,
  latestMainStageEventRecord,
} from "./main-lane-stage-selection.js";
import {
  normalizedStageEventRecord,
} from "./job-stage-event-record.js";

export { keepForwardStageKey };

export function eventStageForMainStatus(job = {}, item = {}, {
  currentStageKey = "",
  publicJobStageKey = "",
} = {}) {
  const record = normalizedStageEventRecord(item);
  return eventRecordForMainStatus(job, record, {
    currentStageKey,
    publicJobStageKey,
  });
}

export function latestStageEvent(job, eventsPayload) {
  const candidate = latestMainStageEventRecord(job, eventsPayload);
  return candidate?.item || null;
}
