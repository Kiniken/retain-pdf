export function buildHiddenCredentialPayload({
  browserStored = {},
  ports,
} = {}) {
  return {
    ocrProvider: browserStored.ocrProvider || ports.defaultOcrProvider(),
    mineruToken: browserStored.mineruToken || ports.defaultMineruToken(),
    paddleToken: browserStored.paddleToken || ports.defaultPaddleToken(),
    modelApiKey: browserStored.modelApiKey || ports.defaultModelApiKey(),
  };
}
