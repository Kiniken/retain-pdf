import { defaultPresentationRuntimeStatePort } from "./default-presentation-runtime-state-port.js";
import {
  startElapsedTicker,
  stopElapsedTicker,
} from "./elapsed-presenter.js";
import { createPresentationRuntime } from "./presentation-runtime.js";

export const defaultPresentationRuntime = createPresentationRuntime({
  ...defaultPresentationRuntimeStatePort,
  startTicker: startElapsedTicker,
  stopTicker: stopElapsedTicker,
});
