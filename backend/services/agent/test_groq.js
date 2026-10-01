import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

(async () => {
    try {
        const res = await axios.get("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
        });
        const ids = res.data.data.map(m => m.id);
        fs.writeFileSync("models.txt", ids.join("\n"));
        console.log("Successfully wrote models.txt");
    } catch (error) {
        console.error("Failed to fetch models:", error.message);
    }
})();
