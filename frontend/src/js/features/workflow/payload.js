import { getOcrProviderDefinition, normalizeOcrProvider } from "../../config/providers.js";

export function buildSourcePayload({ workflow, developerConfig, uploadId, workflowNeedsUpload }) {
  return workflowNeedsUpload(workflow)
    ? { upload_id: uploadId }
    : { artifact_job_id: developerConfig.renderSourceJobId };
}

export function buildOcrPayload({
  pageRanges,
  ocrProvider,
  ocrToken,
  defaultPaddleApiUrl,
  constants,
}) {
  const provider = normalizeOcrProvider(ocrProvider);
  const definition = getOcrProviderDefinition(provider);
  const payload = {
    provider,
    [definition.tokenField]: ocrToken || "",
    model_version: constants.DEFAULT_MODEL_VERSION,
    language: constants.DEFAULT_LANGUAGE,
    page_ranges: pageRanges,
  };
  if (definition.id === "paddle") {
    payload.paddle_api_url = defaultPaddleApiUrl() || "https://paddleocr.aistudio-app.com";
  }
  return payload;
}

export function buildTranslationPayload({
  developerConfig,
  modelApiKey,
  selectedGlossaryId,
  constants,
}) {
  return {
    mode: constants.DEFAULT_MODE,
    math_mode: developerConfig.mathMode,
    model: developerConfig.model,
    base_url: developerConfig.baseUrl,
    api_key: modelApiKey || "",
    workers: developerConfig.workers,
    batch_size: developerConfig.batchSize,
    classify_batch_size: developerConfig.classifyBatchSize,
    rule_profile_name: constants.DEFAULT_RULE_PROFILE,
    custom_rules_text: "",
    glossary_id: selectedGlossaryId || developerConfig.glossaryId || "",
    glossary_entries: [],
    skip_title_translation: !developerConfig.translateTitles,
  };
}

export function buildRenderPayload({ developerConfig, constants }) {
  return {
    render_mode: constants.DEFAULT_RENDER_MODE,
    compile_workers: developerConfig.compileWorkers,
    typst_font_family: constants.DEFAULT_TYPST_FONT_FAMILY,
    pdf_compress_dpi: constants.DEFAULT_PDF_COMPRESS_DPI,
    translated_pdf_name: constants.DEFAULT_TRANSLATED_PDF_NAME,
    body_font_size_factor: constants.DEFAULT_BODY_FONT_SIZE_FACTOR,
    body_leading_factor: constants.DEFAULT_BODY_LEADING_FACTOR,
    inner_bbox_shrink_x: constants.DEFAULT_INNER_BBOX_SHRINK_X,
    inner_bbox_shrink_y: constants.DEFAULT_INNER_BBOX_SHRINK_Y,
    inner_bbox_dense_shrink_x: constants.DEFAULT_INNER_BBOX_DENSE_SHRINK_X,
    inner_bbox_dense_shrink_y: constants.DEFAULT_INNER_BBOX_DENSE_SHRINK_Y,
    font_unify_mode: constants.DEFAULT_FONT_UNIFY_MODE,
  };
}
