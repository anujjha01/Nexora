import api from "../../utils/axios"

export const deleteConversationApi = async (conversationId) => {
    try {
        const { data } = await api.delete(`/api/chat/delete-conversation/${conversationId}`)
        return data
    } catch (error) {
        console.log("Delete conversation error:", error)
        return null
    }
}
