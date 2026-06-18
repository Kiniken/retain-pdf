import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const JS_ROOT = join(PROJECT_ROOT, "src/js");
const FEATURE_ROOT = join(JS_ROOT, "features");
const BOOTSTRAP_ROOT = join(JS_ROOT, "bootstrap");
const SOURCE_ROOTS = {
  api: join(JS_ROOT, "api"),
  bootstrap: BOOTSTRAP_ROOT,
  components: join(JS_ROOT, "components"),
  config: join(JS_ROOT, "config"),
  contracts: join(JS_ROOT, "contracts"),
  desktop: join(JS_ROOT, "desktop"),
  features: FEATURE_ROOT,
  job: join(JS_ROOT, "job"),
  jobDetail: join(JS_ROOT, "job-detail"),
  jobStatus: join(JS_ROOT, "job-status"),
  reader: join(JS_ROOT, "reader"),
  state: join(JS_ROOT, "state"),
  statusDetail: join(JS_ROOT, "status-detail"),
  ui: join(JS_ROOT, "ui"),
  utils: join(JS_ROOT, "utils"),
};
const APP_ENTRYPOINTS = [
  join(PROJECT_ROOT, "app.js"),
  join(PROJECT_ROOT, "app-bundle-entry.js"),
];
const VIEW_IMPORT_PATTERN = /from\s+["']\.\/view\.js["']/;
const LEGACY_STATE_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+state\/store\.js["']/;
const ROOT_COMPAT_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+(?:state|job)\.js["']/;
const ROOT_PROVIDER_CONFIG_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+provider-config\.js["']/;
const ROOT_CONFIG_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+config\.js["']/;
const ROOT_TEMPLATES_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+templates\.js["']/;
const ROOT_DOM_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+dom\.js["']/;
const ROOT_MAIN_IMPORT_PATTERN = /from\s+["'](?:\.\/src\/js\/main\.js|(?:\.\.\/)+main\.js)["']/;
const JOBS_API_BARREL_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+api\/jobs\.js["']/;
const APP_FRAMEWORK_BARREL_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+app-framework(?:\/index\.js)?["']/;
const FEATURE_UI_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+ui\//;
const FEATURE_UPLOAD_CONSTANTS_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+config\/upload-constants\.js["']/;
const WEBAWESOME_USAGE_PATTERN = /@awesome\.me\/webawesome|<wa-|wa-(?:button|dialog|progress|badge|card|progress-ring|progress-bar)\b|WebAwesome|Web Awesome/;
const SHARED_DIALOG_SHELL_SELECTOR_PATTERN = /^\s*\.(?:desktop-dialog|desktop-shell|desktop-head|desktop-body|dialog-close-btn)(?:\s|[,{:#.])/m;
const APP_UPDATE_SELECTOR_PATTERN = /^\s*\.app-update-[\w-]+(?:\s|[,{:#.])/m;
const LIBRARY_SHELL_SELECTOR_PATTERN = /^\s*(?:\.(?:page|app-shell|topbar|app-shell-header|library-[\w-]+|home-action-btn|brand-[\w-]+|hero(?:-[\w-]+)?)(?:\s|[,{:#.])|#recent-jobs-list\.library-grid\b|\.recent-jobs-more-row\s+#load-more-jobs-btn\b)/m;
const API_PREFIX_FROM_ROOT_CONSTANTS_PATTERN = /import\s*{[^}]*API_PREFIX[^}]*}\s*from\s+["'](?:\.\.\/)+constants\.js["']/s;
const UPLOAD_CONSTANTS_FROM_ROOT_PATTERN = /import\s*{[^}]*(?:DEFAULT_FILE_LABEL|FRONT_MAX_BYTES|FRONT_MAX_PAGE_COUNT)[^}]*}\s*from\s+["'](?:\.\.\/)+constants\.js["']/s;
const MODEL_CONSTANTS_FROM_ROOT_PATTERN = /import\s*{[^}]*(?:DEFAULT_MODEL|DEFAULT_BASE_URL|DEFAULT_MODEL_VERSION)[^}]*}\s*from\s+["'](?:\.\.\/)+constants\.js["']/s;
const STORAGE_KEYS_FROM_ROOT_PATTERN = /import\s*{[^}]*(?:BROWSER_CONFIG_STORAGE_KEY|DEVELOPER_CONFIG_STORAGE_KEY)[^}]*}\s*from\s+["'](?:\.\.\/)+constants\.js["']/s;
const WORKFLOW_DEFAULTS_FROM_ROOT_PATTERN = /import\s*{[^}]*(?:DEFAULT_MODE|DEFAULT_LANGUAGE|DEFAULT_RULE_PROFILE|DEFAULT_RENDER_MODE|DEFAULT_TYPST_FONT_FAMILY|DEFAULT_PDF_COMPRESS_DPI|DEFAULT_TRANSLATED_PDF_NAME|DEFAULT_BODY_FONT_SIZE_FACTOR|DEFAULT_BODY_LEADING_FACTOR|DEFAULT_INNER_BBOX_SHRINK_X|DEFAULT_INNER_BBOX_SHRINK_Y|DEFAULT_INNER_BBOX_DENSE_SHRINK_X|DEFAULT_INNER_BBOX_DENSE_SHRINK_Y|DEFAULT_FONT_UNIFY_MODE|DEFAULT_WORKERS|DEFAULT_BATCH_SIZE|DEFAULT_CLASSIFY_BATCH_SIZE|DEFAULT_COMPILE_WORKERS|DEFAULT_TIMEOUT_SECONDS)[^}]*}\s*from\s+["'](?:\.\.\/)+constants\.js["']/s;
const BOOTSTRAP_EXTERNAL_IMPORT_PATTERN = /from\s+["']\.\.\/(?:features|ui|api|state)\/|from\s+["']\.\.\/(?:config|constants)\.js["']/;
const BOOTSTRAP_GROUPED_PORT_FILES = [
  "app-initializer-ports.js",
  "bind-feature-events-ports.js",
  "config-bootstrap-ports.js",
  "core-app-shell-job-actions-port.js",
  "core-feature-controllers-port.js",
  "core-feature-mount-ports.js",
  "credential-action-feature-controllers-port.js",
  "credential-action-mount-ports.js",
  "credential-runtime-config-port.js",
  "credential-runtime-data-port.js",
  "credential-runtime-defaults-port.js",
  "credential-runtime-mount-port.js",
  "credential-task-options-defaults-port.js",
  "credential-task-options-mount-port.js",
  "credential-ui-job-actions-port.js",
  "credential-ui-mount-port.js",
  "dynamic-primary-actions-port.js",
  "feature-registry-ports.js",
  "glossary-data-mount-port.js",
  "glossary-mount-ports.js",
  "glossary-runtime-mount-port.js",
  "job-data-mount-port.js",
  "job-feature-controllers-port.js",
  "job-mount-ports.js",
  "job-runtime-mount-port.js",
  "job-translation-debug-mount-port.js",
  "job-ui-mount-port.js",
  "main-event-port.js",
  "startup-route-ports.js",
  "startup-route-recent-jobs-feature-port.js",
  "startup-route-recent-jobs-port.js",
  "startup-route-runtime-port.js",
  "upload-runtime-data-port.js",
  "upload-runtime-mount-port.js",
  "upload-runtime-ui-port.js",
  "upload-workflow-feature-controllers-port.js",
  "upload-workflow-mount-ports.js",
  "workflow-config-defaults-port.js",
  "workflow-config-mount-port.js",
  "workflow-config-runtime-port.js",
  "workflow-config-state-port.js",
  "workflow-glossary-mount-port.js",
  "workflow-glossary-runtime-port.js",
];
const BOOTSTRAP_GROUPED_PORT_DISCOVERY_ALLOWLIST = new Set([
  "credential-runtime-leaf-ports.js",
  "feature-app-action-ports.js",
  "feature-credentials-ports.js",
  "feature-job-runtime-ports.js",
  "feature-upload-ports.js",
  "feature-workflow-ports.js",
  "submit-flow-ports.js",
  "upload-runtime-leaf-ports.js",
]);

const BOOTSTRAP_EXTERNAL_IMPORT_ALLOWLIST = new Set([
  "artifact-downloads-runtime-port.js",
  "app-actions-job-snapshot-port.js",
  "app-initializer-data-http-port.js",
  "app-initializer-data-jobs-port.js",
  "app-initializer-environment-port.js",
  "app-initializer-legacy-state-port.js",
  "app-initializer-persisted-config-port.js",
  "app-initializer-ui-port.js",
  "bind-feature-events-data-port.js",
  "bind-feature-events-legacy-state-port.js",
  "bind-feature-events-main-event-port.js",
  "bind-feature-events-ui-port.js",
  "config-bootstrap-credentials-port.js",
  "config-bootstrap-developer-state-port.js",
  "config-bootstrap-model-defaults-port.js",
  "config-bootstrap-ocr-defaults-port.js",
  "core-app-shell-action-buttons-port.js",
  "core-app-shell-file-picker-port.js",
  "core-app-shell-job-presentation-port.js",
  "core-app-shell-progress-port.js",
  "core-app-shell-text-port.js",
  "core-app-shell-upload-reset-port.js",
  "core-app-shell-feature-controller-port.js",
  "core-app-update-feature-controller-port.js",
  "core-home-mount-port.js",
  "core-home-feature-controller-port.js",
  "core-presentation-mount-port.js",
  "core-translation-workflow-feature-controller-port.js",
  "core-translation-workflow-status-area-port.js",
  "credential-app-actions-feature-controller-port.js",
  "credential-artifact-downloads-feature-controller-port.js",
  "credential-browser-feature-controller-port.js",
  "credential-browser-view-port.js",
  "credential-action-state-adapter-port.js",
  "credential-desktop-config-port.js",
  "credential-legacy-state-mount-port.js",
  "credential-provider-deepseek-data-port.js",
  "credential-provider-defaults-port.js",
  "credential-provider-validation-deps-port.js",
  "credential-provider-validation-port.js",
  "credential-provider-ocr-data-port.js",
  "credential-runtime-api-config-port.js",
  "credential-runtime-app-actions-config-port.js",
  "credential-runtime-endpoint-port.js",
  "credential-runtime-jobs-port.js",
  "credential-runtime-leaf-ports.js",
  "credential-runtime-model-defaults-port.js",
  "credential-runtime-ocr-defaults-port.js",
  "credential-runtime-persistence-port.js",
  "credential-runtime-protected-fetch-port.js",
  "credential-task-options-developer-state-port.js",
  "credential-task-options-legacy-state-port.js",
  "credential-task-options-persistence-port.js",
  "credential-ui-hidden-port.js",
  "credential-ui-job-action-effects-port.js",
  "credential-ui-presentation-port.js",
  "credential-ui-text-port.js",
  "dynamic-primary-actions-reader-port.js",
  "dynamic-primary-actions-text-port.js",
  "feature-registry-library-event-port.js",
  "glossary-controller-mount-port.js",
  "glossary-data-api-port.js",
  "glossary-runtime-config-port.js",
  "job-data-http-port.js",
  "job-data-control-port.js",
  "job-data-read-port.js",
  "job-data-status-port.js",
  "job-feature-mount-payloads.js",
  "job-legacy-state-mount-port.js",
  "job-runtime-job-presentation-port.js",
  "job-runtime-reset-state-port.js",
  "legacy-state-helper-adapters.js",
  "job-runtime-config-port.js",
  "job-runtime-feature-controller-port.js",
  "job-runtime-shell-port.js",
  "job-translation-debug-data-port.js",
  "job-ui-job-actions-port.js",
  "job-ui-render-port.js",
  "job-ui-text-port.js",
  "job-ui-workflow-presentation-port.js",
  "main-event-browser-config-persistence-port.js",
  "main-event-credential-persistence-port.js",
  "main-event-hidden-credential-binding-port.js",
  "main-event-hidden-credential-port.js",
  "main-event-overrides-port.js",
  "main-feature-lifecycle-events.js",
  "main-shell-event-bindings.js",
  "reader-dialog-runtime-port.js",
  "startup-route-config-port.js",
  "startup-route-active-job-storage-port.js",
  "startup-route-current-job-port.js",
  "startup-route-home-state-port.js",
  "startup-route-reader-port.js",
  "startup-reader-open-flow.js",
  "startup-route-recent-jobs-controller-port.js",
  "startup-route-recent-jobs-reader-port.js",
  "startup-route-recent-jobs-runtime-port.js",
  "startup-route-recent-jobs-stage-adapter-port.js",
  "startup-route-recent-jobs-state-port.js",
  "status-detail-feature-controller-port.js",
  "status-detail-job-action-resolver-port.js",
  "status-detail-runtime-port.js",
  "startup-route-ui-port.js",
  "upload-runtime-config-port.js",
  "upload-runtime-defaults-port.js",
  "upload-runtime-http-port.js",
  "upload-runtime-job-actions-port.js",
  "upload-runtime-legacy-state-port.js",
  "upload-runtime-leaf-ports.js",
  "upload-runtime-pdf-port.js",
  "upload-runtime-state-port.js",
  "upload-developer-feature-controller-port.js",
  "upload-feature-controller-port.js",
  "upload-form-data-port.js",
  "upload-tile-ui-port.js",
  "upload-workflow-credentials-state-port.js",
  "workflow-view-mount-port.js",
  "workflow-feature-controller-port.js",
  "workflow-config-desktop-runtime-port.js",
  "workflow-config-developer-state-port.js",
  "workflow-config-feature-runtime-port.js",
  "workflow-config-model-defaults-port.js",
  "workflow-config-ocr-defaults-port.js",
  "workflow-config-persistence-port.js",
  "workflow-constants.js",
  "workflow-glossary-data-port.js",
  "workflow-glossary-runtime-config-port.js",
  "workflow-glossary-ui-port.js",
  "workflow-submit-values-port.js",
]);

function walkFiles(root) {
  const pending = [root];
  const files = [];
  while (pending.length > 0) {
    const current = pending.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) {
        pending.push(join(current, entry));
      }
      continue;
    }
    if (current.endsWith(".js")) {
      files.push(current);
    }
  }
  return files.sort();
}

function allPathsUnder(root) {
  const pending = [root];
  const paths = [];
  while (pending.length > 0) {
    const current = pending.pop();
    paths.push(current);
    if (!statSync(current).isDirectory()) {
      continue;
    }
    for (const entry of readdirSync(current)) {
      pending.push(join(current, entry));
    }
  }
  return paths.sort();
}

function readRootSource(fileName) {
  return readFileSync(join(JS_ROOT, fileName), "utf8");
}

function readSource(filePath) {
  return readFileSync(filePath, "utf8");
}

function readBootstrapSource(fileName) {
  return readSource(join(BOOTSTRAP_ROOT, fileName));
}

function readFeatureSource(featureName, fileName) {
  return readSource(join(FEATURE_ROOT, featureName, fileName));
}

function readJobRuntimeSource(fileName) {
  return readFeatureSource("job-runtime", fileName);
}

function readUiSource(fileName) {
  return readSource(join(SOURCE_ROOTS.ui, fileName));
}

function relativeToProject(filePath) {
  return relative(PROJECT_ROOT, filePath);
}

function filesUnder(...roots) {
  return roots.flatMap((root) => walkFiles(root));
}

function findMatchingImports(files, pattern) {
  return files
    .filter((file) => pattern.test(readSource(file)))
    .map((file) => relativeToProject(file));
}

function findMatchingSources(files, pattern) {
  return files
    .filter((file) => pattern.test(readSource(file)))
    .map((file) => relativeToProject(file));
}

function stripCompatibilityReExports(source) {
  return source
    .replace(/export\s+(?:\{[\s\S]*?\}|\*)\s+from\s+["'][^"']+["'];/g, "")
    .trim();
}

function isViewBoundaryModule(filePath) {
  const fileName = filePath.split("/").pop() || "";
  return fileName.endsWith("-view-port.js")
    || fileName.endsWith("view-port.js")
    || fileName === "dialog-elements-port.js"
    || fileName === "deepseek-view-port.js"
    || fileName === "setup-mode-port.js"
    || fileName === "presenter-port.js"
    || fileName === "translation-view-port.js";
}

test("source tree does not contain notebook checkpoint artifacts", () => {
  const offenders = allPathsUnder(join(PROJECT_ROOT, "src"))
    .filter((filePath) => filePath.split("/").includes(".ipynb_checkpoints"))
    .map((filePath) => relativeToProject(filePath));

  assert.deepEqual(offenders, []);
});

test("runtime frontend does not depend on WebAwesome", () => {
  const runtimeSources = [
    ...APP_ENTRYPOINTS,
    join(PROJECT_ROOT, "package.json"),
    join(PROJECT_ROOT, "package-lock.json"),
    ...walkFiles(JS_ROOT),
    ...allPathsUnder(join(PROJECT_ROOT, "src/styles")).filter((filePath) => filePath.endsWith(".css")),
  ].filter((filePath) => existsSync(filePath));
  const offenders = findMatchingSources(runtimeSources, WEBAWESOME_USAGE_PATTERN);

  assert.deepEqual(offenders, []);
});

test("shared dialog shell styles stay in dialog-shell css", () => {
  const styleSources = allPathsUnder(join(PROJECT_ROOT, "src/styles"))
    .filter((filePath) => filePath.endsWith(".css"))
    .filter((filePath) => filePath !== join(PROJECT_ROOT, "src/styles/dialog-shell.css"));
  const offenders = findMatchingSources(styleSources, SHARED_DIALOG_SHELL_SELECTOR_PATTERN);

  assert.deepEqual(offenders, []);
});

test("app update styles stay in app-update css", () => {
  const styleSources = allPathsUnder(join(PROJECT_ROOT, "src/styles"))
    .filter((filePath) => filePath.endsWith(".css"))
    .filter((filePath) => filePath !== join(PROJECT_ROOT, "src/styles/app-update.css"));
  const offenders = findMatchingSources(styleSources, APP_UPDATE_SELECTOR_PATTERN);

  assert.deepEqual(offenders, []);
});

test("library shell styles stay in library-shell css", () => {
  const styleSources = allPathsUnder(join(PROJECT_ROOT, "src/styles"))
    .filter((filePath) => filePath.endsWith(".css"))
    .filter((filePath) => filePath !== join(PROJECT_ROOT, "src/styles/library-shell.css"));
  const offenders = findMatchingSources(styleSources, LIBRARY_SHELL_SELECTOR_PATTERN);

  assert.deepEqual(offenders, []);
});

test("feature modules import local view.js only through explicit view boundary ports", () => {
  const offenders = findMatchingImports(walkFiles(FEATURE_ROOT), VIEW_IMPORT_PATTERN)
    .filter((file) => !isViewBoundaryModule(file));

  assert.deepEqual(offenders, []);
});

function isLegacyStateBoundaryModule(filePath) {
  const fileName = filePath.split("/").pop() || "";
  return fileName === "state.js"
    || fileName.endsWith("-state.js")
    || fileName.endsWith("-state-port.js")
    || fileName.endsWith("runtime-state-port.js");
}

test("feature modules import legacy global state only through state boundary ports", () => {
  const offenders = findMatchingImports(walkFiles(FEATURE_ROOT), LEGACY_STATE_IMPORT_PATTERN)
    .filter((file) => !isLegacyStateBoundaryModule(file));

  assert.deepEqual(offenders, []);
});

test("feature modules do not import default ui adapters directly", () => {
  const offenders = findMatchingImports(walkFiles(FEATURE_ROOT), FEATURE_UI_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("feature modules receive upload defaults through ports", () => {
  const offenders = findMatchingImports(walkFiles(FEATURE_ROOT), FEATURE_UPLOAD_CONSTANTS_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules avoid root compatibility state and job barrels", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.api,
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.jobStatus,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.statusDetail,
    SOURCE_ROOTS.ui,
  ), ROOT_COMPAT_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("root compatibility barrels are removed", () => {
  const remaining = [
    "config.js",
    "constants.js",
    "dom.js",
    "job.js",
    "main.js",
    "state.js",
    "templates.js",
  ].filter((fileName) => existsSync(join(JS_ROOT, fileName)));

  assert.deepEqual(remaining, []);
});

test("jobs api compatibility barrel is removed", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.statusDetail,
    SOURCE_ROOTS.ui,
  ), JOBS_API_BARREL_IMPORT_PATTERN);

  assert.equal(existsSync(join(SOURCE_ROOTS.api, "jobs.js")), false);
  assert.deepEqual(offenders, []);
});

test("app framework compatibility barrel is removed", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.components,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.statusDetail,
    SOURCE_ROOTS.ui,
  ), APP_FRAMEWORK_BARREL_IMPORT_PATTERN);

  assert.equal(existsSync(join(JS_ROOT, "app-framework/index.js")), false);
  assert.deepEqual(offenders, []);
});

test("source modules read provider definitions from config providers", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.components,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.ui,
  ), ROOT_PROVIDER_CONFIG_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("runtime-only feature config ports avoid the root config barrel", () => {
  const files = [
    join(FEATURE_ROOT, "app-actions/config-port.js"),
    join(FEATURE_ROOT, "app-shell/config-port.js"),
    join(FEATURE_ROOT, "upload/config-port.js"),
    join(FEATURE_ROOT, "workflow/config-port.js"),
    join(FEATURE_ROOT, "reader-dialog/config-port.js"),
    join(FEATURE_ROOT, "status-detail/config-port.js"),
    join(SOURCE_ROOTS.bootstrap, "upload-runtime-config-port.js"),
    join(SOURCE_ROOTS.bootstrap, "config-bootstrap-model-defaults-port.js"),
    join(SOURCE_ROOTS.bootstrap, "config-bootstrap-ocr-defaults-port.js"),
    join(SOURCE_ROOTS.bootstrap, "credential-runtime-model-defaults-port.js"),
    join(SOURCE_ROOTS.bootstrap, "credential-runtime-ocr-defaults-port.js"),
    join(SOURCE_ROOTS.bootstrap, "workflow-config-model-defaults-port.js"),
    join(SOURCE_ROOTS.bootstrap, "workflow-config-ocr-defaults-port.js"),
    join(SOURCE_ROOTS.job, "artifact-url-config.js"),
    join(SOURCE_ROOTS.jobDetail, "config-port.js"),
    join(SOURCE_ROOTS.reader, "page-config.js"),
    join(SOURCE_ROOTS.reader, "pdf-document-config.js"),
  ];
  const offenders = findMatchingImports(files, ROOT_CONFIG_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules avoid the root config compatibility barrel", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.components,
    SOURCE_ROOTS.desktop,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.job,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.ui,
  ), ROOT_CONFIG_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("job artifact helpers read runtime and upload state through artifact runtime port", () => {
  const artifactsSource = readSource(join(SOURCE_ROOTS.job, "artifacts.js"));
  const runtimePortSource = readSource(join(SOURCE_ROOTS.job, "artifact-runtime-port.js"));

  assert.equal(
    artifactsSource.includes("../features/job-runtime/current-job-state.js"),
    false,
  );
  assert.equal(
    artifactsSource.includes("../features/job-runtime/secondary-resource-cache.js"),
    false,
  );
  assert.equal(
    artifactsSource.includes("../state/upload-state.js"),
    false,
  );
  assert.match(artifactsSource, /artifact-runtime-port\.js/);
  assert.match(runtimePortSource, /createArtifactRuntimePort/);
  assert.match(runtimePortSource, /defaultArtifactRuntimePort/);
  assert.equal(runtimePortSource.includes("../ui/"), false);
  assert.equal(runtimePortSource.includes("../features/job-runtime/"), false);
  assert.equal(runtimePortSource.includes("../state/"), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.ui, "default-artifact-runtime-port.js")), false);
});

test("job layer does not keep ui presenter compatibility facades", () => {
  assert.equal(existsSync(join(SOURCE_ROOTS.job, "elapsed-renderer.js")), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.job, "workflow-visibility.js")), false);
});

test("job helpers keep job-runtime feature access behind explicit runtime ports", () => {
  const offenders = walkFiles(SOURCE_ROOTS.job)
    .map((file) => relative(SOURCE_ROOTS.job, file))
    .filter((file) => readSource(join(SOURCE_ROOTS.job, file)).includes("../features/job-runtime/"));

  assert.deepEqual(offenders, []);
});

test("job duration helpers are owned by the job layer", () => {
  const durationOwnerSource = readSource(join(SOURCE_ROOTS.job, "durations.js"));
  const statusDetailUtilsSource = readSource(join(SOURCE_ROOTS.statusDetail, "utils.js"));
  const offenders = filesUnder(
    SOURCE_ROOTS.job,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.jobStatus,
    SOURCE_ROOTS.ui,
  )
    .filter((file) => {
      const source = readSource(file);
      return source.includes("resolveLiveDurations")
        && source.includes("../status-detail/utils.js");
    })
    .map((file) => relativeToProject(file));

  assert.match(durationOwnerSource, /resolveLiveDurations/);
  assert.match(statusDetailUtilsSource, /..\/job\/durations\.js/);
  assert.deepEqual(offenders, []);
});

test("job stage history presentation helpers are owned by the job layer", () => {
  const stageHistorySource = readSource(join(SOURCE_ROOTS.job, "stage-history.js"));
  const statusDetailUtilsSource = readSource(join(SOURCE_ROOTS.statusDetail, "utils.js"));
  const jobDetailOffenders = walkFiles(SOURCE_ROOTS.jobDetail)
    .filter((file) => {
      const source = readSource(file);
      return source.includes("stageHistoryDisplay")
        && source.includes("../status-detail/utils.js");
    })
    .map((file) => relativeToProject(file));

  assert.match(stageHistorySource, /stageHistoryDisplay/);
  assert.match(stageHistorySource, /resolveStageHistoryDuration/);
  assert.match(statusDetailUtilsSource, /..\/job\/stage-history\.js/);
  assert.deepEqual(jobDetailOffenders, []);
});

test("source modules avoid the root templates compatibility barrel", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.components,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.ui,
  ), ROOT_TEMPLATES_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules avoid the root dom compatibility barrel", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.components,
    SOURCE_ROOTS.desktop,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
    SOURCE_ROOTS.ui,
    SOURCE_ROOTS.utils,
  ), ROOT_DOM_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("app and source modules avoid the root main compatibility barrel", () => {
  const offenders = findMatchingImports([
    ...filesUnder(
      SOURCE_ROOTS.bootstrap,
      SOURCE_ROOTS.components,
      SOURCE_ROOTS.desktop,
      SOURCE_ROOTS.features,
      SOURCE_ROOTS.jobDetail,
      SOURCE_ROOTS.reader,
      SOURCE_ROOTS.ui,
      SOURCE_ROOTS.utils,
    ),
    ...APP_ENTRYPOINTS,
  ], ROOT_MAIN_IMPORT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules read API prefix from config api constants", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.api,
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.jobDetail,
    SOURCE_ROOTS.reader,
  ), API_PREFIX_FROM_ROOT_CONSTANTS_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules read upload defaults from config upload constants", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.ui,
  ), UPLOAD_CONSTANTS_FROM_ROOT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules read model defaults from config model constants", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.config,
    SOURCE_ROOTS.features,
  ), MODEL_CONSTANTS_FROM_ROOT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("source modules read storage keys from config storage keys", () => {
  const offenders = findMatchingImports(
    walkFiles(SOURCE_ROOTS.config),
    STORAGE_KEYS_FROM_ROOT_PATTERN,
  );

  assert.deepEqual(offenders, []);
});

test("source modules read workflow defaults from config workflow defaults", () => {
  const offenders = findMatchingImports(filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.features,
  ), WORKFLOW_DEFAULTS_FROM_ROOT_PATTERN);

  assert.deepEqual(offenders, []);
});

test("bootstrap external imports stay isolated in explicit leaf ports", () => {
  const offenders = walkFiles(BOOTSTRAP_ROOT)
    .filter((file) => BOOTSTRAP_EXTERNAL_IMPORT_PATTERN.test(readSource(file)))
    .map((file) => relative(BOOTSTRAP_ROOT, file))
    .filter((file) => !BOOTSTRAP_EXTERNAL_IMPORT_ALLOWLIST.has(file));

  assert.deepEqual(offenders, []);
});

test("bootstrap grouped ports compose leaf ports only", () => {
  const offenders = BOOTSTRAP_GROUPED_PORT_FILES
    .filter((file) => BOOTSTRAP_EXTERNAL_IMPORT_PATTERN.test(readBootstrapSource(file)));

  assert.deepEqual(offenders, []);
});

test("bootstrap grouped port list covers grouped port files", () => {
  const groupedPortSet = new Set(BOOTSTRAP_GROUPED_PORT_FILES);
  const discovered = walkFiles(BOOTSTRAP_ROOT)
    .map((file) => relative(BOOTSTRAP_ROOT, file))
    .filter((file) => file.endsWith("-ports.js")
      || file.endsWith("mount-ports.js")
      || file.endsWith("feature-controllers-port.js"))
    .filter((file) => !BOOTSTRAP_GROUPED_PORT_DISCOVERY_ALLOWLIST.has(file));
  const missing = discovered.filter((file) => !groupedPortSet.has(file));

  assert.deepEqual(missing, []);
});

test("bootstrap feature handle adapters do not import default implementations", () => {
  for (const file of [
    "feature-app-action-ports.js",
    "feature-credentials-ports.js",
    "feature-job-runtime-ports.js",
    "feature-upload-ports.js",
    "feature-workflow-ports.js",
    "submit-flow-ports.js",
  ]) {
    const source = readBootstrapSource(file);
    assert.equal(source.includes("../features/"), false, file);
    assert.equal(source.includes("../api/"), false, file);
    assert.equal(source.includes("../ui/"), false, file);
    assert.equal(source.includes("../state/"), false, file);
    assert.equal(source.includes("../config.js"), false, file);
    assert.equal(source.includes("../constants.js"), false, file);
  }
});

test("feature handle aggregate barrel is removed", () => {
  const workflowSource = readBootstrapSource("feature-workflow-ports.js");
  const credentialActionMountSource = readBootstrapSource("mount-credential-action-features.js");
  const glossaryMountSource = readBootstrapSource("mount-glossary-feature.js");
  const uploadWorkflowMountSource = readBootstrapSource("mount-upload-workflow-features.js");

  assert.equal(existsSync(join(BOOTSTRAP_ROOT, "feature-ports.js")), false);
  assert.match(workflowSource, /workflow-constants\.js/);
  assert.match(workflowSource, /WORKFLOW_RENDER/);
  assert.equal(credentialActionMountSource.includes("./feature-ports.js"), false);
  assert.equal(glossaryMountSource.includes("./feature-ports.js"), false);
  assert.equal(uploadWorkflowMountSource.includes("./feature-ports.js"), false);
  assert.match(credentialActionMountSource, /feature-app-action-ports\.js/);
  assert.match(credentialActionMountSource, /feature-credentials-ports\.js/);
  assert.match(credentialActionMountSource, /feature-job-runtime-ports\.js/);
  assert.match(credentialActionMountSource, /feature-upload-ports\.js/);
  assert.match(credentialActionMountSource, /feature-workflow-ports\.js/);
  assert.match(glossaryMountSource, /feature-workflow-ports\.js/);
  assert.match(uploadWorkflowMountSource, /feature-credentials-ports\.js/);
  assert.match(uploadWorkflowMountSource, /feature-upload-ports\.js/);
  assert.match(uploadWorkflowMountSource, /feature-workflow-ports\.js/);
});

test("main event binder uses the bootstrap event port for DOM and config effects", () => {
  const source = readBootstrapSource("main-events.js");
  const portSource = readBootstrapSource("main-event-port.js");
  const domSource = readBootstrapSource("main-event-dom-port.js");
  const documentSource = readBootstrapSource("main-event-document-port.js");
  const overrideSource = readBootstrapSource("main-event-overrides-port.js");
  const browserConfigSource = readBootstrapSource("main-event-browser-config-persistence-port.js");
  const credentialSource = readBootstrapSource("main-event-credential-persistence-port.js");
  const hiddenCredentialBindingSource = readBootstrapSource("main-event-hidden-credential-binding-port.js");
  const hiddenCredentialSource = readBootstrapSource("main-event-hidden-credential-port.js");
  const primarySource = readBootstrapSource("main-event-primary-actions-port.js");

  assert.equal(source.includes("../dom.js"), false);
  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../contracts/app-contract.js"), false);
  assert.equal(source.includes("dynamic-primary-actions.js"), false);
  assert.match(source, /main-event-port\.js/);
  assert.match(source, /main-feature-lifecycle-events\.js/);
  assert.match(source, /main-shell-event-bindings\.js/);
  assert.equal(portSource.includes("../dom.js"), false);
  assert.equal(portSource.includes("../config.js"), false);
  assert.equal(portSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.equal(portSource.includes("dynamic-primary-actions.js"), false);
  assert.match(portSource, /main-event-dom-port\.js/);
  assert.match(portSource, /main-event-document-port\.js/);
  assert.match(portSource, /main-event-credential-persistence-port\.js/);
  assert.match(portSource, /main-event-overrides-port\.js/);
  assert.match(portSource, /main-event-primary-actions-port\.js/);
  assert.equal(portSource.includes("function pickDefined"), false);
  assert.match(overrideSource, /pickDefined/);
  assert.match(overrideSource, /credentialPersistencePortOverrides/);
  assert.match(overrideSource, /primaryActionsPortOverrides/);
  assert.equal(overrideSource.includes("../dom.js"), false);
  assert.equal(overrideSource.includes("../config.js"), false);
  assert.equal(overrideSource.includes("hidden-inputs.js"), false);
  assert.equal(overrideSource.includes("dynamic-primary-actions.js"), false);
  assert.equal(domSource.includes("../dom.js"), false);
  assert.match(domSource, /..\/dom\/query\.js/);
  assert.equal(documentSource.includes("../dom.js"), false);
  assert.equal(credentialSource.includes("../config.js"), false);
  assert.equal(credentialSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(credentialSource, /main-event-browser-config-persistence-port\.js/);
  assert.match(credentialSource, /main-event-hidden-credential-binding-port\.js/);
  assert.match(credentialSource, /main-event-hidden-credential-port\.js/);
  assert.equal(hiddenCredentialBindingSource.includes("../config.js"), false);
  assert.equal(hiddenCredentialBindingSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(browserConfigSource, /..\/config\/persisted-config\.js/);
  assert.equal(hiddenCredentialSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(hiddenCredentialSource, /features\/credentials\/default-state-port\.js/);
  assert.match(primarySource, /dynamic-primary-actions\.js/);
});

test("credential action feature mount consumes external effects through mount ports", () => {
  const source = readBootstrapSource("mount-credential-action-features.js");
  const payloadSource = readBootstrapSource("credential-action-feature-payloads.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /credential-action-mount-ports\.js/);
  assert.match(source, /credential-action-feature-payloads\.js/);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../config.js"), false);
  assert.equal(payloadSource.includes("../api/"), false);
  assert.equal(payloadSource.includes("../state/store.js"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
  assert.match(payloadSource, /submit-flow-ports\.js/);
});

test("credential action mount port delegates provider APIs to provider port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const featureControllersSource = readBootstrapSource("credential-action-feature-controllers-port.js");
  const providerSource = readBootstrapSource("credential-provider-mount-port.js");
  const providerDataSource = readBootstrapSource("credential-provider-data-port.js");
  const providerDeepSeekDataSource = readBootstrapSource("credential-provider-deepseek-data-port.js");
  const providerOcrDataSource = readBootstrapSource("credential-provider-ocr-data-port.js");
  const providerDefaultsSource = readBootstrapSource("credential-provider-defaults-port.js");
  const providerValidationDepsSource = readBootstrapSource("credential-provider-validation-deps-port.js");
  const providerValidationSource = readBootstrapSource("credential-provider-validation-port.js");

  assert.equal(source.includes("../features/"), false);
  assert.match(source, /credential-action-feature-controllers-port\.js/);
  assert.equal(featureControllersSource.includes("../features/"), false);
  assert.match(featureControllersSource, /credential-app-actions-feature-controller-port\.js/);
  assert.match(featureControllersSource, /credential-artifact-downloads-feature-controller-port\.js/);
  assert.match(featureControllersSource, /credential-browser-feature-controller-port\.js/);
  assert.equal(source.includes("../api/providers.js"), false);
  assert.equal(source.includes("export { validateOcrTokenForProvider }"), false);
  assert.match(source, /credential-provider-mount-port\.js/);
  assert.equal(providerSource.includes("../api/providers.js"), false);
  assert.equal(providerSource.includes("../constants.js"), false);
  assert.match(providerSource, /credential-provider-data-port\.js/);
  assert.match(providerSource, /credential-provider-defaults-port\.js/);
  assert.match(providerSource, /credential-provider-validation-port\.js/);
  assert.equal(providerDataSource.includes("../api/providers.js"), false);
  assert.match(providerDataSource, /credential-provider-deepseek-data-port\.js/);
  assert.match(providerDataSource, /credential-provider-ocr-data-port\.js/);
  assert.match(providerDeepSeekDataSource, /..\/api\/providers\.js/);
  assert.match(providerOcrDataSource, /..\/api\/providers\.js/);
  assert.equal(providerDefaultsSource.includes("../constants.js"), false);
  assert.match(providerDefaultsSource, /..\/config\/model-constants\.js/);
  assert.equal(providerValidationSource.includes("credential-provider-data-port.js"), false);
  assert.equal(providerValidationSource.includes("credential-provider-defaults-port.js"), false);
  assert.match(providerValidationSource, /credential-provider-validation-deps-port\.js/);
  assert.match(providerValidationSource, /credential-provider-actions\.js/);
  assert.match(providerValidationDepsSource, /credential-provider-data-port\.js/);
  assert.match(providerValidationDepsSource, /credential-provider-defaults-port\.js/);
});

test("credential action mount port delegates desktop actions to desktop port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const desktopSource = readBootstrapSource("credential-desktop-mount-port.js");
  const desktopConfigSource = readBootstrapSource("credential-desktop-config-port.js");
  const desktopRuntimeSource = readBootstrapSource("credential-desktop-runtime-port.js");

  assert.equal(source.includes("../desktop/index.js"), false);
  assert.match(source, /credential-desktop-mount-port\.js/);
  assert.equal(desktopSource.includes("../config.js"), false);
  assert.equal(desktopSource.includes("../desktop/index.js"), false);
  assert.match(desktopSource, /credential-desktop-config-port\.js/);
  assert.match(desktopSource, /credential-desktop-runtime-port\.js/);
  assert.match(desktopConfigSource, /..\/config\/desktop-persistence\.js/);
  assert.match(desktopRuntimeSource, /..\/desktop\/index\.js/);
});

test("credential action mount port delegates task option persistence to task options port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const taskOptionsSource = readBootstrapSource("credential-task-options-mount-port.js");
  const taskOptionsDefaultsSource = readBootstrapSource("credential-task-options-defaults-port.js");
  const taskOptionsDeveloperStateSource = readBootstrapSource("credential-task-options-developer-state-port.js");
  const taskOptionsLegacyStateSource = readBootstrapSource("credential-task-options-legacy-state-port.js");
  const taskOptionsPersistenceSource = readBootstrapSource("credential-task-options-persistence-port.js");

  assert.equal(source.includes("../state/actions.js"), false);
  assert.equal(source.includes("../state/developer-state.js"), false);
  assert.equal(source.includes("workflow-normalizers.js"), false);
  assert.equal(source.includes("export { saveDeveloperTaskOptions }"), false);
  assert.match(source, /credential-task-options-mount-port\.js/);
  assert.equal(taskOptionsSource.includes("../config.js"), false);
  assert.equal(taskOptionsSource.includes("../state/store.js"), false);
  assert.equal(taskOptionsSource.includes("../state/actions.js"), false);
  assert.equal(taskOptionsSource.includes("../state/developer-state.js"), false);
  assert.match(taskOptionsSource, /credential-task-options-actions\.js/);
  assert.match(taskOptionsSource, /credential-task-options-defaults-port\.js/);
  assert.equal(taskOptionsDefaultsSource.includes("../config.js"), false);
  assert.equal(taskOptionsDefaultsSource.includes("../state/"), false);
  assert.match(taskOptionsDefaultsSource, /credential-task-options-developer-state-port\.js/);
  assert.match(taskOptionsDefaultsSource, /credential-task-options-legacy-state-port\.js/);
  assert.match(taskOptionsDefaultsSource, /credential-task-options-persistence-port\.js/);
  assert.match(taskOptionsDeveloperStateSource, /..\/state\/actions\.js/);
  assert.match(taskOptionsDeveloperStateSource, /..\/state\/developer-state\.js/);
  assert.match(taskOptionsLegacyStateSource, /..\/state\/store\.js/);
  assert.match(taskOptionsPersistenceSource, /..\/config\/persisted-config\.js/);
});

test("credential action mount port delegates runtime defaults and APIs to runtime port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const runtimeSource = readBootstrapSource("credential-runtime-mount-port.js");
  const runtimeDefaultsSource = readBootstrapSource("credential-runtime-defaults-port.js");
  const runtimeModelDefaultsSource = readBootstrapSource("credential-runtime-model-defaults-port.js");
  const runtimeOcrDefaultsSource = readBootstrapSource("credential-runtime-ocr-defaults-port.js");
  const runtimePersistenceSource = readBootstrapSource("credential-runtime-persistence-port.js");
  const runtimeDataSource = readBootstrapSource("credential-runtime-data-port.js");
  const runtimeHttpSource = readBootstrapSource("credential-runtime-http-port.js");
  const runtimeEndpointSource = readBootstrapSource("credential-runtime-endpoint-port.js");
  const runtimeProtectedFetchSource = readBootstrapSource("credential-runtime-protected-fetch-port.js");
  const runtimeJobsSource = readBootstrapSource("credential-runtime-jobs-port.js");
  const runtimeLeafSource = readBootstrapSource("credential-runtime-leaf-ports.js");
  const runtimeConfigSource = readBootstrapSource("credential-runtime-config-port.js");
  const runtimeApiConfigSource = readBootstrapSource("credential-runtime-api-config-port.js");
  const runtimeAppActionsConfigSource = readBootstrapSource("credential-runtime-app-actions-config-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../api/http.js"), false);
  assert.equal(source.includes("../api/jobs.js"), false);
  assert.equal(source.includes("../features/app-actions/config-port.js"), false);
  assert.match(source, /credential-runtime-mount-port\.js/);
  assert.equal(runtimeSource.includes("../config.js"), false);
  assert.equal(runtimeSource.includes("../constants.js"), false);
  assert.equal(runtimeSource.includes("../api/"), false);
  assert.equal(runtimeSource.includes("../features/app-actions/config-port.js"), false);
  assert.match(runtimeSource, /credential-runtime-config-port\.js/);
  assert.match(runtimeSource, /credential-runtime-data-port\.js/);
  assert.match(runtimeSource, /credential-runtime-defaults-port\.js/);
  assert.equal(runtimeDefaultsSource.includes("../config.js"), false);
  assert.match(runtimeDefaultsSource, /credential-runtime-model-defaults-port\.js/);
  assert.match(runtimeDefaultsSource, /credential-runtime-ocr-defaults-port\.js/);
  assert.match(runtimeDefaultsSource, /credential-runtime-persistence-port\.js/);
  assert.match(runtimeModelDefaultsSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimeOcrDefaultsSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimePersistenceSource, /credential-runtime-leaf-ports\.js/);
  assert.equal(runtimeDataSource.includes("../api/"), false);
  assert.match(runtimeDataSource, /credential-runtime-http-port\.js/);
  assert.match(runtimeDataSource, /credential-runtime-jobs-port\.js/);
  assert.equal(runtimeHttpSource.includes("../api/"), false);
  assert.match(runtimeHttpSource, /credential-runtime-endpoint-port\.js/);
  assert.match(runtimeHttpSource, /credential-runtime-protected-fetch-port\.js/);
  assert.match(runtimeEndpointSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimeProtectedFetchSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimeJobsSource, /credential-runtime-leaf-ports\.js/);
  assert.equal(runtimeConfigSource.includes("../constants.js"), false);
  assert.equal(runtimeConfigSource.includes("../features/app-actions/config-port.js"), false);
  assert.match(runtimeConfigSource, /credential-runtime-api-config-port\.js/);
  assert.match(runtimeConfigSource, /credential-runtime-app-actions-config-port\.js/);
  assert.match(runtimeApiConfigSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimeAppActionsConfigSource, /credential-runtime-leaf-ports\.js/);
  assert.match(runtimeLeafSource, /..\/api\/http\.js/);
  assert.match(runtimeLeafSource, /..\/api\/jobs-submit\.js/);
  assert.match(runtimeLeafSource, /..\/config\/api-constants\.js/);
  assert.match(runtimeLeafSource, /..\/config\/runtime\.js/);
  assert.match(runtimeLeafSource, /..\/config\/persisted-config\.js/);
  assert.match(runtimeLeafSource, /features\/app-actions\/config-port\.js/);
});

test("credential action mount port delegates UI effects to ui port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const uiSource = readBootstrapSource("credential-ui-mount-port.js");
  const browserCredentialViewSource = readBootstrapSource("credential-browser-view-port.js");
  const hiddenSource = readBootstrapSource("credential-ui-hidden-port.js");
  const jobActionsSource = readBootstrapSource("credential-ui-job-actions-port.js");
  const jobActionEffectsSource = readBootstrapSource("credential-ui-job-action-effects-port.js");
  const presentationSource = readBootstrapSource("credential-ui-presentation-port.js");
  const textSource = readBootstrapSource("credential-ui-text-port.js");

  assert.equal(source.includes("../features/credentials/hidden-inputs.js"), false);
  assert.equal(source.includes("../ui/text.js"), false);
  assert.equal(source.includes("../ui/job-actions.js"), false);
  assert.equal(source.includes("../ui/presentation.js"), false);
  assert.match(source, /credential-ui-mount-port\.js/);
  assert.match(source, /credential-browser-view-port\.js/);
  assert.equal(uiSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.equal(uiSource.includes("../ui/"), false);
  assert.match(uiSource, /credential-ui-hidden-port\.js/);
  assert.match(uiSource, /credential-ui-job-actions-port\.js/);
  assert.match(uiSource, /credential-ui-text-port\.js/);
  assert.match(browserCredentialViewSource, /features\/credentials\/browser-view-port\.js/);
  assert.match(browserCredentialViewSource, /upload-tile-ui-port\.js/);
  assert.equal(hiddenSource.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(hiddenSource, /features\/credentials\/default-state-port\.js/);
  assert.match(hiddenSource, /features\/credentials\/selectors-port\.js/);
  assert.equal(jobActionsSource.includes("../ui/"), false);
  assert.match(jobActionsSource, /credential-ui-job-action-effects-port\.js/);
  assert.match(jobActionsSource, /credential-ui-presentation-port\.js/);
  assert.match(jobActionEffectsSource, /..\/ui\/job-actions\.js/);
  assert.match(presentationSource, /..\/ui\/presentation\.js/);
  assert.match(textSource, /..\/ui\/text\.js/);
});

test("credentials hidden inputs keep DOM and default state ownership split", () => {
  const hiddenInputsSource = readFeatureSource("credentials", "hidden-inputs.js");
  const hiddenDomSource = readFeatureSource("credentials", "hidden-input-dom-port.js");
  const defaultStateSource = readFeatureSource("credentials", "default-state-port.js");
  const selectorsSource = readFeatureSource("credentials", "selectors-port.js");

  assert.equal(hiddenInputsSource.includes("createCredentialsStatePort"), false);
  assert.equal(hiddenInputsSource.includes("hasCompleteCredentials"), false);
  assert.equal(hiddenInputsSource.includes("ocrTokenFromCredentials"), false);
  assert.equal(hiddenInputsSource.includes("normalizeBrowserStoredConfig"), false);
  assert.equal(hiddenInputsSource.includes("normalizeOcrProvider"), false);
  assert.equal(hiddenInputsSource.includes("../../dom/query.js"), false);
  assert.equal(hiddenInputsSource.includes("credentials-dom-contract.js"), false);
  assert.match(hiddenInputsSource, /default-state-port\.js/);
  assert.match(hiddenInputsSource, /hidden-input-dom-port\.js/);
  assert.match(hiddenInputsSource, /selectors-port\.js/);
  assert.match(hiddenDomSource, /normalizeBrowserStoredConfig/);
  assert.match(hiddenDomSource, /normalizeOcrProvider/);
  assert.match(hiddenDomSource, /bindHiddenCredentialInputPersistence/);
  assert.match(hiddenDomSource, /credentials-dom-contract\.js/);
  assert.match(hiddenDomSource, /..\/..\/dom\/query\.js/);
  assert.match(defaultStateSource, /createCredentialsStatePort/);
  assert.match(defaultStateSource, /hidden-input-dom-port\.js/);
  assert.match(defaultStateSource, /runtime-state-port\.js/);
  assert.match(selectorsSource, /ocrTokenFromCredentials/);
  assert.match(selectorsSource, /hasCompleteCredentials/);
});

test("runtime source paths avoid the legacy hidden credential facade", () => {
  const bootstrapFiles = walkFiles(BOOTSTRAP_ROOT);
  const desktopFiles = walkFiles(SOURCE_ROOTS.desktop);
  const featureFiles = walkFiles(FEATURE_ROOT).filter((filePath) => {
    return !filePath.endsWith("/features/credentials/hidden-inputs.js");
  });
  for (const filePath of [...bootstrapFiles, ...desktopFiles, ...featureFiles]) {
    const source = readFileSync(filePath, "utf8");
    assert.equal(
      source.includes("features/credentials/hidden-inputs.js")
        || source.includes("../credentials/hidden-inputs.js")
        || source.includes("./hidden-inputs.js"),
      false,
      `${filePath} should not depend on hidden-inputs.js`,
    );
  }
});

test("credential action mount port delegates legacy state to legacy state port", () => {
  const source = readBootstrapSource("credential-action-mount-ports.js");
  const legacyStateSource = readBootstrapSource("credential-legacy-state-mount-port.js");

  assert.equal(source.includes("../state/store.js"), false);
  assert.match(source, /credential-legacy-state-mount-port\.js/);
  assert.match(legacyStateSource, /..\/state\/store\.js/);
});

test("upload workflow feature mount consumes external effects through mount ports", () => {
  const source = readBootstrapSource("mount-upload-workflow-features.js");
  const payloadSource = readBootstrapSource("upload-workflow-feature-mount-payloads.js");
  const workflowControllerSource = readFeatureSource("workflow", "controller.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /upload-workflow-mount-ports\.js/);
  assert.match(source, /upload-workflow-feature-mount-payloads\.js/);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../config.js"), false);
  assert.equal(payloadSource.includes("../api/"), false);
  assert.equal(payloadSource.includes("../state/store.js"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
  assert.equal(workflowControllerSource.includes("../../config/upload-constants.js"), false);
  assert.match(payloadSource, /defaultFileLabel/);
});

test("upload workflow mount port composes grouped default ports", () => {
  const source = readBootstrapSource("upload-workflow-mount-ports.js");
  const featureControllersSource = readBootstrapSource("upload-workflow-feature-controllers-port.js");
  const credentialsStateSource = readBootstrapSource("upload-workflow-credentials-state-port.js");
  const submitValuesSource = readBootstrapSource("workflow-submit-values-port.js");
  const workflowViewMountSource = readBootstrapSource("workflow-view-mount-port.js");
  const uploadTileUiSource = readBootstrapSource("upload-tile-ui-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("../features/credentials/hidden-inputs.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.match(source, /upload-workflow-feature-controllers-port\.js/);
  assert.match(source, /upload-workflow-credentials-state-port\.js/);
  assert.match(source, /upload-runtime-mount-port\.js/);
  assert.match(source, /workflow-config-mount-port\.js/);
  assert.match(source, /workflow-glossary-mount-port\.js/);
  assert.match(source, /workflow-submit-values-port\.js/);
  assert.match(source, /workflow-view-mount-port\.js/);
  assert.equal(featureControllersSource.includes("../features/"), false);
  assert.match(featureControllersSource, /upload-developer-feature-controller-port\.js/);
  assert.match(featureControllersSource, /upload-feature-controller-port\.js/);
  assert.match(featureControllersSource, /upload-form-data-port\.js/);
  assert.match(featureControllersSource, /workflow-feature-controller-port\.js/);
  assert.match(credentialsStateSource, /features\/credentials\/default-state-port\.js/);
  assert.match(submitValuesSource, /features\/workflow\/view\.js/);
  assert.match(workflowViewMountSource, /features\/workflow\/workflow-view-port\.js/);
  assert.match(workflowViewMountSource, /upload-tile-ui-port\.js/);
  assert.match(uploadTileUiSource, /ui\/upload-tile-view-port\.js/);
});

test("upload runtime mount port composes grouped default ports", () => {
  const source = readBootstrapSource("upload-runtime-mount-port.js");
  const configSource = readBootstrapSource("upload-runtime-config-port.js");
  const dataSource = readBootstrapSource("upload-runtime-data-port.js");
  const defaultsSource = readBootstrapSource("upload-runtime-defaults-port.js");
  const httpSource = readBootstrapSource("upload-runtime-http-port.js");
  const legacyStateSource = readBootstrapSource("upload-runtime-legacy-state-port.js");
  const leafSource = readBootstrapSource("upload-runtime-leaf-ports.js");
  const pdfSource = readBootstrapSource("upload-runtime-pdf-port.js");
  const stateSource = readBootstrapSource("upload-runtime-state-port.js");
  const uiSource = readBootstrapSource("upload-runtime-ui-port.js");
  const uiJobActionsSource = readBootstrapSource("upload-runtime-job-actions-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("../features/upload/"), false);
  assert.match(source, /upload-runtime-config-port\.js/);
  assert.match(source, /upload-runtime-data-port\.js/);
  assert.match(source, /upload-runtime-legacy-state-port\.js/);
  assert.match(source, /upload-runtime-state-port\.js/);
  assert.match(source, /upload-runtime-ui-port\.js/);
  assert.equal(configSource.includes("../constants.js"), false);
  assert.equal(configSource.includes("../config/runtime.js"), false);
  assert.match(configSource, /upload-runtime-defaults-port\.js/);
  assert.match(configSource, /upload-runtime-leaf-ports\.js/);
  assert.equal(dataSource.includes("../api/"), false);
  assert.equal(dataSource.includes("../features/upload/"), false);
  assert.match(dataSource, /upload-runtime-http-port\.js/);
  assert.match(dataSource, /upload-runtime-pdf-port\.js/);
  assert.equal(defaultsSource.includes("../constants.js"), false);
  assert.match(defaultsSource, /upload-runtime-leaf-ports\.js/);
  assert.match(httpSource, /upload-runtime-leaf-ports\.js/);
  assert.match(legacyStateSource, /upload-runtime-leaf-ports\.js/);
  assert.match(pdfSource, /upload-runtime-leaf-ports\.js/);
  assert.match(stateSource, /upload-runtime-leaf-ports\.js/);
  assert.match(leafSource, /..\/api\/http\.js/);
  assert.match(leafSource, /..\/config\/api-constants\.js/);
  assert.match(leafSource, /..\/config\/runtime\.js/);
  assert.match(leafSource, /..\/config\/upload-constants\.js/);
  assert.match(leafSource, /features\/upload\/pdf-page-count\.js/);
  assert.match(leafSource, /features\/upload\/state\.js/);
  assert.match(leafSource, /..\/state\/store\.js/);
  assert.equal(readFeatureSource("upload", "state.js").includes("../../state/store.js"), false);
  assert.equal(uiSource.includes("../ui/"), false);
  assert.match(uiSource, /upload-runtime-job-actions-port\.js/);
  assert.match(uiJobActionsSource, /upload-runtime-leaf-ports\.js/);
  assert.match(leafSource, /..\/ui\/job-actions\.js/);
});

test("workflow config mount port composes grouped default ports", () => {
  const source = readBootstrapSource("workflow-config-mount-port.js");
  const defaultsSource = readBootstrapSource("workflow-config-defaults-port.js");
  const modelDefaultsSource = readBootstrapSource("workflow-config-model-defaults-port.js");
  const ocrDefaultsSource = readBootstrapSource("workflow-config-ocr-defaults-port.js");
  const runtimeSource = readBootstrapSource("workflow-config-runtime-port.js");
  const constantRuntimeSource = readBootstrapSource("workflow-config-constant-runtime-port.js");
  const desktopRuntimeSource = readBootstrapSource("workflow-config-desktop-runtime-port.js");
  const featureRuntimeSource = readBootstrapSource("workflow-config-feature-runtime-port.js");
  const normalizerRuntimeSource = readBootstrapSource("workflow-config-normalizer-runtime-port.js");
  const stateSource = readBootstrapSource("workflow-config-state-port.js");
  const developerStateSource = readBootstrapSource("workflow-config-developer-state-port.js");
  const persistenceSource = readBootstrapSource("workflow-config-persistence-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../state/actions.js"), false);
  assert.equal(source.includes("../state/developer-state.js"), false);
  assert.equal(source.includes("../state/desktop-state.js"), false);
  assert.equal(source.includes("../features/workflow/config-port.js"), false);
  assert.equal(source.includes("workflow-normalizers.js"), false);
  assert.equal(source.includes("workflow-constants.js"), false);
  assert.match(source, /workflow-config-defaults-port\.js/);
  assert.match(source, /workflow-config-runtime-port\.js/);
  assert.match(source, /workflow-config-state-port\.js/);
  assert.equal(defaultsSource.includes("../config.js"), false);
  assert.match(defaultsSource, /workflow-config-model-defaults-port\.js/);
  assert.match(defaultsSource, /workflow-config-ocr-defaults-port\.js/);
  assert.match(modelDefaultsSource, /..\/config\/runtime\.js/);
  assert.match(ocrDefaultsSource, /..\/config\/runtime\.js/);
  assert.equal(runtimeSource.includes("../state/desktop-state.js"), false);
  assert.equal(runtimeSource.includes("../features/workflow/config-port.js"), false);
  assert.equal(runtimeSource.includes("workflow-normalizers.js"), false);
  assert.equal(runtimeSource.includes("workflow-constants.js"), false);
  assert.match(runtimeSource, /workflow-config-constant-runtime-port\.js/);
  assert.match(runtimeSource, /workflow-config-desktop-runtime-port\.js/);
  assert.match(runtimeSource, /workflow-config-feature-runtime-port\.js/);
  assert.match(runtimeSource, /workflow-config-normalizer-runtime-port\.js/);
  assert.match(constantRuntimeSource, /workflow-constants\.js/);
  assert.match(desktopRuntimeSource, /..\/state\/desktop-state\.js/);
  assert.match(featureRuntimeSource, /features\/workflow\/config-port\.js/);
  assert.match(normalizerRuntimeSource, /workflow-normalizers\.js/);
  assert.equal(stateSource.includes("../config.js"), false);
  assert.equal(stateSource.includes("../state/"), false);
  assert.match(stateSource, /workflow-config-developer-state-port\.js/);
  assert.match(stateSource, /workflow-config-persistence-port\.js/);
  assert.match(developerStateSource, /..\/state\/actions\.js/);
  assert.match(developerStateSource, /..\/state\/developer-state\.js/);
  assert.match(persistenceSource, /..\/config\/persisted-config\.js/);
});

test("workflow glossary mount port composes grouped default ports", () => {
  const source = readBootstrapSource("workflow-glossary-mount-port.js");
  const runtimeSource = readBootstrapSource("workflow-glossary-runtime-port.js");
  const runtimeConfigSource = readBootstrapSource("workflow-glossary-runtime-config-port.js");

  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /workflow-glossary-runtime-port\.js/);
  assert.match(source, /workflow-glossary-data-port\.js/);
  assert.match(source, /workflow-glossary-ui-port\.js/);
  assert.equal(runtimeSource.includes("../constants.js"), false);
  assert.match(runtimeSource, /workflow-glossary-runtime-config-port\.js/);
  assert.match(runtimeConfigSource, /..\/config\/api-constants\.js/);
});

test("job feature mount consumes external effects through mount ports", () => {
  const source = readBootstrapSource("mount-job-features.js");
  const payloadSource = readBootstrapSource("job-feature-mount-payloads.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /job-mount-ports\.js/);
  assert.match(source, /job-feature-mount-payloads\.js/);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../api/"), false);
  assert.equal(payloadSource.includes("../state/store.js"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
});

test("job mount port composes grouped default ports", () => {
  const source = readBootstrapSource("job-mount-ports.js");
  const featureControllersSource = readBootstrapSource("job-feature-controllers-port.js");
  const jobRuntimeFeatureControllerSource = readBootstrapSource("job-runtime-feature-controller-port.js");
  const statusDetailFeatureControllerSource = readBootstrapSource("status-detail-feature-controller-port.js");
  const dataSource = readBootstrapSource("job-data-mount-port.js");
  const dataControlSource = readBootstrapSource("job-data-control-port.js");
  const dataHttpSource = readBootstrapSource("job-data-http-port.js");
  const dataJobsSource = readBootstrapSource("job-data-jobs-port.js");
  const dataReadSource = readBootstrapSource("job-data-read-port.js");
  const dataStatusSource = readBootstrapSource("job-data-status-port.js");
  const runtimeSource = readBootstrapSource("job-runtime-mount-port.js");
  const runtimeConfigSource = readBootstrapSource("job-runtime-config-port.js");
  const runtimeShellSource = readBootstrapSource("job-runtime-shell-port.js");
  const translationDebugSource = readBootstrapSource("job-translation-debug-mount-port.js");
  const translationDebugDataSource = readBootstrapSource("job-translation-debug-data-port.js");
  const uiSource = readBootstrapSource("job-ui-mount-port.js");
  const uiPresentationSource = readBootstrapSource("job-ui-presentation-port.js");
  const uiJobActionsSource = readBootstrapSource("job-ui-job-actions-port.js");
  const uiRenderSource = readBootstrapSource("job-ui-render-port.js");
  const uiTextSource = readBootstrapSource("job-ui-text-port.js");
  const uiWorkflowPresentationSource = readBootstrapSource("job-ui-workflow-presentation-port.js");

  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.match(source, /job-feature-controllers-port\.js/);
  assert.equal(featureControllersSource.includes("../features/"), false);
  assert.match(featureControllersSource, /job-runtime-feature-controller-port\.js/);
  assert.match(featureControllersSource, /status-detail-feature-controller-port\.js/);
  assert.match(jobRuntimeFeatureControllerSource, /features\/job-runtime\/controller\.js/);
  assert.match(statusDetailFeatureControllerSource, /features\/status-detail\/controller\.js/);
  assert.match(source, /job-data-mount-port\.js/);
  assert.match(source, /job-legacy-state-mount-port\.js/);
  assert.match(source, /job-runtime-mount-port\.js/);
  assert.match(source, /job-translation-debug-mount-port\.js/);
  assert.match(source, /job-ui-mount-port\.js/);
  assert.equal(dataSource.includes("../api/"), false);
  assert.match(dataSource, /job-data-http-port\.js/);
  assert.match(dataSource, /job-data-jobs-port\.js/);
  assert.match(dataControlSource, /..\/api\/jobs-actions\.js/);
  assert.match(dataHttpSource, /..\/api\/http\.js/);
  assert.equal(dataJobsSource.includes("../api/jobs.js"), false);
  assert.match(dataJobsSource, /job-data-control-port\.js/);
  assert.match(dataJobsSource, /job-data-read-port\.js/);
  assert.match(dataJobsSource, /job-data-status-port\.js/);
  assert.match(dataReadSource, /..\/api\/jobs-artifacts\.js/);
  assert.match(dataReadSource, /..\/api\/jobs-query\.js/);
  assert.match(dataStatusSource, /..\/api\/jobs-actions\.js/);
  assert.match(dataStatusSource, /..\/api\/jobs-events\.js/);
  assert.equal(runtimeSource.includes("../constants.js"), false);
  assert.equal(runtimeSource.includes("../ui/default-job-runtime-adapters.js"), false);
  assert.match(runtimeSource, /job-runtime-config-port\.js/);
  assert.match(runtimeSource, /job-runtime-shell-port\.js/);
  assert.match(runtimeConfigSource, /..\/config\/api-constants\.js/);
  assert.match(runtimeShellSource, /..\/ui\/default-job-runtime-shell-view-port\.js/);
  assert.equal(translationDebugSource.includes("../api/"), false);
  assert.match(translationDebugSource, /job-translation-debug-data-port\.js/);
  assert.match(translationDebugDataSource, /..\/api\/translation-debug\.js/);
  assert.equal(uiSource.includes("../ui/"), false);
  assert.match(uiSource, /job-ui-presentation-port\.js/);
  assert.match(uiSource, /job-ui-job-actions-port\.js/);
  assert.match(uiSource, /job-ui-text-port\.js/);
  assert.equal(uiPresentationSource.includes("../ui/presentation.js"), false);
  assert.match(uiPresentationSource, /job-ui-render-port\.js/);
  assert.match(uiPresentationSource, /job-ui-workflow-presentation-port\.js/);
  assert.match(uiJobActionsSource, /..\/ui\/job-actions\.js/);
  assert.match(uiRenderSource, /..\/ui\/presentation\.js/);
  assert.match(uiTextSource, /..\/ui\/text\.js/);
  assert.match(uiWorkflowPresentationSource, /..\/ui\/presentation\.js/);
});

test("app initializer consumes external effects through initializer ports", () => {
  const source = readBootstrapSource("app-initializer.js");
  const flowSource = readBootstrapSource("app-initializer-flow.js");
  const startupFlowSource = readBootstrapSource("app-initializer-startup-flow.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("./startup-route.js"), false);
  assert.match(source, /app-initializer-ports\.js/);
  assert.match(source, /app-initializer-flow\.js/);
  assert.equal(flowSource.includes("../config.js"), false);
  assert.equal(flowSource.includes("../api/"), false);
  assert.equal(flowSource.includes("../state/store.js"), false);
  assert.equal(flowSource.includes("../ui/"), false);
  assert.equal(flowSource.includes("./startup-route.js"), false);
  assert.match(flowSource, /app-initializer-ports\.js/);
  assert.match(flowSource, /app-initializer-startup-flow\.js/);
  assert.match(flowSource, /config-bootstrap\.js/);
  assert.match(startupFlowSource, /startup-route\.js/);
});

test("feature registry consumes feature defaults through registry ports", () => {
  const source = readBootstrapSource("feature-registry.js");
  const portsSource = readBootstrapSource("feature-registry-ports.js");
  const libraryEventSource = readBootstrapSource("feature-registry-library-event-port.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("./mount-core-features.js"), false);
  assert.equal(source.includes("./mount-upload-workflow-features.js"), false);
  assert.equal(source.includes("./mount-glossary-feature.js"), false);
  assert.equal(source.includes("./mount-credential-action-features.js"), false);
  assert.equal(source.includes("./mount-job-features.js"), false);
  assert.equal(source.includes("./bind-feature-events.js"), false);
  assert.match(source, /feature-registry-ports\.js/);
  assert.match(portsSource, /feature-registry-library-event-port\.js/);
  assert.match(portsSource, /mount-core-features\.js/);
  assert.match(portsSource, /mount-upload-workflow-features\.js/);
  assert.match(portsSource, /mount-glossary-feature\.js/);
  assert.match(portsSource, /mount-credential-action-features\.js/);
  assert.match(portsSource, /mount-job-features\.js/);
  assert.match(portsSource, /bind-feature-events\.js/);
  assert.match(libraryEventSource, /features\/library\/library-event-port\.js/);
});

test("app initializer mount port composes grouped default ports", () => {
  const source = readBootstrapSource("app-initializer-ports.js");
  const dataSource = readBootstrapSource("app-initializer-data-port.js");
  const dataHttpSource = readBootstrapSource("app-initializer-data-http-port.js");
  const dataJobsSource = readBootstrapSource("app-initializer-data-jobs-port.js");
  const runtimeSource = readBootstrapSource("app-initializer-runtime-port.js");
  const configSource = readBootstrapSource("app-initializer-config-port.js");
  const environmentSource = readBootstrapSource("app-initializer-environment-port.js");
  const persistedConfigSource = readBootstrapSource("app-initializer-persisted-config-port.js");
  const desktopSource = readBootstrapSource("app-initializer-desktop-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../desktop/index.js"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("./feature-registry.js"), false);
  assert.match(source, /app-initializer-data-port\.js/);
  assert.match(source, /app-initializer-feature-port\.js/);
  assert.match(source, /app-initializer-legacy-state-port\.js/);
  assert.match(source, /app-initializer-runtime-port\.js/);
  assert.match(source, /app-initializer-ui-port\.js/);
  assert.equal(dataSource.includes("../api/"), false);
  assert.match(dataSource, /app-initializer-data-http-port\.js/);
  assert.match(dataSource, /app-initializer-data-jobs-port\.js/);
  assert.match(dataHttpSource, /..\/api\/http\.js/);
  assert.match(dataJobsSource, /..\/api\/jobs-query\.js/);
  assert.match(dataJobsSource, /..\/api\/library-books\.js/);
  assert.equal(runtimeSource.includes("../config.js"), false);
  assert.equal(runtimeSource.includes("../desktop/index.js"), false);
  assert.match(runtimeSource, /app-initializer-config-port\.js/);
  assert.match(runtimeSource, /app-initializer-desktop-port\.js/);
  assert.equal(configSource.includes("../config.js"), false);
  assert.match(configSource, /app-initializer-environment-port\.js/);
  assert.match(configSource, /app-initializer-persisted-config-port\.js/);
  assert.match(environmentSource, /..\/config\/desktop-persistence\.js/);
  assert.match(persistedConfigSource, /..\/config\/desktop-persistence\.js/);
  assert.match(desktopSource, /..\/desktop\/index\.js/);
});

test("feature event binder consumes external effects through event binding ports", () => {
  const source = readBootstrapSource("bind-feature-events.js");
  const payloadSource = readBootstrapSource("bind-feature-events-payloads.js");

  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /bind-feature-events-ports\.js/);
  assert.match(source, /bind-feature-events-payloads\.js/);
  assert.equal(payloadSource.includes("../api/"), false);
  assert.equal(payloadSource.includes("../state/store.js"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
  assert.match(payloadSource, /eventPort: ports\.eventPort/);
});

test("feature event binding port composes grouped default ports", () => {
  const source = readBootstrapSource("bind-feature-events-ports.js");
  const mainEventSource = readBootstrapSource("bind-feature-events-main-event-port.js");

  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../state/store.js"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /bind-feature-events-data-port\.js/);
  assert.match(source, /bind-feature-events-legacy-state-port\.js/);
  assert.match(source, /bind-feature-events-main-event-port\.js/);
  assert.match(source, /bind-feature-events-ui-port\.js/);
  assert.match(mainEventSource, /main-event-port\.js/);
});

test("core feature mount consumes external effects through mount ports", () => {
  const source = readBootstrapSource("mount-core-features.js");
  const payloadSource = readBootstrapSource("core-feature-mount-payloads.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /core-feature-mount-ports\.js/);
  assert.match(source, /core-feature-mount-payloads\.js/);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
});

test("core feature mount port composes grouped default ports", () => {
  const source = readBootstrapSource("core-feature-mount-ports.js");
  const controllersSource = readBootstrapSource("core-feature-controllers-port.js");
  const appShellUiSource = readBootstrapSource("core-app-shell-ui-mount-port.js");
  const appShellJobActionsSource = readBootstrapSource("core-app-shell-job-actions-port.js");
  const appShellJobPresentationSource = readBootstrapSource("core-app-shell-job-presentation-port.js");
  const appShellActionButtonsSource = readBootstrapSource("core-app-shell-action-buttons-port.js");
  const appShellFilePickerSource = readBootstrapSource("core-app-shell-file-picker-port.js");
  const appShellProgressSource = readBootstrapSource("core-app-shell-progress-port.js");
  const appShellTextSource = readBootstrapSource("core-app-shell-text-port.js");
  const appShellUploadResetSource = readBootstrapSource("core-app-shell-upload-reset-port.js");
  const translationWorkflowStatusAreaSource = readBootstrapSource("core-translation-workflow-status-area-port.js");

  assert.equal(source.includes("../features/home/state.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.match(source, /core-feature-controllers-port\.js/);
  assert.match(source, /core-app-shell-ui-mount-port\.js/);
  assert.match(source, /core-home-mount-port\.js/);
  assert.match(source, /core-presentation-mount-port\.js/);
  assert.match(source, /core-translation-workflow-status-area-port\.js/);
  assert.equal(controllersSource.includes("../features/"), false);
  assert.match(controllersSource, /core-app-shell-feature-controller-port\.js/);
  assert.match(controllersSource, /core-app-update-feature-controller-port\.js/);
  assert.match(controllersSource, /core-home-feature-controller-port\.js/);
  assert.match(controllersSource, /core-translation-workflow-feature-controller-port\.js/);
  assert.equal(appShellUiSource.includes("../ui/"), false);
  assert.match(appShellUiSource, /core-app-shell-job-actions-port\.js/);
  assert.match(appShellUiSource, /core-app-shell-job-presentation-port\.js/);
  assert.match(appShellUiSource, /core-app-shell-text-port\.js/);
  assert.equal(appShellJobActionsSource.includes("../ui/"), false);
  assert.match(appShellJobActionsSource, /core-app-shell-action-buttons-port\.js/);
  assert.match(appShellJobActionsSource, /core-app-shell-file-picker-port\.js/);
  assert.match(appShellJobActionsSource, /core-app-shell-progress-port\.js/);
  assert.match(appShellJobActionsSource, /core-app-shell-upload-reset-port\.js/);
  assert.match(appShellActionButtonsSource, /..\/ui\/job-actions\.js/);
  assert.match(appShellFilePickerSource, /..\/ui\/job-actions\.js/);
  assert.match(appShellProgressSource, /..\/ui\/job-actions\.js/);
  assert.match(appShellUploadResetSource, /..\/ui\/job-actions\.js/);
  assert.match(appShellJobPresentationSource, /..\/job\/diagnostics\.js/);
  assert.match(appShellJobPresentationSource, /..\/job\/normalize\.js/);
  assert.match(appShellTextSource, /..\/ui\/text\.js/);
  assert.match(translationWorkflowStatusAreaSource, /..\/ui\/status-area-view\.js/);
});

test("glossary feature mount consumes external effects through mount ports", () => {
  const source = readBootstrapSource("mount-glossary-feature.js");
  const payloadSource = readBootstrapSource("glossary-feature-mount-payloads.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../constants.js"), false);
  assert.match(source, /glossary-mount-ports\.js/);
  assert.match(source, /glossary-feature-mount-payloads\.js/);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../api/"), false);
  assert.equal(payloadSource.includes("../constants.js"), false);
});

test("glossary mount port composes grouped default ports", () => {
  const source = readBootstrapSource("glossary-mount-ports.js");
  const controllerSource = readBootstrapSource("glossary-controller-mount-port.js");
  const runtimeSource = readBootstrapSource("glossary-runtime-mount-port.js");
  const runtimeConfigSource = readBootstrapSource("glossary-runtime-config-port.js");
  const dataSource = readBootstrapSource("glossary-data-mount-port.js");
  const dataApiSource = readBootstrapSource("glossary-data-api-port.js");

  assert.equal(source.includes("../api/"), false);
  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.match(source, /glossary-controller-mount-port\.js/);
  assert.match(source, /glossary-data-mount-port\.js/);
  assert.match(source, /glossary-runtime-mount-port\.js/);
  assert.match(controllerSource, /features\/glossaries\/controller\.js/);
  assert.equal(runtimeSource.includes("../constants.js"), false);
  assert.match(runtimeSource, /glossary-runtime-config-port\.js/);
  assert.match(runtimeConfigSource, /..\/config\/api-constants\.js/);
  assert.equal(dataSource.includes("../api/"), false);
  assert.match(dataSource, /glossary-data-api-port\.js/);
  assert.match(dataApiSource, /..\/api\/glossaries\.js/);
});

test("config bootstrap consumes external effects through bootstrap ports", () => {
  const source = readBootstrapSource("config-bootstrap.js");
  const payloadSource = readBootstrapSource("config-bootstrap-payloads.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../state/"), false);
  assert.equal(source.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(source, /config-bootstrap-ports\.js/);
  assert.match(source, /config-bootstrap-payloads\.js/);
  assert.equal(payloadSource.includes("../config.js"), false);
  assert.equal(payloadSource.includes("../state/"), false);
  assert.equal(payloadSource.includes("../features/credentials/hidden-inputs.js"), false);
});

test("config bootstrap port composes grouped default ports", () => {
  const source = readBootstrapSource("config-bootstrap-ports.js");
  const defaultsSource = readBootstrapSource("config-bootstrap-defaults-port.js");
  const modelDefaultsSource = readBootstrapSource("config-bootstrap-model-defaults-port.js");
  const ocrDefaultsSource = readBootstrapSource("config-bootstrap-ocr-defaults-port.js");

  assert.equal(source.includes("../config.js"), false);
  assert.equal(source.includes("../state/actions.js"), false);
  assert.equal(source.includes("../features/credentials/hidden-inputs.js"), false);
  assert.match(source, /config-bootstrap-credentials-port\.js/);
  assert.match(source, /config-bootstrap-defaults-port\.js/);
  assert.match(source, /config-bootstrap-developer-state-port\.js/);
  assert.equal(defaultsSource.includes("../config.js"), false);
  assert.match(defaultsSource, /config-bootstrap-model-defaults-port\.js/);
  assert.match(defaultsSource, /config-bootstrap-ocr-defaults-port\.js/);
  assert.match(modelDefaultsSource, /..\/config\/runtime\.js/);
  assert.match(ocrDefaultsSource, /..\/config\/runtime\.js/);
});

test("dynamic primary actions can bind without direct global document access", () => {
  const source = readBootstrapSource("dynamic-primary-actions.js");
  const portSource = readBootstrapSource("dynamic-primary-actions-port.js");
  const readerPortSource = readBootstrapSource("dynamic-primary-actions-reader-port.js");
  const textPortSource = readBootstrapSource("dynamic-primary-actions-text-port.js");

  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("document.addEventListener"), false);
  assert.match(source, /dynamic-primary-actions-port\.js/);
  assert.match(source, /documentRef/);
  assert.match(source, /openReaderFromButtonFn/);
  assert.equal(portSource.includes("../features/"), false);
  assert.equal(portSource.includes("../ui/"), false);
  assert.match(portSource, /dynamic-primary-actions-reader-port\.js/);
  assert.match(portSource, /dynamic-primary-actions-text-port\.js/);
  assert.match(readerPortSource, /features\/reader-dialog\/entry\.js/);
  assert.match(textPortSource, /..\/ui\/text\.js/);
});

test("startup route consumes external effects through startup route ports", () => {
  const source = readBootstrapSource("startup-route.js");
  const payloadSource = readBootstrapSource("startup-route-recent-jobs-payloads.js");

  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("window.setTimeout"), false);
  assert.match(source, /startup-route-ports\.js/);
  assert.match(source, /startup-reader-open-flow\.js/);
  assert.match(source, /startup-route-recent-jobs-payloads\.js/);
  assert.equal(payloadSource.includes("../constants.js"), false);
  assert.equal(payloadSource.includes("../features/"), false);
  assert.equal(payloadSource.includes("../ui/"), false);
  assert.equal(payloadSource.includes("window.setTimeout"), false);
  assert.match(payloadSource, /startup-reader-open-flow\.js/);
});

test("startup route port composes grouped default ports", () => {
  const source = readBootstrapSource("startup-route-ports.js");
  const recentJobsSource = readBootstrapSource("startup-route-recent-jobs-port.js");
  const homeStateSource = readBootstrapSource("startup-route-home-state-port.js");
  const recentJobsFeatureSource = readBootstrapSource("startup-route-recent-jobs-feature-port.js");
  const recentJobsControllerSource = readBootstrapSource("startup-route-recent-jobs-controller-port.js");
  const recentJobsReaderSource = readBootstrapSource("startup-route-recent-jobs-reader-port.js");
  const recentJobsRuntimeSource = readBootstrapSource("startup-route-recent-jobs-runtime-port.js");
  const recentJobsStageAdapterSource = readBootstrapSource("startup-route-recent-jobs-stage-adapter-port.js");
  const recentJobsStateSource = readBootstrapSource("startup-route-recent-jobs-state-port.js");
  const runtimeSource = readBootstrapSource("startup-route-runtime-port.js");
  const configSource = readBootstrapSource("startup-route-config-port.js");

  assert.equal(source.includes("../constants.js"), false);
  assert.equal(source.includes("../features/"), false);
  assert.equal(source.includes("../ui/"), false);
  assert.equal(source.includes("startup-location.js"), false);
  assert.match(source, /startup-route-reader-port\.js/);
  assert.match(source, /startup-route-current-job-port\.js/);
  assert.match(source, /startup-route-recent-jobs-port\.js/);
  assert.match(source, /startup-route-runtime-port\.js/);
  assert.match(source, /startup-route-ui-port\.js/);
  assert.equal(recentJobsSource.includes("../features/"), false);
  assert.match(recentJobsSource, /startup-route-home-state-port\.js/);
  assert.match(recentJobsSource, /startup-route-recent-jobs-feature-port\.js/);
  assert.match(homeStateSource, /features\/home\/state\.js/);
  assert.equal(recentJobsFeatureSource.includes("../features/"), false);
  assert.match(recentJobsFeatureSource, /startup-route-recent-jobs-controller-port\.js/);
  assert.match(recentJobsFeatureSource, /startup-route-recent-jobs-reader-port\.js/);
  assert.match(recentJobsFeatureSource, /startup-route-recent-jobs-runtime-port\.js/);
  assert.match(recentJobsFeatureSource, /startup-route-recent-jobs-stage-adapter-port\.js/);
  assert.match(recentJobsFeatureSource, /startup-route-recent-jobs-state-port\.js/);
  assert.match(recentJobsControllerSource, /features\/recent-jobs\/controller\.js/);
  assert.match(recentJobsReaderSource, /features\/recent-jobs\/reader-port\.js/);
  assert.match(recentJobsRuntimeSource, /features\/recent-jobs\/job-runtime-port\.js/);
  assert.match(recentJobsStageAdapterSource, /job-status\/job-stage-contract-adapter\.js/);
  assert.match(recentJobsStateSource, /features\/recent-jobs\/state\.js/);
  assert.equal(runtimeSource.includes("../constants.js"), false);
  assert.match(runtimeSource, /startup-route-config-port\.js/);
  assert.match(runtimeSource, /startup-location\.js/);
  assert.match(configSource, /..\/config\/api-constants\.js/);
  assert.match(readBootstrapSource("startup-route-current-job-port.js"), /features\/job-runtime\/current-job-state\.js/);
});

test("job runtime default adapter shims are not kept in feature layer", () => {
  for (const fileName of ["job-actions-runtime-port.js", "presentation-runtime-port.js"]) {
    assert.equal(existsSync(join(FEATURE_ROOT, "job-runtime", fileName)), false);
  }
});

test("legacy default job runtime adapter is a compatibility re-export only", () => {
  const defaultAdaptersSource = readUiSource("default-job-runtime-adapters.js");

  assert.match(defaultAdaptersSource, /default-job-actions-runtime\.js/);
  assert.equal(defaultAdaptersSource.includes("state/store.js"), false);
  assert.equal(defaultAdaptersSource.includes("features/"), false);
  assert.equal(defaultAdaptersSource.includes("createJobActionsRuntime"), false);
  assert.equal(defaultAdaptersSource.includes("createPresentationRuntime"), false);
});

test("default presentation runtime reads job runtime state through state port", () => {
  const defaultPresentationSource = readUiSource("default-presentation-runtime.js");
  const defaultPresentationStateSource = readUiSource("default-presentation-runtime-state-port.js");

  assert.match(defaultPresentationSource, /default-presentation-runtime-state-port\.js/);
  assert.equal(defaultPresentationSource.includes("../features/job-runtime/"), false);
  assert.equal(defaultPresentationSource.includes("../state/store.js"), false);
  assert.match(defaultPresentationStateSource, /features\/job-runtime\/render-context\.js/);
  assert.match(defaultPresentationStateSource, /features\/job-runtime\/current-job-state\.js/);
  assert.match(defaultPresentationStateSource, /features\/job-runtime\/secondary-resource-cache\.js/);
  assert.match(defaultPresentationStateSource, /state\/store\.js/);
});

test("recent jobs list rendering owns image and list behavior outside dialog component", () => {
  const listRenderingSource = readFeatureSource("recent-jobs", "list-rendering.js");
  const featureViewSource = readFeatureSource("recent-jobs", "view.js");
  const imageHydrationSource = readFeatureSource("recent-jobs", "image-hydration.js");
  const dialogRenderingSource = readSource(join(SOURCE_ROOTS.components, "dialogs", "recent-jobs-dialog-rendering.js"));

  assert.equal(listRenderingSource.includes("../../components/dialogs/recent-jobs-dialog-rendering.js"), false);
  assert.match(listRenderingSource, /image-hydration\.js/);
  assert.match(imageHydrationSource, /image-loader\.js/);
  assert.equal(dialogRenderingSource.includes("image-hydration.js"), false);
  assert.equal(dialogRenderingSource.includes("image-loader.js"), false);
  assert.equal(dialogRenderingSource.includes("list-events.js"), false);
  assert.equal(dialogRenderingSource.includes("recent-jobs/host.js"), false);
  assert.equal(dialogRenderingSource.includes("features/recent-jobs"), false);
  assert.match(featureViewSource, /bindRecentJobsListEvents/);
  assert.match(featureViewSource, /hydrateRecentJobImages/);
});

test("recent jobs feature does not import home state directly", () => {
  for (const fileName of ["controller.js", "loader.js", "commit.js", "runtime-item.js"]) {
    const source = readFeatureSource("recent-jobs", fileName);

    assert.equal(source.includes("../home/state.js"), false);
  }
  assert.equal(readFeatureSource("recent-jobs", "runtime-item.js").includes("../../job/core.js"), false);
  assert.equal(readFeatureSource("recent-jobs", "runtime-item.js").includes("../../job-status/"), false);
  assert.match(readFeatureSource("recent-jobs", "runtime-item.js"), /runtime-value-helpers\.js/);
  assert.equal(
    readFeatureSource("recent-jobs", "library-refresh-port.js").includes("../library/library-event-port.js"),
    false,
  );
  assert.equal(
    readFeatureSource("recent-jobs", "active-job-recovery.js").includes("../job-runtime/active-job-storage.js"),
    false,
  );
  assert.equal(readFeatureSource("recent-jobs", "state.js").includes("../../state/store.js"), false);
  assert.match(readFeatureSource("recent-jobs", "loading-state-contract.js"), /RECENT_JOBS_LOADING_STATES/);
});

test("home and recent jobs state ports avoid legacy global state imports", () => {
  const homeStateSource = readFeatureSource("home", "state.js");
  const recentJobsStateSource = readFeatureSource("recent-jobs", "state.js");
  const globalHomeStateSource = readSource(join(SOURCE_ROOTS.state, "home-state.js"));
  const homeContractSource = readSource(join(SOURCE_ROOTS.contracts, "home-view-contract.js"));
  const coreHomePortSource = readBootstrapSource("core-home-mount-port.js");
  const startupHomePortSource = readBootstrapSource("startup-route-home-state-port.js");
  const startupRecentJobsPortSource = readBootstrapSource("startup-route-recent-jobs-state-port.js");

  assert.equal(homeStateSource.includes("../../state/store.js"), false);
  assert.equal(homeStateSource.includes("../../state/home-state.js"), false);
  assert.match(homeStateSource, /home-view-contract\.js/);
  assert.match(globalHomeStateSource, /home-view-contract\.js/);
  assert.equal(globalHomeStateSource.includes("export { HOME_VIEW_MODES }"), false);
  assert.equal(globalHomeStateSource.includes("export const HOME_LOADING_STATES"), false);
  assert.match(homeContractSource, /HOME_VIEW_MODES/);
  assert.match(homeContractSource, /HOME_LOADING_STATES/);
  assert.equal(recentJobsStateSource.includes("../../state/store.js"), false);
  assert.match(coreHomePortSource, /state\/store\.js/);
  assert.match(startupHomePortSource, /state\/store\.js/);
  assert.match(startupRecentJobsPortSource, /state\/store\.js/);
});

test("recent job card component owns presenter and image loading behavior", () => {
  const cardSource = readSource(join(SOURCE_ROOTS.components, "recent-jobs", "recent-job-card.js"));
  const presenterSource = readSource(join(SOURCE_ROOTS.components, "recent-jobs", "recent-job-card-presenter.js"));
  const presenterShimSource = readFeatureSource("recent-jobs", "card-presenter.js");
  const imageLoaderShimSource = readFeatureSource("recent-jobs", "image-loader.js");

  assert.equal(cardSource.includes("../../features/recent-jobs/card-presenter.js"), false);
  assert.equal(cardSource.includes("../../features/recent-jobs/image-loader.js"), false);
  assert.equal(presenterSource.includes("../../features/recent-jobs/formatting.js"), false);
  assert.match(cardSource, /recent-job-card-presenter\.js/);
  assert.match(cardSource, /recent-job-card-image-loader\.js/);
  assert.equal(stripCompatibilityReExports(presenterShimSource), "");
  assert.equal(stripCompatibilityReExports(imageLoaderShimSource), "");
  assert.match(presenterShimSource, /components\/recent-jobs\/recent-job-card-presenter\.js/);
  assert.match(imageLoaderShimSource, /components\/recent-jobs\/recent-job-card-image-loader\.js/);
});

test("glossary manager dialog owns its component dom contract", () => {
  const dialogSource = readSource(join(SOURCE_ROOTS.components, "dialogs", "glossary-manager-dialog.js"));
  const templateSource = readSource(join(SOURCE_ROOTS.components, "dialogs", "glossary-manager-dialog-template.js"));
  const featureContractSource = readFeatureSource("glossaries", "glossary-dom-contract.js");

  assert.equal(dialogSource.includes("../../features/glossaries/glossary-dom-contract.js"), false);
  assert.equal(templateSource.includes("../../features/glossaries/glossary-dom-contract.js"), false);
  assert.match(dialogSource, /glossary-manager-dialog-dom-contract\.js/);
  assert.match(templateSource, /glossary-manager-dialog-dom-contract\.js/);
  assert.equal(stripCompatibilityReExports(featureContractSource), "");
  assert.match(featureContractSource, /components\/dialogs\/glossary-manager-dialog-dom-contract\.js/);
});

test("app shell header owns the update dom contract outside feature layer", () => {
  const headerSource = readSource(join(SOURCE_ROOTS.components, "layout", "app-shell-header.js"));
  const featureContractSource = readFeatureSource("app-update", "contract.js");

  assert.equal(headerSource.includes("../../features/app-update/contract.js"), false);
  assert.match(headerSource, /app-update-dom-contract\.js/);
  assert.equal(stripCompatibilityReExports(featureContractSource), "");
  assert.match(featureContractSource, /components\/layout\/app-update-dom-contract\.js/);
});

test("job runtime controller and reset flow use reset state port for legacy state actions", () => {
  for (const fileName of ["controller.js", "runtime-reset.js"]) {
    const source = readJobRuntimeSource(fileName);

    assert.equal(source.includes("../../state/actions.js"), false);
    assert.match(source, /reset-state-port\.js/);
  }
  assert.equal(readJobRuntimeSource("controller.js").includes("../../job/core.js"), false);
  assert.equal(readJobRuntimeSource("controller.js").includes("../../job/normalize.js"), false);
  assert.equal(readJobRuntimeSource("secondary-resources.js").includes("../../job-status/job-display-state.js"), false);
  assert.equal(readJobRuntimeSource("runtime-reset.js").includes("../upload/state.js"), false);
  assert.equal(readJobRuntimeSource("runtime-reset.js").includes("../../job/diagnostics.js"), false);
  assert.equal(readJobRuntimeSource("render-context.js").includes("../../job/normalize.js"), false);

  const resetPortSource = readJobRuntimeSource("reset-state-port.js");
  assert.equal(resetPortSource.includes("../../state/actions.js"), false);
  assert.equal(resetPortSource.includes("../../state/job-state.js"), false);
  assert.equal(resetPortSource.includes("../../state/upload-state.js"), false);

  const legacyStateAdapterSource = readBootstrapSource("legacy-state-helper-adapters.js");
  const resetAdapterSource = readBootstrapSource("job-runtime-reset-state-port.js");
  const jobPresentationSource = readBootstrapSource("job-runtime-job-presentation-port.js");
  assert.match(legacyStateAdapterSource, /..\/state\/job-state\.js/);
  assert.match(legacyStateAdapterSource, /..\/state\/upload-state\.js/);
  assert.match(resetAdapterSource, /job-runtime\/reset-state-port\.js/);
  assert.match(jobPresentationSource, /..\/job\/core\.js/);
  assert.match(jobPresentationSource, /..\/job\/diagnostics\.js/);
  assert.match(jobPresentationSource, /..\/job\/normalize\.js/);
  assert.match(jobPresentationSource, /..\/job-status\/job-display-state\.js/);

  const defaultJobActionsSource = readUiSource("default-job-actions-runtime.js");
  assert.equal(defaultJobActionsSource.includes("../features/upload/state.js"), false);
  assert.match(defaultJobActionsSource, /job-runtime\/reset-state-port\.js/);
});

test("current job state mirrors legacy fields through an explicit port", () => {
  const currentJobStateSource = readJobRuntimeSource("current-job-state.js");
  const legacyMirrorSource = readJobRuntimeSource("legacy-current-job-state-port.js");
  const secondarySelectorSource = readJobRuntimeSource("current-job-secondary-selectors.js");

  assert.match(currentJobStateSource, /legacy-current-job-state-port\.js/);
  assert.equal(/state\.currentJob[A-Za-z]*\s*=(?!=)/.test(currentJobStateSource), false);
  assert.match(legacyMirrorSource, /state\.currentJobId\s*=/);
  assert.match(legacyMirrorSource, /state\.currentJobSnapshot\s*=/);
  assert.match(legacyMirrorSource, /state\.currentJobFinishedAt\s*=/);
  assert.equal(currentJobStateSource.includes("secondary-resource-cache.js"), false);
  assert.match(currentJobStateSource, /current-job-secondary-selectors\.js/);
  assert.match(secondarySelectorSource, /secondary-resource-cache\.js/);
});

test("job runtime library events use injected library ports", () => {
  const controllerSource = readJobRuntimeSource("controller.js");
  const libraryEventsSource = readJobRuntimeSource("library-events.js");

  assert.equal(controllerSource.includes("../library/library-event-port.js"), false);
  assert.equal(libraryEventsSource.includes("../library/library-event-port.js"), false);
  assert.equal(libraryEventsSource.includes("createLibraryEventPort"), false);
  assert.match(controllerSource, /libraryEventPort/);
  assert.match(libraryEventsSource, /contracts\/library-event-contract\.js/);
});

test("job runtime shell port keeps default app-shell ui wiring outside feature layer", () => {
  const shellPortSource = readJobRuntimeSource("shell-view-port.js");
  const jobRuntimeMountPortSource = readBootstrapSource("job-runtime-mount-port.js");
  const jobRuntimeShellPortSource = readBootstrapSource("job-runtime-shell-port.js");
  const defaultAdaptersSource = readUiSource("default-job-runtime-adapters.js");
  const defaultShellViewPortSource = readUiSource("default-job-runtime-shell-view-port.js");

  assert.equal(shellPortSource.includes("../app-shell/view.js"), false);
  assert.match(shellPortSource, /closeDialogs = \(\) => \{\}/);
  assert.equal(jobRuntimeMountPortSource.includes("defaultJobRuntimeShellViewPort"), false);
  assert.match(jobRuntimeMountPortSource, /job-runtime-shell-port\.js/);
  assert.match(jobRuntimeShellPortSource, /defaultJobRuntimeShellViewPort/);
  assert.match(jobRuntimeShellPortSource, /default-job-runtime-shell-view-port\.js/);
  assert.equal(defaultAdaptersSource.includes("features/app-shell/view.js"), false);
  assert.match(defaultShellViewPortSource, /features\/app-shell\/view\.js/);
});

test("job actions view reads upload tile controls through ui boundary", () => {
  const jobActionsViewSource = readUiSource("job-actions-view.js");
  const workflowViewSource = readFeatureSource("workflow", "view.js");
  const credentialsViewSource = readFeatureSource("credentials", "view.js");
  const uploadTilePortSource = readUiSource("upload-tile-view-port.js");
  const uploadTileUiPortSource = readBootstrapSource("upload-tile-ui-port.js");

  assert.equal(jobActionsViewSource.includes("../features/upload/tile-view.js"), false);
  assert.equal(workflowViewSource.includes("../upload/tile-view.js"), false);
  assert.equal(workflowViewSource.includes("../credentials/hidden-inputs.js"), false);
  assert.equal(credentialsViewSource.includes("../upload/tile-view.js"), false);
  assert.match(jobActionsViewSource, /upload-tile-view-port\.js/);
  assert.equal(workflowViewSource.includes("upload-tile-view-port.js"), false);
  assert.match(uploadTileUiPortSource, /upload-tile-view-port\.js/);
  assert.equal(credentialsViewSource.includes("upload-tile-view-port.js"), false);
  assert.match(uploadTilePortSource, /features\/upload\/tile-view\.js/);
});

test("elapsed presenter reads job timing through a narrow timing port", () => {
  const presenterSource = readUiSource("elapsed-presenter.js");
  const timingPortSource = readUiSource("elapsed-timing-port.js");

  assert.equal(presenterSource.includes("../features/job-runtime/current-job-state.js"), false);
  assert.equal(presenterSource.includes("../features/job-runtime/runtime-timers.js"), false);
  assert.match(presenterSource, /elapsed-timing-port\.js/);
  assert.match(timingPortSource, /features\/job-runtime\/current-job-state\.js/);
  assert.match(timingPortSource, /features\/job-runtime\/runtime-timers\.js/);
});

test("job status render presentation reads stage pinning through job-status boundary", () => {
  const renderPresentationSource = readSource(join(
    SOURCE_ROOTS.jobStatus,
    "job-render-stage-presentation.js",
  ));
  const stagePinningPortSource = readSource(join(
    SOURCE_ROOTS.jobStatus,
    "stage-pinning-port.js",
  ));
  const stagePinningSource = readUiSource("stage-pinning.js");

  assert.equal(
    renderPresentationSource.includes("../features/job-runtime/stage-pin-state.js"),
    false,
  );
  assert.equal(renderPresentationSource.includes("../ui/stage-pinning.js"), false);
  assert.match(renderPresentationSource, /\.\/stage-pinning-port\.js/);
  assert.match(stagePinningPortSource, /features\/job-runtime\/stage-pin-state\.js/);
  assert.match(stagePinningSource, /job-status\/stage-pinning-port\.js/);
});

test("ui exposes a single stage pinning boundary", () => {
  const legacyFacade = join(SOURCE_ROOTS.ui, "display-stage-pin-state.js");
  const sourceFiles = filesUnder(
    SOURCE_ROOTS.bootstrap,
    SOURCE_ROOTS.features,
    SOURCE_ROOTS.job,
    SOURCE_ROOTS.jobStatus,
    SOURCE_ROOTS.statusDetail,
    SOURCE_ROOTS.ui,
  );
  const legacyImports = sourceFiles
    .filter((file) => readSource(file).includes("display-stage-pin-state"))
    .map((file) => relativeToProject(file));

  assert.equal(existsSync(legacyFacade), false);
  assert.deepEqual(legacyImports, []);
});

test("connected status card component does not import default ui rendering", () => {
  const connectedSource = readSource(join(
    SOURCE_ROOTS.components,
    "status",
    "connected-job-status-card.js",
  ));
  const viewPortSource = readUiSource("status-card-view-port.js");

  assert.equal(connectedSource.includes("../../ui/"), false);
  assert.equal(connectedSource.includes("presentation-view.js"), false);
  assert.match(viewPortSource, /createConnectedJobStatusCard/);
});

test("job-status layer does not keep ui compatibility facades", () => {
  const uiImports = findMatchingImports(filesUnder(SOURCE_ROOTS.jobStatus), /from\s+["']\.\.\/ui\//);

  assert.deepEqual(uiImports, []);
  assert.equal(existsSync(join(SOURCE_ROOTS.jobStatus, "job-stage-contract.js")), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.jobStatus, "job-stage-render-detection.js")), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.jobStatus, "job-status-card-renderer.js")), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.jobStatus, "status-ring-fallback.js")), false);
});

test("ui layer does not keep stage action compatibility helper", () => {
  assert.equal(existsSync(join(SOURCE_ROOTS.ui, "stage-actions.js")), false);
});

test("status detail presenter port keeps default ui wiring outside feature layer", () => {
  const presenterPortSource = readFeatureSource("status-detail", "presenter-port.js");
  const translationPresenterSource = readFeatureSource("status-detail", "translation-presenter.js");
  const controllerPortSource = readBootstrapSource("status-detail-feature-controller-port.js");
  const defaultAdaptersSource = readUiSource("default-status-detail-adapters.js");

  assert.equal(presenterPortSource.includes("../../ui/presentation-view.js"), false);
  assert.equal(presenterPortSource.includes("./view.js"), false);
  assert.equal(presenterPortSource.includes("../../ui/"), false);
  assert.equal(translationPresenterSource.includes("../../ui/"), false);
  assert.match(presenterPortSource, /status-detail\/presenter\.js/);
  assert.match(controllerPortSource, /default-status-detail-adapters\.js/);
  assert.match(defaultAdaptersSource, /presentation-view\.js/);
  assert.match(defaultAdaptersSource, /features\/status-detail\/view\.js/);
});

test("status detail layer does not keep legacy render compatibility facades", () => {
  for (const fileName of ["renderer.js", "presentation.js"]) {
    assert.equal(existsSync(join(SOURCE_ROOTS.statusDetail, fileName)), false);
  }
});

test("status detail dialog ports keep default component wiring outside feature layer", () => {
  for (const fileName of ["dialog-view-port.js", "translation-view-port.js"]) {
    const source = readFeatureSource("status-detail", fileName);

    assert.equal(source.includes("./view.js"), false);
    assert.equal(source.includes("dialogComponent"), false);
  }

  const defaultAdaptersSource = readUiSource("default-status-detail-adapters.js");
  const componentPortSource = readUiSource("status-detail-component-port.js");
  assert.match(defaultAdaptersSource, /createStatusDetailDialogViewPort/);
  assert.match(defaultAdaptersSource, /createStatusDetailTranslationViewPort/);
  assert.equal(defaultAdaptersSource.includes("dialogComponent"), false);
  assert.match(defaultAdaptersSource, /status-detail-component-port\.js/);
  assert.match(componentPortSource, /dialogComponent/);
});

test("status detail controller delegates translation tab wiring to translation tab port", () => {
  const controllerSource = readFeatureSource("status-detail", "controller.js");
  const resumeActionsSource = readFeatureSource("status-detail", "resume-actions.js");
  const translationTabPortSource = readFeatureSource("status-detail", "translation-tab-port.js");
  const bootstrapPortSource = readBootstrapSource("status-detail-feature-controller-port.js");
  const bootstrapJobActionSource = readBootstrapSource("status-detail-job-action-resolver-port.js");
  const bootstrapRuntimePortSource = readBootstrapSource("status-detail-runtime-port.js");

  assert.equal(controllerSource.includes("./job-runtime-port.js"), false);
  assert.equal(resumeActionsSource.includes("../../job/actions.js"), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.features, "status-detail", "job-runtime-port.js")), false);
  assert.equal(existsSync(join(SOURCE_ROOTS.features, "reader-dialog", "runtime-port.js")), false);
  assert.match(controllerSource, /jobActionResolver/);
  assert.match(bootstrapPortSource, /status-detail-job-action-resolver-port\.js/);
  assert.match(bootstrapJobActionSource, /..\/job\/actions\.js/);
  assert.match(bootstrapRuntimePortSource, /job-runtime\/current-job-state\.js/);
  assert.match(bootstrapRuntimePortSource, /job-runtime\/secondary-resource-cache\.js/);
  assert.equal(controllerSource.includes("./translation-state.js"), false);
  assert.equal(controllerSource.includes("./translation-renderer.js"), false);
  assert.equal(controllerSource.includes("./translation-data-port.js"), false);
  assert.equal(controllerSource.includes("./translation-tab-coordinator.js"), false);
  assert.equal(controllerSource.includes("../../ui/default-status-detail-adapters.js"), false);
  assert.match(controllerSource, /translation-tab-port\.js/);
  assert.equal(translationTabPortSource.includes("../../ui/default-status-detail-adapters.js"), false);
  assert.match(bootstrapPortSource, /default-status-detail-adapters\.js/);
  assert.match(bootstrapPortSource, /status-detail-runtime-port\.js/);
  assert.match(bootstrapPortSource, /defaultStatusDetailDialogViewPort/);
  assert.match(bootstrapPortSource, /defaultStatusDetailTranslationViewPort/);
});

test("translation workflow dialog controller uses status area port for ui effects", () => {
  const controllerSource = readFeatureSource("translation-workflow-dialog", "controller.js");
  const contractSource = readFeatureSource("translation-workflow-dialog", "contract.js");
  const stateSource = readFeatureSource("translation-workflow-dialog", "state.js");
  const statusAreaPortSource = readFeatureSource("translation-workflow-dialog", "status-area-port.js");
  const viewSource = readFeatureSource("translation-workflow-dialog", "view.js");
  const bootstrapStatusAreaSource = readBootstrapSource("core-translation-workflow-status-area-port.js");

  assert.equal(controllerSource.includes("../../ui/status-area-view.js"), false);
  assert.match(controllerSource, /status-area-port\.js/);
  assert.equal(stateSource.includes("../home/state.js"), false);
  assert.match(stateSource, /contracts\/home-view-contract\.js/);
  assert.match(stateSource, /contract\.js/);
  assert.equal(stateSource.includes("export const TRANSLATION_WORKFLOW_MODES"), false);
  assert.match(contractSource, /TRANSLATION_WORKFLOW_MODES/);
  assert.equal(statusAreaPortSource.includes("../../ui/status-area-view.js"), false);
  assert.equal(viewSource.includes("../../ui/status-area-view.js"), false);
  assert.match(bootstrapStatusAreaSource, /..\/ui\/status-area-view\.js/);
});

test("app actions controller reads runtime state through explicit ports", () => {
  const source = readFeatureSource("app-actions", "controller.js");
  const submitFlowSource = readFeatureSource("app-actions", "submit-flow.js");
  const jobSnapshotPortSource = readFeatureSource("app-actions", "job-snapshot-port.js");
  const bootstrapJobSnapshotPortSource = readBootstrapSource("app-actions-job-snapshot-port.js");
  const uploadPortSource = readFeatureSource("app-actions", "upload-state-port.js");
  const legacyStateAdapterSource = readBootstrapSource("legacy-state-helper-adapters.js");

  assert.equal(source.includes("../../state/desktop-state.js"), false);
  assert.equal(source.includes("../../state/upload-state.js"), false);
  assert.equal(source.includes("../upload/state.js"), false);
  assert.equal(source.includes("../job-runtime/current-job-state.js"), false);
  assert.equal(source.includes("../library/library-event-port.js"), false);
  assert.equal(jobSnapshotPortSource.includes("../job-runtime/current-job-state.js"), false);
  assert.equal(submitFlowSource.includes("../workflow/submit-readiness.js"), false);
  assert.match(source, /runtime-env-port\.js/);
  assert.match(source, /job-snapshot-port\.js/);
  assert.match(source, /upload-state-port\.js/);
  assert.match(submitFlowSource, /contracts\/submit-readiness-contract\.js/);
  assert.match(bootstrapJobSnapshotPortSource, /job-runtime\/current-job-state\.js/);
  assert.equal(uploadPortSource.includes("../../state/upload-state.js"), false);
  assert.match(legacyStateAdapterSource, /..\/state\/upload-state\.js/);
});

test("app actions view delegates state writes through controller ports", () => {
  const source = readFeatureSource("app-actions", "view.js");

  assert.equal(source.includes("../../state/actions.js"), false);
  assert.match(source, /uploadStatePort\?\.reset/);
});

test("artifact downloads controller reads job runtime through runtime port", () => {
  const controllerSource = readFeatureSource("artifact-downloads", "controller.js");
  const downloadActionsSource = readFeatureSource("artifact-downloads", "download-actions.js");
  const runtimePortSource = readFeatureSource("artifact-downloads", "runtime-port.js");
  const nameResolverSource = readBootstrapSource("artifact-download-name-resolver-port.js");
  const bootstrapRuntimePortSource = readBootstrapSource("artifact-downloads-runtime-port.js");
  const controllerPortSource = readBootstrapSource("credential-artifact-downloads-feature-controller-port.js");

  assert.equal(controllerSource.includes("../job-runtime/current-job-state.js"), false);
  assert.match(controllerSource, /runtime-port\.js/);
  assert.match(controllerSource, /runtimePort\.currentJobId/);
  assert.equal(downloadActionsSource.includes("../../job/artifacts.js"), false);
  assert.equal(downloadActionsSource.includes("components/status/job-status-card-dom-contract.js"), false);
  assert.match(downloadActionsSource, /contracts\/download-action-contract\.js/);
  assert.equal(runtimePortSource.includes("../job-runtime/current-job-state.js"), false);
  assert.match(nameResolverSource, /..\/job\/artifacts\.js/);
  assert.match(bootstrapRuntimePortSource, /job-runtime\/current-job-state\.js/);
  assert.match(controllerPortSource, /artifact-download-name-resolver-port\.js/);
  assert.match(controllerPortSource, /artifact-downloads-runtime-port\.js/);
});

test("browser credentials controller reads runtime state through explicit ports", () => {
  const source = readFeatureSource("credentials", "browser.js");
  const uploadReadinessSource = readFeatureSource("credentials", "upload-readiness-port.js");
  const legacyStateAdapterSource = readBootstrapSource("legacy-state-helper-adapters.js");

  assert.equal(source.includes("../../state/actions.js"), false);
  assert.equal(source.includes("../../state/desktop-state.js"), false);
  assert.equal(source.includes("../../state/upload-state.js"), false);
  assert.equal(source.includes("../upload/state.js"), false);
  assert.match(source, /runtime-env-port\.js/);
  assert.match(source, /balance-state-port\.js/);
  assert.match(source, /upload-readiness-port\.js/);
  assert.equal(uploadReadinessSource.includes("../../state/upload-state.js"), false);
  assert.match(legacyStateAdapterSource, /..\/state\/upload-state\.js/);
});

test("reader dialog reads job runtime state through reader runtime port", () => {
  for (const fileName of ["controller.js", "routing.js"]) {
    const source = readFeatureSource("reader-dialog", fileName);

    assert.equal(source.includes("../job-runtime/current-job-state.js"), false);
    assert.equal(source.includes("../job-runtime/secondary-resource-cache.js"), false);
    assert.equal(source.includes("../../ui/text.js"), false);
    assert.match(source, /runtimePort|currentReaderArtifactUrls|requestedReaderJobIdFromLocation/);
  }

  const entrySource = readFeatureSource("reader-dialog", "entry.js");
  const controllerSource = readFeatureSource("reader-dialog", "controller.js");
  assert.equal(entrySource.includes("../job-runtime/current-job-state.js"), false);
  assert.equal(entrySource.includes("../job-runtime/secondary-resource-cache.js"), false);
  assert.equal(entrySource.includes("../../ui/text.js"), false);
  assert.equal(entrySource.includes("../../bootstrap/"), false);
  assert.match(entrySource, /runtimePort/);
  assert.equal(controllerSource.includes("currentReaderArtifactUrls"), false);
  assert.equal(controllerSource.includes("defaultReaderDialogRuntimePort"), false);
  assert.match(controllerSource, /runtimePort\.currentArtifactUrls/);

  const bootstrapRuntimePortSource = readBootstrapSource("reader-dialog-runtime-port.js");
  assert.equal(existsSync(join(SOURCE_ROOTS.features, "reader-dialog", "runtime-port.js")), false);
  assert.match(bootstrapRuntimePortSource, /job-runtime\/current-job-state\.js/);
  assert.match(bootstrapRuntimePortSource, /job-runtime\/secondary-resource-cache\.js/);
});

test("credentials state ports use narrow credential state slice instead of aggregate actions", () => {
  const legacyStateAdapterSource = readBootstrapSource("legacy-state-helper-adapters.js");
  for (const fileName of ["runtime-state-port.js", "balance-state-port.js", "legacy-runtime-port.js"]) {
    const source = readFeatureSource("credentials", fileName);

    assert.equal(source.includes("../../state/actions.js"), false);
    assert.equal(source.includes("../../state/credential-state.js"), false);
  }
  assert.match(legacyStateAdapterSource, /..\/state\/credential-state\.js/);

  const runtimeStateSource = readFeatureSource("credentials", "runtime-state-port.js");
  assert.equal(runtimeStateSource.includes("../../state/store.js"), false);
});

test("credentials validation flows mirror legacy runtime only through explicit port", () => {
  for (const fileName of ["validation.js", "deepseek-flow.js"]) {
    const source = readFeatureSource("credentials", fileName);

    assert.equal(source.includes("../../state/actions.js"), false);
    assert.match(source, /legacy-runtime-port\.js/);
  }
});

test("upload controller reads upload state only through upload state port", () => {
  const source = readFeatureSource("upload", "controller.js");
  const stateSource = readFeatureSource("upload", "state.js");

  assert.equal(source.includes("../../state/actions.js"), false);
  assert.equal(source.includes("../../state/upload-state.js"), false);
  assert.match(source, /createUploadStatePort/);
  assert.equal(stateSource.includes("../../state/store.js"), false);
  assert.equal(stateSource.includes("../../state/upload-state.js"), false);
});
