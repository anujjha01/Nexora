import api from '../../utils/axios'

async function updateConversation(id, title) {
    try {
        const { data } = await api.post("/api/chat/update-conversation", { id, title })
        return data
    } catch (error) {
        console.error("updateConversation error:", error)
        return null
    }
}

export default updateConversation
