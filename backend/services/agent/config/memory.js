import redis from '../../../shared/redis/redis.js'
import { getMessages } from '../utils/getMessages.js';

export const getMemory = async (conversationId) => {
    const key = `message-${conversationId}`
    const cached = await redis.get(key);
    if (cached) {
        return JSON.parse(cached)
    }
    const message = await getMessages(conversationId);

    await redis.set(key, JSON.stringify(message), "EX", 24 * 60 * 60)

    return message
}


export const addMessage = async (conversationId, role, content) => {
    const key = `message-${conversationId}`
    const rawMessage = await redis.get(key);
    const message = rawMessage ? JSON.parse(rawMessage) : []
    message.push({
        role, content
    })
    if (message.length > 20) {
        message.shift()
    }
    await redis.set(key, JSON.stringify(message))
}
