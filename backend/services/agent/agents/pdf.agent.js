import { answerFromDocuments } from "../documents/documentRetrieval.js";

export const pdfAgent = async (state) => {
  const result = await answerFromDocuments({
    userId: state.userId,
    prompt: state.prompt,
    documentIds: state.documentIds,
  });
  return { ...state, aiResponse: result.aiResponse };
};
