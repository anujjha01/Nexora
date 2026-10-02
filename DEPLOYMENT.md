# Nexora deployment

## Run the complete stack with Docker Compose

The Compose stack runs the Vite frontend, API gateway, auth/chat/agent services, MongoDB, and Redis. MongoDB and Redis ports bind to localhost only.

1. Copy `.env.example` to `.env`.
2. Copy each service's `.env.example` to `.env` in that service directory and add the provider keys you use. At least one Groq or Gemini key is needed for chat; ImageKit is needed for hosted documents and generated files; Tavily is needed for web search.
3. Put the Firebase Admin service-account JSON at `backend/services/auth/serviceAccountKey.json` (or set `FIREBASE_SERVICE_ACCOUNT_FILE` in `.env`). This file is ignored by Git and mounted as a Docker secret.
4. Add the Firebase Web API key to `.env` as `VITE_FIREBASE_API_KEY` for Google sign-in.
5. Start the app with `docker compose up --build -d` and open <http://localhost:3000>.

Use `docker compose logs -f` to inspect startup and `docker compose down` to stop the services. Persistent MongoDB, Redis, and agent document storage use named Docker volumes.

Image generation expects ComfyUI with a compatible Stable Diffusion checkpoint on the host at port 8188. Set `COMFYUI_URL` in `.env` if it runs elsewhere. Without it, the rest of Nexora can start, but image generation will report that the local image engine is unavailable.

## Vercel

Vercel currently builds the Vite frontend from `frontend/`. The Docker Compose stack is for local/self-hosted use; Vercel does not run MongoDB or Redis containers from Compose. A complete Vercel backend deployment needs reachable MongoDB and Redis services plus the Firebase Admin, Firebase Web, model-provider, and ImageKit environment values. Do not use a local-only MongoDB URI for Vercel.

The Firebase Web API key is optional at build time: the app still renders without it and clearly reports that Google sign-in needs configuration. Add the key to the Vercel project's Production and Preview environments to enable sign-in, then redeploy.
