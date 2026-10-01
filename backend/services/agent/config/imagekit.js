const getPrivateKey = () => process.env.IMAGE_KIT_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE_KEY;

export const isImageKitConfigured = () => Boolean(getPrivateKey()?.trim());

export const uploadToImageKit = async ({ buffer, fileName, folder, mimeType }) => {
  const privateKey = getPrivateKey()?.trim();
  if (!privateKey) throw new Error("ImageKit storage is not configured. Set IMAGE_KIT_PRIVATE_KEY in the agent service environment.");

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), fileName);
  form.append("fileName", fileName);
  if (folder) form.append("folder", folder);
  form.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url || !result.fileId) {
    const error = new Error(result.message || `ImageKit upload failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return { url: result.url, fileId: result.fileId };
};

export const deleteFromImageKit = async (fileId) => {
  if (!fileId) return;
  const privateKey = getPrivateKey()?.trim();
  if (!privateKey) throw new Error("ImageKit storage is not configured.");
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok && response.status !== 404) throw new Error(`ImageKit delete failed (HTTP ${response.status}).`);
};
