import dotenv from 'dotenv';
dotenv.config();
import { getModel } from './config/llmModel.js';
import { HumanMessage } from "@langchain/core/messages";

(async () => {
    try {
        console.log("Fetching chat model...");
        const llm = await getModel("chat");

        console.log("Invoking model...");
        const res = await llm.invoke([new HumanMessage("Test message")]);

        console.log("Success! Response:", res.content);
    } catch (error) {
        console.error("LLM Invocation Failed:", error);
    }
})();
