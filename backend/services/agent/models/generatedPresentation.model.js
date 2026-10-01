import mongoose from "mongoose";

const generatedPresentationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 180 },
  slideCount: { type: Number, required: true, min: 1, max: 20 },
  storagePath: { type: String, select: false },
  fileUrl: { type: String },
  imageKitFileId: { type: String },
}, { timestamps: true });

generatedPresentationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.GeneratedPresentation || mongoose.model("GeneratedPresentation", generatedPresentationSchema);
