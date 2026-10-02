import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import UploadedDocument from "../models/document.model.js";
import DocumentChunk from "../models/documentChunk.model.js";
import { extractDocument } from "./documentIngestion.js";
import { deleteFromImageKit, uploadToImageKit } from "../config/imagekit.js";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 1, parts: 2 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".txt", ".md", ".markdown"].includes(extension)) {
      callback(new Error("Supported files are PDF, TXT, and Markdown."));
      return;
    }
    callback(null, true);
  },
});

export const receiveDocumentFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Files must be 12 MB or smaller." });
    }
    return res.status(400).json({ message: error.message || "The file could not be uploaded." });
  });
};

const getUserId = (req) => req.headers["x-user-id"];
const publicDocument = (document) => ({
  _id: document._id,
  fileName: document.fileName,
  mimeType: document.mimeType,
  size: document.size,
  pageCount: document.pageCount,
  status: document.status,
  createdAt: document.createdAt,
});

export const uploadDocument = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Sign in before uploading documents." });
  if (!req.file) return res.status(400).json({ message: "Choose a file to upload." });

  let imageKitFileId;
  let savedDocument;
  try {
    const extracted = await extractDocument(req.file);
    const stored = await uploadToImageKit({ buffer: req.file.buffer, fileName: extracted.fileName, folder: "/nexora/documents", mimeType: extracted.mimeType });
    const fileUrl = stored.url;
    imageKitFileId = stored.fileId;

    savedDocument = await UploadedDocument.create({
      userId,
      fileName: extracted.fileName,
      mimeType: extracted.mimeType,
      size: req.file.size,
      pageCount: extracted.pageCount,
      fileUrl,
      imageKitFileId,
      status: "ready",
    });

    await DocumentChunk.insertMany(extracted.chunks.map((chunk, chunkIndex) => ({
      userId,
      documentId: savedDocument._id,
      fileName: extracted.fileName,
      pageNumber: chunk.pageNumber,
      chunkIndex,
      content: chunk.content,
    })), { ordered: true });

    return res.status(201).json({ document: publicDocument(savedDocument) });
  } catch (error) {
    if (savedDocument) {
      await Promise.allSettled([
        UploadedDocument.deleteOne({ _id: savedDocument._id, userId }),
        DocumentChunk.deleteMany({ documentId: savedDocument._id, userId }),
      ]);
    }
    if (imageKitFileId) await deleteFromImageKit(imageKitFileId).catch(() => {});
    if (error.message?.startsWith("This file") || error.message?.startsWith("PDFs are") || error.message?.startsWith("Supported files") || error.message?.startsWith("The selected") || error.message?.startsWith("No readable") || error.message?.startsWith("This document")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Document upload failed:", error);
    return res.status(500).json({ message: "The document could not be processed. Please try again." });
  }
};

export const listDocuments = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Sign in to view documents." });

  try {
    const documents = await UploadedDocument.find({ userId }).sort({ createdAt: -1 }).limit(100);
    return res.json({ documents: documents.map(publicDocument) });
  } catch (error) {
    console.error("Document listing failed:", error);
    return res.status(500).json({ message: "Documents could not be loaded." });
  }
};

export const downloadDocument = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Sign in to access this document." });
  if (!/^[a-f\d]{24}$/i.test(req.params.documentId)) return res.status(404).json({ message: "Document not found." });

  try {
    const document = await UploadedDocument.findOne({ _id: req.params.documentId, userId }).select("+storagePath");
    if (!document) return res.status(404).json({ message: "Document not found." });
    if (document.fileUrl) return res.redirect(302, document.fileUrl);
    const fileBuffer = await readFile(document.storagePath);
    const encodedName = encodeURIComponent(document.fileName.replace(/[\r\n"\\]/g, "_"));
    res.set({
      "Content-Type": document.mimeType,
      "Content-Length": fileBuffer.length,
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(fileBuffer);
  } catch (error) {
    console.error("Document download failed:", error);
    return res.status(404).json({ message: "Document file not found." });
  }
};

export const deleteDocument = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Sign in to delete this document." });
  if (!/^[a-f\d]{24}$/i.test(req.params.documentId)) return res.status(404).json({ message: "Document not found." });

  try {
    const document = await UploadedDocument.findOne({ _id: req.params.documentId, userId }).select("+storagePath");
    if (!document) return res.status(404).json({ message: "Document not found." });

    await Promise.all([
      DocumentChunk.deleteMany({ documentId: document._id, userId }),
      UploadedDocument.deleteOne({ _id: document._id, userId }),
      document.imageKitFileId
        ? deleteFromImageKit(document.imageKitFileId)
        : document.storagePath
          ? unlink(document.storagePath).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          })
          : Promise.resolve(),
    ]);
    return res.json({ deleted: true });
  } catch (error) {
    console.error("Document deletion failed:", error);
    return res.status(500).json({ message: "The document could not be deleted." });
  }
};
