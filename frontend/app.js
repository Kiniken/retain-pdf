import "./src/js/components/index.js";
import { renderPageShell } from "./src/js/bootstrap/page-shell.js";
import { initializeApp } from "./src/js/bootstrap/app-initializer.js";

await renderPageShell();
await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
initializeApp();
