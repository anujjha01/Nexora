import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serviceDirectory, '.env') });

// Load modules that read environment variables only after the service's own
// .env has been loaded, regardless of the shell's current working directory.
const [{ connectDB }, { default: router }] = await Promise.all([
    import('./config/db.js'),
    import('./routes/agent.route.js'),
]);

const app = express();

app.use(express.json());

app.use("/", router)

app.get('/', (req, res) => {
    res.json({ message: "Hello from  agent" })
})


app.listen(process.env.PORT, () => {
    console.log(`Agent started at ${process.env.PORT}`);
    connectDB();
})
