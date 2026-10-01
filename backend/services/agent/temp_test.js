import axios from 'axios';

(async () => {
    try {
        console.log("Sending message to agent on port 8003...");
        const res = await axios.post("http://localhost:8003/chat", {
            prompt: "Hello world!",
            conversationId: "650000000000000000000000",
            agent: "auto"
        });
        console.log("Status:", res.status);
        console.log("Data:", res.data);
    } catch (error) {
        console.log("Error status:", error.response?.status);
        console.log("Error data:", JSON.stringify(error.response?.data || {}, null, 2));
    }
})();
