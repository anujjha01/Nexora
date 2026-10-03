import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import redis from "../../../shared/redis/redis.js";

const MODEL = process.env.GOOGLE_IMAGE_MODEL || "gemini-3.1-flash-lite-image";
const DAILY_GLOBAL_LIMIT = 10;
const DAILY_USER_LIMIT = 2;
const WINDOW_SECONDS = 36 * 60 * 60;

const reserveDailyFallback = async (userId) => {
  const day = new Date().toISOString().slice(0, 10);
  const userHash = createHash("sha256").update(String(userId)).digest("hex");
  const globalKey = `nexora:gemini-image:global:${day}`;
  const userKey = `nexora:gemini-image:user:${day}:${userHash}`;
  const result = await redis.eval(
    `local globalCount = tonumber(redis.call('GET', KEYS[1]) or '0')
     local userCount = tonumber(redis.call('GET', KEYS[2]) or '0')
     if globalCount >= tonumber(ARGV[1]) then return 1 end
     if userCount >= tonumber(ARGV[2]) then return 2 end
     globalCount = redis.call('INCR', KEYS[1])
     userCount = redis.call('INCR', KEYS[2])
     if globalCount == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
     if userCount == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
     return 0`,
    2,
    globalKey,
    userKey,
    DAILY_GLOBAL_LIMIT,
    DAILY_USER_LIMIT,
    WINDOW_SECONDS,
  );

  if (Number(result) === 1) {
    throw new Error("Cloud image generation has reached today’s shared limit. Try again tomorrow, or turn on the laptop for local generation.");
  }
  if (Number(result) === 2) {
    throw new Error("You’ve reached today’s cloud image limit for this account. Try again tomorrow, or use local generation while the laptop is online.");
  }
};

export const generateGeminiImage = async (prompt, userId) => {
  if (process.env.GEMINI_IMAGE_FALLBACK_ENABLED !== "true") {
    throw new Error("Your laptop image generator is offline. Cloud image fallback is not enabled on this service.");
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("Your laptop is offline and Gemini image generation is not configured. Add GOOGLE_API_KEY to the hosted backend settings.");
  }
  if (!userId) throw new Error("Sign in before using cloud image generation.");

  await reserveDailyFallback(userId);
  const client = new GoogleGenAI({ apiKey: apiKey.trim() });
  let interaction;
  try {
    interaction = await client.interactions.create({
      model: MODEL,
      input: String(prompt).slice(0, 1800),
      response_format: { type: "image", image_size: "1K" },
    });
  } catch (error) {
    console.error("Gemini image generation failed:", error?.message || error);
    throw new Error("Gemini could not generate the image. Check the API key’s Gemini API access, billing, and quota.");
  }

  const image = interaction.output_image;
  if (!image?.data) throw new Error("Gemini returned no image. Try a different prompt.");
  return {
    buffer: Buffer.from(image.data, "base64"),
    mimeType: image.mime_type || "image/png",
  };
};
