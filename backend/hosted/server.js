import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import mongoose from "mongoose";
import { timingSafeEqual } from "node:crypto";
import redis from "../shared/redis/redis.js";
import authRoutes from "../services/auth/routes/auth.route.js";
import chatRoutes from "../services/chat/routes/chat.routes.js";
import agentRoutes from "../services/agent/routes/agent.route.js";
import protect from "../gateway/middleware/auth.middleware.js";
import { getCurrentUser } from "../gateway/middleware/controllers/user.controller.js";

const app = express();
const port = Number(process.env.PORT || 10000);
const allowedOrigins = (process.env.FRONTEND_URLS || "https://nexora-frontend-beta.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

app.get("/", (_req, res) => res.json({ message: "Nexora API is running" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.post("/api/agent/local-image-relay/register", async (req, res) => {
  const expectedToken = process.env.NEXORA_LOCAL_IMAGE_TOKEN || "";
  const suppliedToken = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = Buffer.from(expectedToken);
  const supplied = Buffer.from(suppliedToken);
  if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  let relayUrl;
  try {
    relayUrl = new URL(String(req.body?.url || ""));
  } catch {
    return res.status(400).json({ message: "A valid laptop tunnel URL is required." });
  }
  if (relayUrl.protocol !== "https:" || !relayUrl.hostname.endsWith(".trycloudflare.com") || relayUrl.pathname !== "/" || relayUrl.search || relayUrl.hash) {
    return res.status(400).json({ message: "Only an HTTPS Cloudflare Quick Tunnel URL is accepted." });
  }

  await redis.set("nexora:local-image-relay:url", relayUrl.origin, "EX", 900);
  return res.json({ status: "registered", expiresInSeconds: 900 });
});
app.use("/api/auth", authRoutes);
app.get("/api/me", protect, getCurrentUser);

const addUserHeader = (req, _res, next) => {
  req.headers["x-user-id"] = String(req.user.userID);
  next();
};
app.use("/api/chat", protect, addUserHeader, chatRoutes);
app.use("/api/agent", protect, addUserHeader, agentRoutes);

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  res.status(500).json({ message: "The server could not complete this request." });
});

const required = ["MONGODB_URI", "REDIS_URL"];
const missing = required.filter((key) => !process.env[key]);
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  missing.push("FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
}
if (missing.length) throw new Error(`Missing required environment values: ${missing.join(", ")}`);

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
console.log("MongoDB connected");
await redis.ping();
console.log("Redis ready");

app.listen(port, "0.0.0.0", () => console.log(`Nexora API listening on ${port}`));

const shutdown = async () => {
  await Promise.allSettled([mongoose.disconnect(), redis.quit()]);
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
