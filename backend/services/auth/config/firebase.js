import { cert, initializeApp } from "firebase-admin";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || fileURLToPath(new URL("../serviceAccountKey.json", import.meta.url));
const serviceAccount = serviceAccountJson
    ? JSON.parse(serviceAccountJson)
    : JSON.parse(await readFile(serviceAccountPath, "utf8"));

export const app = initializeApp({
    credential: cert(serviceAccount),
});
