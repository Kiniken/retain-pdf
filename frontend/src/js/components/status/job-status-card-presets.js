export const TRANSLATION_ANIMATION_PATH = "./src/assets/animations/deepseek_lottie.json";
export const OCR_ANIMATION_PATH = "./src/assets/animations/ocr_Lottie.json";
export const UPLOAD_ANIMATION_PATH = "./src/assets/animations/pdf_upload_Lottie.json";
export const DOWNLOAD_ANIMATION_PATH = "./src/assets/animations/pdf_download_Lottie.json";
export const RENDER_ANIMATION_PATH = "./src/assets/animations/typst_rendering.json";

export const STAGE_ANIMATIONS = {
  queued: UPLOAD_ANIMATION_PATH,
  ocr_upload: UPLOAD_ANIMATION_PATH,
  ocr: OCR_ANIMATION_PATH,
  ocr_processing: OCR_ANIMATION_PATH,
  ocr_result_ready: OCR_ANIMATION_PATH,
  ocr_normalizing: OCR_ANIMATION_PATH,
  translate: TRANSLATION_ANIMATION_PATH,
  render: RENDER_ANIMATION_PATH,
  render_prepare: RENDER_ANIMATION_PATH,
  render_prewarm: RENDER_ANIMATION_PATH,
  render_pages: RENDER_ANIMATION_PATH,
  render_compile: RENDER_ANIMATION_PATH,
  done: DOWNLOAD_ANIMATION_PATH,
};

export {
  STATUS_STAGE_FLOW as STAGE_FLOW,
  STATUS_STAGE_LABELS as STAGE_LABELS,
} from "../../job-status/stage-flow-model.js";
