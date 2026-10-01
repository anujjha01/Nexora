import express from 'express';
import 'dotenv/config';
import { connectDB } from './config/db.js';
import cookieParser from 'cookie-parser';
import router from '../auth/routes/auth.route.js'

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/", router)

app.get('/', (req, res) => {
    res.json({ message: "Hello from  auth" })
})


app.listen(process.env.PORT, () => {
    console.log(`Auth started at ${process.env.PORT}`);
    connectDB();
})