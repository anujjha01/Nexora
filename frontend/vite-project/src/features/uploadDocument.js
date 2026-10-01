import api from "../../utils/axios";

async function uploadDocument(file) {
  const body = new FormData();
  body.append("file", file);

  try {
    const { data } = await api.post("/api/agent/documents", body);
    return data;
  } catch (error) {
    const responseMessage = error.response?.data?.message;
    if (responseMessage) return { error: responseMessage };
    if (error.response) return { error: `Upload failed (HTTP ${error.response.status}). Please try again.` };
    if (error.request) return { error: "Could not reach the upload service. Check that Nexora’s backend is running, then try again." };
    return { error: error.message || "The upload could not be started. Please try again." };
  }
}

export default uploadDocument;
