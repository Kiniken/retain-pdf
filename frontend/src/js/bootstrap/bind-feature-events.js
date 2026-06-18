import { bindMainEvents } from "./main-events.js";
import {
  defaultBindFeatureEventsPorts,
} from "./bind-feature-events-ports.js";
import {
  buildMainEventsBindingPayload,
} from "./bind-feature-events-payloads.js";

export function bindFeatureEvents(features, ports = defaultBindFeatureEventsPorts) {
  bindMainEvents(buildMainEventsBindingPayload({ features, ports }));
}
