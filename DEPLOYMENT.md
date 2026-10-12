# Nexora deployment

## Run the complete stack with Docker Compose

The Compose stack runs the Vite frontend, API gateway, auth/chat/agent services, MongoDB, and Redis. MongoDB and Redis ports bind to localhost only.

1. Copy `.env.example` to `.env`.
2. Copy each service's `.env.example` to `.env` in that service directory and add the provider keys you use. At least one Groq or Gemini key is needed for chat; ImageKit is needed for hosted documents and generated files; Tavily is needed for web search.
3. Put the Firebase Admin service-account JSON at `backend/services/auth/serviceAccountKey.json` (or set `FIREBASE_SERVICE_ACCOUNT_FILE` in `.env`). This file is ignored by Git and mounted as a Docker secret.
4. Add the Firebase Web API key to `.env` as `VITE_FIREBASE_API_KEY` for Google sign-in.
5. Start the app with `docker compose up --build -d` and open <http://localhost:3000>.

Use `docker compose logs -f` to inspect startup and `docker compose down` to stop the services. Persistent MongoDB, Redis, and agent document storage use named Docker volumes.

Image generation uses Pollinations AI from the backend, so it works when the laptop is offline and after deployment. Set `POLLINATIONS_API_KEY` in the backend environment (Render for the live service). The app requests the raster Flux model by default; `POLLINATIONS_IMAGE_MODEL` can override it. ImageKit remains responsible for storing generated images, so also configure `IMAGE_KIT_PRIVATE_KEY`.

## Vercel

Vercel currently builds the Vite frontend from `frontend/`. The Docker Compose stack is for local/self-hosted use; Vercel does not run MongoDB or Redis containers from Compose. A complete Vercel backend deployment needs reachable MongoDB and Redis services plus the Firebase Admin, Firebase Web, model-provider, and ImageKit environment values. Do not use a local-only MongoDB URI for Vercel.

The Firebase Web API key is optional at build time: the app still renders without it and clearly reports that Google sign-in needs configuration. Add the key to the Vercel project's Production and Preview environments to enable sign-in, then redeploy.

## Free hosted deployment

`render.yaml` and `backend/hosted/Dockerfile` run the API gateway, login, chats, and agent routes together as one Render web service. The frontend stays on Vercel. The Vercel API rewrite points to `https://nexora-ai-api.onrender.com`.

This uses Render's Free web service and Key Value tiers. Free web services sleep after 15 minutes without traffic and can take about a minute to wake; they have limited CPU and memory. The free Key Value has 25 MB of memory and is in-memory only, so restarts clear sessions and short-term chat cache. See [Render's free instance limits](https://render.com/docs/free).

To keep the entire hosting setup free, create/use MongoDB Atlas M0 and enter its connection URL in Render as `MONGODB_URI`. The Blueprint provisions a free Redis-compatible Key Value and wires `REDIS_URL` automatically. The service also needs `FIREBASE_SERVICE_ACCOUNT_JSON`; add `GROQ_API_KEY` for chat, `TAVILY_API_KEY` for web search, and `IMAGE_KIT_PRIVATE_KEY` for document and artifact storage as needed. Google/Gemini is optional if Groq is configured. Never commit secrets to GitHub. Provider free tiers have storage, request, and usage caps.

New document uploads use ImageKit, because Render's filesystem is temporary. Existing local MongoDB and Redis data are separate and are not copied automatically; MongoDB accounts and chats need a deliberate migration if they should be preserved. Do not point hosted services at localhost or Docker-only hostnames.

Hosted image generation calls Pollinations AI directly from the backend. Add `POLLINATIONS_API_KEY` to Render's backend environment and keep it private; never put it in Vercel or browser code. Pollinations may enforce account balance, model access, and usage limits for the key. ImageKit stores finished images, so `IMAGE_KIT_PRIVATE_KEY` is also required.

## Deploy steps

1. Push the project to the connected GitHub repository.
2. In Render, create a Blueprint from that repository and select `render.yaml`.
3. Create/use a free MongoDB Atlas M0 cluster. The Blueprint provisions the free Redis-compatible cache.
4. Add the environment secrets listed above in Render, including `POLLINATIONS_API_KEY`, then deploy.
5. Verify `https://nexora-ai-api-mqqk.onrender.com/health` returns `{"status":"ok"}`. Once the Render service is live, redeploy the Vercel frontend so its API rewrite reaches it.
