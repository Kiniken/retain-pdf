import {
  createJobUiRenderPort,
} from "./job-ui-render-port.js";
import {
  createJobUiWorkflowPresentationPort,
} from "./job-ui-workflow-presentation-port.js";

export function createJobUiPresentationPort(overrides = {}) {
  const renderPort = createJobUiRenderPort(overrides.renderPort);
  const workflowPresentationPort = createJobUiWorkflowPresentationPort(
    overrides.workflowPresentationPort,
  );

  return Object.freeze({
    ...renderPort,
    ...workflowPresentationPort,
    renderPort,
    workflowPresentationPort,
    ...overrides,
  });
}
