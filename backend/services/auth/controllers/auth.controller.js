import { getAuth } from "firebase-admin/auth";
import {app} from "../config/firebase.js"
import User from "../models/user.model.js";
import { createConnection } from "mongoose";
import redis from '../../../shared/redis/redis.js'

const sessionCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
    // Hosted deployments may serve the frontend and API from different sites.
    // Cross-site session cookies require SameSite=None and HTTPS.
    sameSite: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true"
        ? "none"
        : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
});

export const login = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                message: "Firebase token is required"
            });
        }

        const decode = await getAuth(app).verifyIdToken(token);

        let user = await User.findOne({
            firebaseUid: decode.uid
        });

        if (!user) {
            user = await User.create({
                firebaseUid: decode.uid,
                name: decode.name,
                email: decode.email,
                avatar: decode.picture
            });
        }

        const sessionId = crypto.randomUUID();
        await redis.set(`session : ${sessionId}`,JSON.stringify({
            userID : user._id,
            name: user.name,
            email:user.email,
            avatar : user.avatar
        }),"EX", 7 * 24 * 60 * 60)

        res.cookie("session", sessionId, sessionCookieOptions());

        return res.status(200).json({
            message: "Login successful",
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};

export const demoLogin = async (_req, res) => {
    try {
        const userID = `demo-${crypto.randomUUID()}`;
        const user = {
            userID,
            id: userID,
            name: "Demo User",
            email: "demo@nexora.local",
            isDemo: true,
        };
        // Demo sessions use the same authenticated API as regular accounts, but
        // get an isolated, temporary identity so their data cannot overlap.
        const sessionId = crypto.randomUUID();
        await redis.set(`session : ${sessionId}`, JSON.stringify(user), "EX", 24 * 60 * 60);
        res.cookie("session", sessionId, { ...sessionCookieOptions(), maxAge: 24 * 60 * 60 * 1000 });
        return res.status(200).json({ user });
    } catch (error) {
        console.error("DEMO LOGIN ERROR:", error);
        return res.status(503).json({ message: "The demo account could not start. Please try again." });
    }
};



export const logout = async (req,res)=>{
    try {
        const sessionId = req.cookies?.session
        await redis.del(`session : ${sessionId}`)

        res.clearCookie("session", sessionCookieOptions());

        return res.status(200).json({message : "logout successfully"});
    } catch (error) {
        return res.status(500).json({
            message: `logout error ${error}`
        });
    }
}
