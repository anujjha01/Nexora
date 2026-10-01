import { getAuth } from "firebase-admin/auth";
import {app} from "../config/firebase.js"
import User from "../models/user.model.js";
import { createConnection } from "mongoose";
import redis from '../../../shared/redis/redis.js'

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

        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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



export const logout = async (req,res)=>{
    try {
        const sessionId = req.cookies?.session
        await redis.del(`session : ${sessionId}`)

        res.clearCookie("session");

        return res.status(200).json({message : "logout successfully"});
    } catch (error) {
        return res.status(500).json({
            message: `logout error ${error}`
        });
    }
}
