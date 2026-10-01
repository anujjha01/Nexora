import { searchAgent } from "./agents/search.agent.js";
import dotenv from "dotenv";
dotenv.config();

(async () => {
    try {
        console.log("Testing search agent...");
        const result = await searchAgent({ prompt: "What is the capital of France?" });
        console.log("Result:");
        console.log(result);
    } catch (err) {
        console.error("Error:", err);
    }
})();
