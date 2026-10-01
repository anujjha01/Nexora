import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();


export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connection successfully");
    } catch (error) {
        console.error("Database connection failed",error);
    }
}