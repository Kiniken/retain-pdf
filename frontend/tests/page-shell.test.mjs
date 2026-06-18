import test from "node:test";
import assert from "node:assert/strict";

import {
  renderPageShell,
  renderPageShellHtml,
} from "../src/js/bootstrap/page-shell.js";

test("page shell renders bundled partial html through the bootstrap boundary", () => {
  const documentRef = { body: { innerHTML: "" } };

  renderPageShellHtml({
    mainContent: "<main>Library</main>",
    dialogs: "<dialog>Settings</dialog>",
    documentRef,
  });

  assert.equal(documentRef.body.innerHTML, "<main>Library</main><dialog>Settings</dialog>");
});

test("page shell loads legacy partial paths through injected loader", async () => {
  const calls = [];
  const documentRef = { body: { innerHTML: "" } };

  await renderPageShell({
    documentRef,
    loadPartialFn: async (path) => {
      calls.push(path);
      return path.includes("dialogs") ? "<dialog>Legacy</dialog>" : "<main>Legacy</main>";
    },
  });

  assert.deepEqual(calls, [
    "./src/partials/main-content.html",
    "./src/partials/dialogs.html",
  ]);
  assert.equal(documentRef.body.innerHTML, "<main>Legacy</main><dialog>Legacy</dialog>");
});
