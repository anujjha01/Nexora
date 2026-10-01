import { readFile } from "node:fs/promises";
import GeneratedPresentation from "../models/generatedPresentation.model.js";

export const downloadPresentation = async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Sign in to access this presentation." });
  if (!/^[a-f\d]{24}$/i.test(req.params.presentationId)) return res.status(404).json({ message: "Presentation not found." });

  try {
    const presentation = await GeneratedPresentation.findOne({ _id: req.params.presentationId, userId }).select("+storagePath");
    if (!presentation) return res.status(404).json({ message: "Presentation not found." });
    if (presentation.fileUrl) return res.redirect(302, presentation.fileUrl);
    const buffer = await readFile(presentation.storagePath);
    const fileName = `${presentation.title.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 100)}.pptx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Length": buffer.length,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(buffer);
  } catch (error) {
    console.error("Presentation download failed:", error);
    return res.status(404).json({ message: "Presentation not found." });
  }
};
