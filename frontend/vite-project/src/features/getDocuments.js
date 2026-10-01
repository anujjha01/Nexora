import api from "../../utils/axios";

export async function getDocuments() {
  try {
    const { data } = await api.get("/api/agent/documents");
    return data.documents || [];
  } catch (error) {
    return { error: error.response?.data?.message || "Documents could not be loaded." };
  }
}

export async function deleteDocument(id) {
  try {
    await api.delete(`/api/agent/documents/${id}`);
    return { deleted: true };
  } catch (error) {
    return { error: error.response?.data?.message || "The document could not be deleted." };
  }
}
