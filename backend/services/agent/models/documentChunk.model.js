import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "UploadedDocument", required: true },
  fileName: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true, maxlength: 1400 },
}, { timestamps: true });

documentChunkSchema.index({ userId: 1, documentId: 1, pageNumber: 1, chunkIndex: 1 }, { unique: true });
documentChunkSchema.index({ userId: 1, documentId: 1 });

export default mongoose.models.DocumentChunk || mongoose.model("DocumentChunk", documentChunkSchema);
