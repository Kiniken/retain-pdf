export function validateOcrTokenForProvider(
  apiPrefix,
  providerId,
  token,
  {
    defaultModelVersion,
    validatePaddle,
    validateMineru,
  } = {},
) {
  if (!validatePaddle || !validateMineru) {
    throw new Error("credential provider validation dependencies are required");
  }

  if (providerId === "paddle") {
    return validatePaddle(apiPrefix, {
      paddle_token: token,
      base_url: "https://paddleocr.aistudio-app.com",
    });
  }
  return validateMineru(apiPrefix, {
    mineru_token: token,
    base_url: "https://mineru.net",
    model_version: defaultModelVersion,
  });
}

