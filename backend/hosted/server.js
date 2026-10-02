import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import mongoose from "mongoose";
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
