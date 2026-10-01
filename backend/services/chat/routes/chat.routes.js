import { Router } from 'express';
import { createConversation, getConversations, getMessages, saveMessage, updateConversation, deleteConversation } from '../controllers/chat.controller.js'
const router = Router();

router.get("/create-conversation", createConversation)
router.get("/get-conversation", getConversations)
router.post("/update-conversation", updateConversation)
router.post("/save-message", saveMessage)
router.get("/get-messages/:conversationId", getMessages)
router.delete("/delete-conversation/:conversationId", deleteConversation)

export default router;