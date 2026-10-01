import { TavilySearch } from "@langchain/tavily";

export const getSearchTool = () => {
  return new TavilySearch({
    maxResults: 5,
    topic: "general",
    includeImages: true,
    includeAnswer: true,
    tavilyApiKey: process.env.TAVILY_API_KEY
  });
};
