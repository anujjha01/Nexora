import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Keep provider setup in one place so agents can choose a task without being
// coupled to a vendor. Instances are created lazily: a missing optional key
// must not prevent the agent service from starting.
const providers = {
  groq: {
    key: "GROQ_API_KEY",
    model: () => new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0,
      maxRetries: 2,
    }),
  },
  google: {
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
    getKey: () => process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
    model: () => new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
      model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
      temperature: 0,
      maxRetries: 2,
    }),
  },
};

const taskProviders = {
  chat: ["groq", "google"],
  router: ["groq", "google"],
  search: ["groq", "google"],
  coding: ["google", "groq"],
  pdf: ["google", "groq"],
  presentation: ["google", "groq"],
};

export const getConfiguredProviders = () => Object.entries(providers)
  .filter(([, provider]) => Boolean((provider.getKey?.() || process.env[provider.key])?.trim()))
  .map(([name]) => name);

export const getModel = async (task = "chat") => {
  const candidates = taskProviders[task] || taskProviders.chat;
  const configured = candidates.filter((name) => Boolean((providers[name].getKey?.() || process.env[providers[name].key])?.trim()));

  if (configured.length === 0) {
    const requiredKeys = candidates.map((name) => providers[name].key).join(" or ");
    throw new Error(`AI provider is not configured. Add ${requiredKeys} to backend/services/agent/.env and restart the agent service.`);
  }

  return {
    async invoke(input, options) {
      let lastError;

      for (const name of configured) {
        try {
          return await providers[name].model().invoke(input, options);
        } catch (error) {
          lastError = error;
          console.error(`[model:${task}] ${name} provider failed; trying the next configured provider.`, error?.message || error);
        }
      }

      throw new Error(`All configured AI providers failed for ${task}. Check the provider key, model access, and network connection. ${lastError?.message || ""}`.trim());
    },
  };
};
