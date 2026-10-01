import mongoose from "mongoose";

const generatedImageSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true, maxlength: 2000 },
  mimeType: { type: String, enum: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"], required: true },
  storagePath: { type: String, select: false },
  fileUrl: { type: String },
  imageKitFileId: { type: String },
}, { timestamps: true });

generatedImageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.GeneratedImage || mongoose.model("GeneratedImage", generatedImageSchema);
