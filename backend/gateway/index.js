import express from 'express';
import 'dotenv/config';
import proxy from 'express-http-proxy';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getCurrentUser } from './middleware/controllers/user.controller.js';
import protect from './middleware/auth.middleware.js';
import { proxyWithHeader } from './utils/proxyWithHeader.js';
import morgan from 'morgan';

const app = express();
const frontendOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: frontendOrigins,
    credentials: true
}))

app.use(cookieParser())
app.use(morgan("dev"))

app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE));
app.use("/api/agent", protect, proxyWithHeader(process.env.AGENT_SERVICE));
app.get("/api/me", protect, getCurrentUser)

app.get('/', (req, res) => {
    res.json({ message: "Hello from  gateway" })
})


app.listen(process.env.PORT, () => {
    console.log(`Gateway started at ${process.env.PORT}`);
})
