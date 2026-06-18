export function createJobRuntimeShellViewPort({
  closeDialogs = () => {},
  isReaderOpen = () => false,
  resetEvents = () => {},
  setCancelDisabled = () => {},
} = {}) {
  return {
    closeDialogs,
    isReaderOpen,
    resetEvents,
    setCancelDisabled,
  };
}
