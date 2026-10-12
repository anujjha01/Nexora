import { generatePollinationsImage } from "../config/pollinationsImageGen.js";
import { isImageKitConfigured, uploadToImageKit } from "../config/imagekit.js";

export const generateDemoImage = async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ message: "Describe the image you want to generate." });
  if (prompt.length > 1800) return res.status(400).json({ message: "Keep the image description under 1,800 characters." });
  if (!isImageKitConfigured()) return res.status(503).json({ message: "Image storage is not configured right now." });

  try {
    const { buffer, mimeType } = await generatePollinationsImage(prompt);
    const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "img";
    const stored = await uploadToImageKit({
      buffer,
      fileName: `nexora-demo-${Date.now()}.${extension}`,
      folder: "/nexora/demo-images",
      mimeType,
    });
    return res.json({
      answer: `**Realistic image generated**\n\n${prompt}\n\nGenerated with Pollinations AI. Demo images are temporary and aren’t saved to an account.`,
      images: [stored.url],
    });
  } catch (error) {
    console.error("Demo image generation failed:", error);
    return res.status(502).json({ message: error.message || "Image generation failed. Please try again." });
  }
};
