import { generatePollinationsImage } from "../config/pollinationsImageGen.js";
import { isImageKitConfigured, uploadToImageKit } from "../config/imagekit.js";

export const generateDemoImage = async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ message: "Describe the image you want to generate." });
  if (prompt.length > 1800) return res.status(400).json({ message: "Keep the image description under 1,800 characters." });
  if (!isImageKitConfigured()) return res.status(503).json({ message: "Image storage is not configured right now." });
  if (!process.env.POLLINATIONS_API_KEY?.trim()) {
    return res.status(503).json({ message: "Image generation is not configured. Add POLLINATIONS_API_KEY to the hosted backend environment." });
  }

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
    const message = error.message || "Image generation failed. Please try again.";
    const status = /timed out|timeout/i.test(message)
      ? 504
      : error.status === 429 || error.status === 401 || error.status === 403 || /not configured/i.test(message)
        ? 503
        : 502;
    return res.status(status).json({ message });
  }
};
