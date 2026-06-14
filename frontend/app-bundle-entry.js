import "@awesome.me/webawesome/dist/styles/webawesome.css";
import "@awesome.me/webawesome/dist/components/badge/badge.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/card/card.js";
import "@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js";
import "@awesome.me/webawesome/dist/components/progress-ring/progress-ring.js";
import "./src/js/components/index.js";
import mainContentHtml from "./src/partials/main-content.html";
import dialogsHtml from "./src/partials/dialogs.html";
import { initializeApp } from "./src/js/main.js";

document.body.innerHTML = `${mainContentHtml}${dialogsHtml}`;
await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
initializeApp();
