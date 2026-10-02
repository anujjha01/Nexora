import GeneratedImage from "../models/generatedImage.model.js";
import { deleteFromImageKit, isImageKitConfigured, uploadToImageKit } from "../config/imagekit.js";
import { generateLocalImage } from "../config/localImageGen.js";

export const imageGenAgent = async (state) => {
  if (!state.userId) return { ...state, aiResponse: "Please sign in before generating an image." };
  if (process.env.NEXORA_HOSTED_FREE === "true") {
    return { ...state, aiResponse: "Image generation is unavailable in the free hosted version because its Stable Diffusion model needs a GPU that the hosted service does not provide. The local ComfyUI setup only works when using Nexora locally." };
  }
  if (!isImageKitConfigured()) return { ...state, aiResponse: "Image storage is not configured. Add IMAGE_KIT_PRIVATE_KEY to the agent service environment." };

  let imageKitFileId;
  try {
    const { buffer, mimeType } = await generateLocalImage(state.prompt);
    const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "img";
    const stored = await uploadToImageKit({ buffer, fileName: `nexora-${Date.now()}.${extension}`, folder: "/nexora/images", mimeType });
    imageKitFileId = stored.fileId;
    await GeneratedImage.create({
      userId: state.userId,
      prompt: state.prompt.slice(0, 2000),
      mimeType,
      fileUrl: stored.url,
      imageKitFileId: stored.fileId,
    });
    imageKitFileId = undefined;

    return {
      ...state,
      aiResponse: `**Realistic image generated**\n\n${state.prompt}\n\n[Open or download image](${stored.url})`,
      images: [stored.url],
    };
  } catch (error) {
    console.error("Local image generation failed:", error);
    if (imageKitFileId) await deleteFromImageKit(imageKitFileId).catch(() => {});
    const message = error.message?.startsWith("ImageKit")
      ? "ImageKit couldn’t store the generated image. Check IMAGE_KIT_PRIVATE_KEY and your ImageKit upload quota."
      : error.message || "Check the local ComfyUI installation and photo model.";
    return { ...state, aiResponse: `Realistic image generation failed. ${message}` };
  }
};
