export function createTranslationWorkflowStatusAreaPort({
  isVisible = () => false,
  hide = () => {},
  returnHome = () => {},
} = {}) {
  return Object.freeze({
    hide,
    isVisible,
    returnHome,
  });
}
