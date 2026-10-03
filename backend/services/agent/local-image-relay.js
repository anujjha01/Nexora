import "dotenv/config";
import { randomUUID, timingSafeEqual } from "node:crypto";
import express from "express";
import { generateLocalImage } from "./config/localImageGen.js";

const app = express();
const port = Number(process.env.LOCAL_IMAGE_RELAY_PORT || 8190);
const token = process.env.NEXORA_LOCAL_IMAGE_TOKEN || "";
const jobs = new Map();
let activeJob = false;

if (token.length < 32) {
  throw new Error("Set NEXORA_LOCAL_IMAGE_TOKEN to a random secret of at least 32 characters before starting the laptop image worker.");
}

const authorized = (req, res, next) => {
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = Buffer.from(token);
  const received = Buffer.from(supplied);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  next();
};

app.disable("x-powered-by");
app.use(express.json({ limit: "8kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(authorized);

app.post("/jobs", (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ message: "A prompt is required." });
  if (activeJob) return res.status(429).json({ message: "The laptop is already generating an image. Please wait for it to finish." });

  const jobId = randomUUID();
  const job = { status: "queued", buffer: null, mimeType: null, message: null, createdAt: Date.now() };
  jobs.set(jobId, job);
  activeJob = true;
  res.status(202).json({ jobId });

  void generateLocalImage(prompt)
    .then(({ buffer, mimeType }) => {
      job.status = "complete";
      job.buffer = buffer;
      job.mimeType = mimeType;
    })
    .catch((error) => {
      console.error("Laptop image worker failed:", error);
      job.status = "error";
      job.message = "Image generation failed on the laptop. Check the Nexora image worker log.";
    })
    .finally(() => { activeJob = false; });
});

app.get("/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Image job not found." });
  return res.json({ status: job.status, ...(job.message ? { message: job.message } : {}) });
});

app.get("/jobs/:jobId/image", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== "complete" || !job.buffer) return res.status(404).json({ message: "Generated image is not ready." });
  res.set({ "Content-Type": job.mimeType, "Cache-Control": "no-store" });
  return res.send(job.buffer);
});

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [jobId, job] of jobs) {
    if (job.createdAt < cutoff && job.status !== "queued") jobs.delete(jobId);
  }
}, 60_000).unref();

app.listen(port, "127.0.0.1", () => console.log(`Nexora laptop image worker listening on 127.0.0.1:${port}`));
