import { getSearchTool } from "../config/tavily.js"

export const searchAgent = async (state) => {
    try {
        const searchTool = getSearchTool()
        const data = await searchTool.invoke({
            query: state.prompt,
            includeImages: true,
        })

        // Tavily returns: { results: [...], images: [...], answer, query, ... }
        const results = data.results || []
        const images = data.images || []

        console.log(`[searchAgent] Got ${results.length} results and ${images.length} images`)

        return {
            ...state,
            searchResults: results,
            images,
            searchAnswer: data.answer || "",
        }
    } catch (error) {
        console.error("[searchAgent] Error:", error.message)
        throw new Error(`Web search failed: ${error.message}`);
    }
}
