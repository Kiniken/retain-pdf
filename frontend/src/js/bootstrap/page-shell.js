async function loadPartial(relativePath) {
  const url = new URL(relativePath, window.location.href);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载页面片段失败: ${relativePath}`);
  }
  return response.text();
}

export function renderPageShellHtml({
  mainContent = "",
  dialogs = "",
  documentRef = document,
} = {}) {
  documentRef.body.innerHTML = `${mainContent}${dialogs}`;
}

export async function renderPageShell({
  loadPartialFn = loadPartial,
  documentRef = document,
  mainContentPath = "./src/partials/main-content.html",
  dialogsPath = "./src/partials/dialogs.html",
} = {}) {
  const [mainContent, dialogs] = await Promise.all([
    loadPartialFn(mainContentPath),
    loadPartialFn(dialogsPath),
  ]);
  renderPageShellHtml({ mainContent, dialogs, documentRef });
}
