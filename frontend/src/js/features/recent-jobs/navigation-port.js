import { APP_EVENTS } from "../../contracts/app-contract.js";
import { createRecentJobsReaderPort } from "./reader-port.js";
import { createRecentJobsRuntimePort } from "./job-runtime-port.js";

export function createRecentJobsNavigationPort({
  closeDialog,
  currentJobId = () => "",
  doc = document,
  jobRuntimePort = createRecentJobsRuntimePort({ currentJobId }),
  readerPort = createRecentJobsReaderPort(),
} = {}) {
  function openWorkflow() {
    doc?.dispatchEvent?.(new CustomEvent(APP_EVENTS.openTranslationWorkflow));
  }

  return {
    currentJobId() {
      return `${jobRuntimePort.currentJobId?.() || currentJobId?.() || ""}`.trim();
    },

    openJob(jobId) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      closeDialog?.();
      openWorkflow();
      return jobRuntimePort.openJob?.(normalizedJobId) !== false;
    },

    openReader(jobId) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      closeDialog?.();
      return readerPort.openReader?.(normalizedJobId) !== false;
    },

    recoverJob(jobId) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      return jobRuntimePort.openJob?.(normalizedJobId) !== false;
    },
  };
}
