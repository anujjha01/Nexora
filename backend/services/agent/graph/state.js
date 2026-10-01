import { Annotation } from "@langchain/langgraph";
export const agentState = Annotation.Root({
  prompt: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  aiResponse: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  agent: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "chat",
  }),
  conversationId: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  userId: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  documentIds: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => [],
  }),
  searchResults: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => [],
  }),
  images: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => [],
  }),
  searchAnswer: Annotation({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
});
