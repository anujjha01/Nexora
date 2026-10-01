import 'dotenv/config';
import { searchTool } from './config/tavily.js';

(async () => {
    try {
        const data = await searchTool.invoke({ query: "What is the latest news today?" });

        // Extract the results array (each has url, title, content)
        const results = data.results || [];
        // Extract top-level images
        const images = data.images || [];

        console.log("Results count:", results.length);
        console.log("Images count:", images.length);
        console.log("First result title:", results[0]?.title);
        console.log("First image:", images[0]);
        console.log("\nSUCCESS - Structure is correct!");
    } catch (error) {
        console.error("Error:", error.message);
    }
})();
