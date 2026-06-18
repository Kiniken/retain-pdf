import { isJobTerminal } from "../job/core.js";
import { buildElapsedViewModel } from "../job/elapsed-view-model.js";
import { defaultElapsedTimingPort } from "./elapsed-timing-port.js";
import {
  setStatusCardElapsed,
  setTextView,
  statusSectionStatus,
} from "./presentation-view.js";

let elapsedTimingPort = defaultElapsedTimingPort;

export function setElapsedTimingPort(port = defaultElapsedTimingPort) {
  elapsedTimingPort = port || defaultElapsedTimingPort;
}

export function stopElapsedTicker(state) {
  elapsedTimingPort.stop(state);
}

export function renderElapsed(state) {
  const viewModel = buildElapsedViewModel(elapsedTimingPort.snapshot(state), {
    finishedAtFallback: elapsedTimingPort.finishedAt(state),
  });
  setTextView("query-job-duration", viewModel.totalElapsedText);
  setStatusCardElapsed(viewModel.totalElapsedText);
  if (viewModel.hasSnapshot) {
    setTextView("runtime-stage-elapsed", viewModel.stageElapsedText);
    setTextView("runtime-total-elapsed", viewModel.totalElapsedText);
  }
}

export function startElapsedTicker(state) {
  stopElapsedTicker(state);
  const snapshot = elapsedTimingPort.snapshot(state);
  const status = statusSectionStatus();
  renderElapsed(state);
  if (isJobTerminal(snapshot || { status })) {
    return;
  }
  elapsedTimingPort.start(state, () => {
    renderElapsed(state);
  }, 1000);
}
