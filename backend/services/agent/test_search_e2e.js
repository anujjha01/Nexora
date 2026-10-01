import 'dotenv/config';
import axios from 'axios';

(async () => {
    try {
        console.log("Testing search agent via API...");
        const res = await axios.post("http://localhost:8003/chat", {
            prompt: "What is the latest news today?",
            conversationId: "650000000000000000000001",
            agent: "search"  // force search agent
        });
        console.log("Status:", res.status);
        console.log("Answer:", res.data.answer?.slice(0, 300));
        console.log("Images:", res.data.images?.length, "images");
    } catch (error) {
        console.log("Error status:", error.response?.status);
        console.log("Full error message:", JSON.stringify(error.response?.data, null, 2));
    }
})();
