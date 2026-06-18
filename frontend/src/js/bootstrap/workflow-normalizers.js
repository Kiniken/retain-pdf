export function normalizeWorkflow(value, { book = "book", translate = "translate", render = "render" } = {}) {
  const workflow = `${value || ""}`.trim();
  if (workflow === translate || workflow === render) {
    return workflow;
  }
  return book;
}

export function normalizeMathMode(value) {
  return `${value || ""}`.trim() === "placeholder" ? "placeholder" : "direct_typst";
}
