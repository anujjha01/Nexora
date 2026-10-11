import { createHash } from "node:crypto";

const stabilityEndpoint = "https://api.stability.ai/v2beta/stable-image/generate/core";

export const isCloudImageGenerationConfigured = () => Boolean(process.env.STABILITY_API_KEY?.trim());

export const generateCloudImage = async (prompt, userId) => {
  const apiKey = process.env.STABILITY_API_KEY?.trim();
  if (!apiKey) throw new Error("Cloud image generation is not configured. Add STABILITY_API_KEY to the agent service environment.");

  const form = new FormData();
  form.append("prompt", String(prompt).slice(0, 10000));
  form.append("output_format", "png");

  let response;
  try {
    response = await fetch(stabilityEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
        "stability-client-id": "Nexora AI",
        ...(userId ? { "stability-client-user-id": createHash("sha256").update(String(userId)).digest("hex") } : {}),
      },
      body: form,
      signal: AbortSignal.timeout(180000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("Cloud image generation took too long. Please try again.");
    }
    throw new Error("Could not reach the cloud image provider. Check the backend network connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const providerMessage = body.errors?.join(" ") || body.message || body.name;
    if (response.status === 401 || response.status === 403) {
      throw new Error("Cloud image provider rejected the server API key or prompt. Check STABILITY_API_KEY and the provider account.");
    }
    if (response.status === 429) {
      throw new Error("The cloud image provider is busy or out of credits. Please try again later.");
    }
    throw new Error(providerMessage || `Cloud image provider returned HTTP ${response.status}.`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!/^image\/(png|jpeg|webp)$/.test(mimeType)) {
    throw new Error("Cloud image provider returned an unsupported image format.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Cloud image provider returned an empty image.");
  return { buffer, mimeType };
};
