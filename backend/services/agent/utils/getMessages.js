import Message from "../../chat/models/message.Model.js";

export const getMessages = async (conversationId) => {
    try {
        return await Message.find({ conversationId }).sort({ createdAt: 1, _id: 1 });
    } catch (error) {
        console.error(error)
        return [];
    }
}
