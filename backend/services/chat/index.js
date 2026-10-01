import express from 'express';
import 'dotenv/config';
import router from './routes/chat.routes.js';
import { connectDB } from './config/db.js';

const app = express();

app.use(express.json());
app.use("/", router)

app.get('/', (req, res) => {
    res.json({ message: "Hello from  chat" })
})


app.listen(process.env.PORT, () => {
    console.log(`Chat started at ${process.env.PORT}`);
    connectDB();
})