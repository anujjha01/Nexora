const endpoint = "https://gen.pollinations.ai/image/";

const buildPhotorealisticPrompt = (prompt) =>
  `Photorealistic image, natural light, real camera photography, detailed realistic materials and textures, authentic colors, no vector art, no cartoon, no illustration, no text or watermark. Subject and scene: ${String(prompt).trim().slice(0, 1800)}`;

export const generatePollinationsImage = async (prompt) => {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Pollinations is not configured. Add POLLINATIONS_API_KEY to the backend service environment.");
  }
  if (!String(prompt || "").trim()) throw new Error("Enter a description for the image.");

  const url = new URL(`${endpoint}${encodeURIComponent(buildPhotorealisticPrompt(prompt))}`);
  url.searchParams.set("model", process.env.POLLINATIONS_IMAGE_MODEL?.trim() || "flux");

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
      signal: AbortSignal.timeout(180000),
    });
  } catch (error) {
    throw new Error(`Pollinations image service could not be reached: ${error.message}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 400);
    const suffix = detail ? ` ${detail}` : "";
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Pollinations rejected the API key (HTTP ${response.status}). Check POLLINATIONS_API_KEY.${suffix}`);
    }
    throw new Error(`Pollinations image generation failed (HTTP ${response.status}).${suffix}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new Error(`Pollinations returned an unsupported image format (${mimeType || "unknown"}). Choose a PNG, JPEG, or WebP image model.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Pollinations returned an empty image. Try again.");
  return { buffer, mimeType };
};
