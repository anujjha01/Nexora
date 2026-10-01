import { readFile } from "node:fs/promises";
import GeneratedImage from "../models/generatedImage.model.js";

export const downloadGeneratedImage = async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Sign in to access this image." });
  if (!/^[a-f\d]{24}$/i.test(req.params.imageId)) return res.status(404).json({ message: "Image not found." });

  try {
    const image = await GeneratedImage.findOne({ _id: req.params.imageId, userId }).select("+storagePath");
    if (!image) return res.status(404).json({ message: "Image not found." });
    if (image.fileUrl) return res.redirect(302, image.fileUrl);
    const buffer = await readFile(image.storagePath);
    const extension = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/webp" ? "webp" : "png";
    res.set({
      "Content-Type": image.mimeType,
      "Content-Length": buffer.length,
      "Content-Disposition": `inline; filename="nexora-${image._id}.${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(buffer);
  } catch (error) {
    console.error("Generated image retrieval failed:", error);
    return res.status(404).json({ message: "Image not found." });
  }
};
