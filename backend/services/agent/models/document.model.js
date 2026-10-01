import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  pageCount: { type: Number, default: 1 },
  storagePath: { type: String, select: false },
  fileUrl: { type: String },
  imageKitFileId: { type: String },
  status: { type: String, enum: ["ready"], default: "ready" },
}, { timestamps: true });

documentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.UploadedDocument || mongoose.model("UploadedDocument", documentSchema);
