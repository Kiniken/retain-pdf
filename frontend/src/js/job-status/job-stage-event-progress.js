import { firstNumber } from "./job-stage-presentation-utils.js";

function textProgressFromEvent(event = {}) {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const text = [
    event?.stage_detail,
    event?.message,
    payload.stage_detail,
    payload.message,
  ].map((value) => `${value || ""}`).join(" ");
  const match = text.match(/\b(?:batch|batches|page|pages|step|steps)\s*(\d+)\s*[\/／]\s*(\d+)/i)
    || text.match(/第\s*(\d+)\s*[\/／]\s*(\d+)\s*(?:页|批|步)/i);
  if (!match) {
    return {
      current: null,
      total: null,
    };
  }
  return {
    current: firstNumber(match[1]),
    total: firstNumber(match[2]),
  };
}

export function progressFromEvent(event) {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const structuredCurrent = firstNumber(
    event?.progress?.current,
    payload.progress?.current,
  );
  const structuredTotal = firstNumber(
    event?.progress?.total,
    payload.progress?.total,
  );
  if (structuredCurrent !== null || structuredTotal !== null) {
    return {
      current: structuredCurrent,
      total: structuredTotal,
    };
  }
  const current = firstNumber(
    event?.progress_current,
    event?.current,
    payload.progress_current,
    payload.render?.progress_current,
    payload.render?.current,
    payload.current,
    payload.current_page,
    payload.page_current,
    payload.currentPage,
    payload.extracted_pages,
    payload.extractedPages,
    payload.rendered_pages,
    payload.renderedPages,
    payload.completed_pages,
    payload.completedPages,
    payload.finished_pages,
    payload.finishedPages,
    payload.pages_done,
    payload.pagesDone,
  );
  const total = firstNumber(
    event?.progress_total,
    event?.total,
    payload.progress_total,
    payload.render?.progress_total,
    payload.render?.total,
    payload.total,
    payload.total_pages,
    payload.totalPages,
    payload.page_total,
    payload.pageTotal,
    payload.num_pages,
    payload.numPages,
    payload.page_count,
    payload.pages,
  );
  if (current !== null || total !== null) {
    return { current, total };
  }
  return textProgressFromEvent(event);
}

export function progressPercentFromEvent(event) {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  return firstNumber(
    event?.progress?.percent,
    payload.progress?.percent,
    event?.progress_percent,
    payload.progress_percent,
    payload.render?.progress_percent,
    payload.render?.percent,
    event?.percent,
    payload.percent,
  );
}
