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

export const STAGE_FLOW = ["ocr", "translate", "render", "done"];

export const STAGE_LABELS = {
  ocr: "OCR",
  translate: "翻译",
  render: "渲染",
  done: "完成",
};

export const TRANSLATION_SUBSTAGES = [
  { key: "translation_prepare", label: "准备" },
  { key: "domain_inference", label: "领域" },
  { key: "page_policies", label: "页面策略" },
  { key: "continuation_review", label: "跨栏/跨页" },
  { key: "translation_batches", label: "翻译批次" },
  { key: "translation_tail_retry", label: "尾部重试" },
  { key: "garbled_repair", label: "乱码修复" },
  { key: "agent_repair", label: "结果修复" },
  { key: "final_untranslated_recovery", label: "最终收口" },
];

export const STAGE_SUBSTAGES = {
  ocr: [
    { key: "ocr_processing", label: "OCR 解析" },
    { key: "normalizing", label: "标准化" },
  ],
  translate: TRANSLATION_SUBSTAGES,
  render: [
    { key: "render_prepare", label: "准备" },
    { key: "render_prewarm", label: "预热" },
    { key: "render_pages", label: "页面" },
    { key: "render_compile", label: "编译" },
  ],
};
