# Nexora implementation plan

## Existing architecture

- **Frontend:** React 19 + Vite, Redux Toolkit chat state, React Markdown, Google sign-in.
- **Backend:** Express services for gateway, authentication, chat, and agents.
- **Data:** MongoDB stores users, conversations, and messages; Redis stores sessions and a short message cache.
- **AI:** LangGraph routes requests to agent functions. Groq and Gemini LangChain adapters are installed; Tavily is used for web search.
- **Working paths found:** chat, web search followed by a cited chat answer, conversation history, and authentication/session flow.
- **Implemented:** provider fallback and task routing, coding responses with React and standalone HTML artifacts, web search citations, authenticated PDF/TXT/Markdown document library and question answering, PPTX generation, and document-to-presentation flow. Generated images, PDFs, and PPTX files are stored in ImageKit. Chat progress now streams over SSE, including task-specific status updates and the completed answer.
- **Image generation:** image requests run locally through ComfyUI and a photorealistic Stable Diffusion checkpoint, then upload the PNG to ImageKit. After the one-time model/runtime download, image generation makes no paid image API calls.
- **Still incomplete:** vector/semantic retrieval, OCR, DOCX, token-by-token model output, code execution, model usage tracking, and the remaining production hardening in this plan.

## Delivery order

1. **Stabilize the current app:** provider configuration and fallback, deterministic routing for clear intents, safe and useful errors, and working chat/search/coding paths. *(Implemented.)*
2. **Documents:** PDF/TXT/Markdown upload, ownership-scoped metadata, ImageKit file storage, overlap chunking, lexical relevance ranking, and page citations. Semantic embeddings, OCR, and DOCX remain follow-up work.
3. **Artifacts:** generated PNG images and PPTX files are uploaded to ImageKit; attached documents can flow through retrieval into a generated deck. React artifacts include an HTML preview fallback.
4. **Streaming and execution status:** SSE streams backend progress stages and delivers the final answer without waiting for a JSON response; token-by-token model output remains follow-up work.
5. **Security and operations:** authorize conversation access, harden upload handling, add rate limits, structured logs, and usage tracking.
6. **Production review:** deployment configuration, operational documentation, and tests after the target workflows are agreed.

## Configuration needed to run AI features

- Set `GROQ_API_KEY` or `GOOGLE_API_KEY` (also accepts `GOOGLE_GENERATIVE_AI_API_KEY`) in `backend/services/agent/.env` for chat and coding. If both are set, chat tries Groq then Gemini; coding tries Gemini then Groq.
- Set `TAVILY_API_KEY` for Search and Auto requests that need current web information.
- Realistic image generation requires the local ComfyUI portable runtime, the configured checkpoint and VAE, and `IMAGE_KIT_PRIVATE_KEY` to store the PNG. ComfyUI starts automatically when an image is first requested.
- The services also rely on existing `CHAT_SERVICE`, `MONGODB_URI`, `REDIS_URL`, and `PORT` configuration. See `backend/services/agent/.env.example` for the agent-service variables.
- ImageKit credentials are private server-side configuration. Uploaded PDFs are kept in ImageKit; text/Markdown uploads and temporary presentation-build files still use local service storage.
