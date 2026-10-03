import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import path from "node:path";
import { randomInt, randomUUID } from "node:crypto";

const port = Number.parseInt(process.env.COMFYUI_PORT || "8188", 10) || 8188;
const endpoint = () => (process.env.COMFYUI_URL || `http://127.0.0.1:${port}`).replace(/\/$/, "");
const getDirectory = () => process.env.COMFYUI_DIRECTORY?.trim()
  || path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE || process.cwd(), "NexoraImageGen", "ComfyUI_windows_portable");
const checkpoint = () => process.env.COMFYUI_CHECKPOINT?.trim() || "Realistic_Vision_V5.1_fp16-no-ema.safetensors";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let startPromise;

const makeWorkflow = (prompt, seed) => {
  const width = Math.max(512, Math.min(768, Number.parseInt(process.env.LOCAL_IMAGE_WIDTH || "768", 10) || 768));
  const height = Math.max(512, Math.min(768, Number.parseInt(process.env.LOCAL_IMAGE_HEIGHT || "768", 10) || 768));
  const steps = Math.max(18, Math.min(32, Number.parseInt(process.env.LOCAL_IMAGE_STEPS || "26", 10) || 26));
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint() } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: `Photorealistic professional photograph, natural lighting, realistic skin and materials, crisp fine detail, authentic camera lens and depth of field. Scene: ${prompt.slice(0, 1800)}`, clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: "cartoon, illustration, vector art, drawing, 3d render, anime, flat colors, geometric shapes, blurry, low quality, distorted anatomy, extra limbs, text, watermark", clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { seed, steps, cfg: 6.5, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "6": { class_type: "VAELoader", inputs: { vae_name: process.env.COMFYUI_VAE || "vae-ft-mse-840000-ema-pruned.safetensors" } },
    "7": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["6", 0] } },
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "nexora-realistic", images: ["7", 0] } },
  };
};
const requestJson = async (url, options = {}, description = "ComfyUI request") => {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  } catch (error) {
    throw new Error(`${description}: local image engine is not responding at ${endpoint()}. ${error.message}`);
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`${description} failed (HTTP ${response.status}). ${detail}`.trim());
  }
  return response.json();
};

const isReady = async () => {
  try {
    const response = await fetch(`${endpoint()}/system_stats`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
};

const startComfyUI = async () => {
  if (await isReady()) return;

  const root = getDirectory();
  const python = path.join(root, "python_embeded", "python.exe");
  const main = path.join(root, "ComfyUI", "main.py");
  const model = path.join(root, "ComfyUI", "models", "checkpoints", checkpoint());
  const vae = path.join(root, "ComfyUI", "models", "vae", process.env.COMFYUI_VAE || "vae-ft-mse-840000-ema-pruned.safetensors");
  if (!existsSync(python) || !existsSync(main)) {
    throw new Error(`Free local image generation is not installed yet. Expected ComfyUI at ${root}.`);
  }
  if (!existsSync(model) || !existsSync(vae)) {
    throw new Error(`The local photo model is missing. Check for ${checkpoint()} and ${path.basename(vae)} in the ComfyUI models folders.`);
  }

  const logPath = path.join(root, "nexora-comfyui.log");
  const logFd = openSync(logPath, "a");
  let child;
  try {
    child = spawn(python, ["-s", "ComfyUI/main.py", "--windows-standalone-build", "--listen", "127.0.0.1", "--port", String(port), "--lowvram"], {
      cwd: root,
      windowsHide: true,
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
  } finally {
    closeSync(logFd);
  }
  child.unref();

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (await isReady()) return;
    await wait(1000);
  }
  throw new Error(`ComfyUI did not start within 2 minutes. See ${logPath} for the local startup error.`);
};

const ensureComfyUI = async () => {
  if (await isReady()) return;
  startPromise ||= startComfyUI().finally(() => { startPromise = undefined; });
  await startPromise;
};

export const generateLocalImage = async (prompt) => {
  await ensureComfyUI();
  const queued = await requestJson(`${endpoint()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: makeWorkflow(prompt, randomInt(1, 2 ** 48)), client_id: randomUUID() }),
  }, "Submitting the local image request");
  if (!queued.prompt_id) throw new Error(queued.error?.message || "ComfyUI did not accept the image request.");

  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await wait(1500);
    const history = await requestJson(`${endpoint()}/history/${encodeURIComponent(queued.prompt_id)}`, {}, "Checking local image progress");
    const job = history[queued.prompt_id];
    if (!job) continue;
    const executionError = job.status?.messages?.find(([kind]) => kind === "execution_error")?.[1]?.exception_message;
    if (job.status?.status_str === "error" || executionError) {
      throw new Error(executionError || "ComfyUI could not run the photo model. Check its startup log.");
    }
    const output = Object.values(job.outputs || {}).flatMap((node) => node.images || [])[0];
    if (!output) continue;

    const viewUrl = new URL(`${endpoint()}/view`);
    viewUrl.searchParams.set("filename", output.filename);
    viewUrl.searchParams.set("subfolder", output.subfolder || "");
    viewUrl.searchParams.set("type", output.type || "output");
    const imageResponse = await fetch(viewUrl, { signal: AbortSignal.timeout(30000) }).catch((error) => {
      throw new Error(`ComfyUI generated the image but could not return its file: ${error.message}`);
    });
    if (!imageResponse.ok) throw new Error(`ComfyUI generated the image but file retrieval failed (HTTP ${imageResponse.status}).`);
    return { buffer: Buffer.from(await imageResponse.arrayBuffer()), mimeType: "image/png" };
  }
  throw new Error("Local image generation took more than 8 minutes. Try again after the first model load finishes.");
};

