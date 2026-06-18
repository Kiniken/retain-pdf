import "./src/js/components/index.js";
import mainContentHtml from "./src/partials/main-content.html";
import dialogsHtml from "./src/partials/dialogs.html";
import { renderPageShellHtml } from "./src/js/bootstrap/page-shell.js";
import { initializeApp } from "./src/js/bootstrap/app-initializer.js";

renderPageShellHtml({ mainContent: mainContentHtml, dialogs: dialogsHtml });
await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
initializeApp();
