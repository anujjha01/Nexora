import redis from "../../../shared/redis/redis.js";

const relayAddressKey = "nexora:local-image-relay:url";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const generateLaptopImage = async (prompt) => {
  const token = process.env.NEXORA_LOCAL_IMAGE_TOKEN?.trim();
  if (!token) throw new Error("Laptop image generation is not configured on the hosted service yet.");

  const relayUrl = await redis.get(relayAddressKey);
  if (!relayUrl) throw new Error("Your laptop image generator is offline. Turn on the laptop and start Nexora Image Worker to generate images.");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const callRelay = async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${relayUrl}${path}`, { ...options, headers, signal: AbortSignal.timeout(15000) });
    } catch {
      throw new Error("Your laptop image generator is unreachable. Make sure the laptop is awake, online, and Nexora Image Worker is running.");
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || `Laptop image worker returned HTTP ${response.status}.`);
    }
    return response;
  };

  const queued = await callRelay("/jobs", { method: "POST", body: JSON.stringify({ prompt: String(prompt).slice(0, 1800) }) });
  const { jobId } = await queued.json();
  if (!jobId) throw new Error("The laptop image worker did not accept the request.");

  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await wait(2500);
    const statusResponse = await callRelay(`/jobs/${encodeURIComponent(jobId)}`);
    const job = await statusResponse.json();
    if (job.status === "error") throw new Error(job.message || "Laptop image generation failed. Check the Nexora Image Worker log.");
    if (job.status !== "complete") continue;

    const imageResponse = await callRelay(`/jobs/${encodeURIComponent(jobId)}/image`);
    const mimeType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
    return { buffer: Buffer.from(await imageResponse.arrayBuffer()), mimeType };
  }
  throw new Error("Image generation is taking longer than expected. Try again after your laptop has finished warming up the image model.");
};
