export type StageKey = 'ocr' | 'translate' | 'render' | 'done'

export type SubstageKey =
  | 'translation_batches'
  | 'continuation_review'
  | 'page_policies'
  | 'garbled'

export type StageProgress = {
  current?: number | null
  total?: number | null
  text?: string
  indeterminate?: boolean
  substageKey?: SubstageKey | ''
}

export type StatusSnapshot = {
  selectedStage: StageKey
  activeStage: StageKey
  elapsedText: string
  errorText?: string
  stageProgress: Partial<Record<StageKey, StageProgress>>
  pdfReady?: boolean
  readerReady?: boolean
}
