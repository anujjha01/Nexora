# Nexora deployment

## Run the complete stack with Docker Compose

The Compose stack runs the Vite frontend, API gateway, auth/chat/agent services, MongoDB, and Redis. MongoDB and Redis ports bind to localhost only.

1. Copy `.env.example` to `.env`.
2. Copy each service's `.env.example` to `.env` in that service directory and add the provider keys you use. At least one Groq or Gemini key is needed for chat; ImageKit is needed for hosted documents and generated files; Tavily is needed for web search.
3. Put the Firebase Admin service-account JSON at `backend/services/auth/serviceAccountKey.json` (or set `FIREBASE_SERVICE_ACCOUNT_FILE` in `.env`). This file is ignored by Git and mounted as a Docker secret.
4. Add the Firebase Web API key to `.env` as `VITE_FIREBASE_API_KEY` for Google sign-in.
5. Start the app with `docker compose up --build -d` and open <http://localhost:3000>.

Use `docker compose logs -f` to inspect startup and `docker compose down` to stop the services. Persistent MongoDB, Redis, and agent document storage use named Docker volumes.

For shared cloud image generation, set `STABILITY_API_KEY` and `IMAGE_KIT_PRIVATE_KEY` in the agent service environment. Without a cloud key, local Docker setups can generate through ComfyUI with a compatible Stable Diffusion checkpoint on the host at port 8188; set `COMFYUI_URL` if it runs elsewhere.

## Vercel

Vercel currently builds the Vite frontend from `frontend/`. The Docker Compose stack is for local/self-hosted use; Vercel does not run MongoDB or Redis containers from Compose. A complete Vercel backend deployment needs reachable MongoDB and Redis services plus the Firebase Admin, Firebase Web, model-provider, and ImageKit environment values. Do not use a local-only MongoDB URI for Vercel.

The Firebase Web API key is optional at build time: the app still renders without it and clearly reports that Google sign-in needs configuration. Add the key to the Vercel project's Production and Preview environments to enable sign-in, then redeploy.

## Free hosted deployment

`render.yaml` and `backend/hosted/Dockerfile` run the API gateway, login, chats, and agent routes together as one Render web service. The frontend stays on Vercel. The Vercel API rewrite points to `https://nexora-ai-api.onrender.com`.

This uses Render's Free web service and Key Value tiers. Free web services sleep after 15 minutes without traffic and can take about a minute to wake; they have limited CPU and memory. The free Key Value has 25 MB of memory and is in-memory only, so restarts clear sessions and short-term chat cache. See [Render's free instance limits](https://render.com/docs/free).

To keep the entire hosting setup free, create/use MongoDB Atlas M0 and enter its connection URL in Render as `MONGODB_URI`. The Blueprint provisions a free Redis-compatible Key Value and wires `REDIS_URL` automatically. The service also needs `FIREBASE_SERVICE_ACCOUNT_JSON`; add `GROQ_API_KEY` for chat, `TAVILY_API_KEY` for web search, and `IMAGE_KIT_PRIVATE_KEY` for document and artifact storage as needed. Google/Gemini is optional if Groq is configured. Never commit secrets to GitHub. Provider free tiers have storage, request, and usage caps.

New document uploads use ImageKit, because Render's filesystem is temporary. Existing local MongoDB and Redis data are separate and are not copied automatically; MongoDB accounts and chats need a deliberate migration if they should be preserved. Do not point hosted services at localhost or Docker-only hostnames.

Hosted image generation uses the Stability AI cloud API when `STABILITY_API_KEY` is set on the agent service. This lets signed-in users generate images without the owner's laptop running; successful generations use the provider account's credits and are subject to its limits. Keep the key only in the backend deployment environment, never in the Vite frontend or source control. ImageKit must also be configured to store and display finished images.

Without the cloud key, hosted free deployments can still use the optional laptop GPU relay. That path requires the laptop, ComfyUI, and its authenticated Cloudflare tunnel to remain online. Self-hosted installations can run ComfyUI directly. Both paths use ImageKit to store generated images.

To enable shared hosted image generation:

1. Create a Stability AI API key and add it to the agent service's `STABILITY_API_KEY` environment variable in Render. Keep the value private. Successful image generation consumes provider credits; check the provider's current pricing and limits before enabling this for public users.
2. Ensure `IMAGE_KIT_PRIVATE_KEY` is set so generated images can be stored and shown to users.
3. Redeploy the backend service. A running process will not see newly added environment values until it restarts.

To use the optional laptop image worker instead:

1. Set `NEXORA_LOCAL_IMAGE_TOKEN` in Render's backend environment to a random secret of at least 32 characters. Keep that same secret in `backend/.env` on the laptop. Do not commit or share this value.
2. Run `scripts/install-cloudflared.ps1` once from PowerShell to download Cloudflare Tunnel and verify its SHA-256 checksum.
3. Run `scripts/start-image-relay.ps1` to start the authenticated image worker, open the temporary HTTPS tunnel, and register its address with Render.
4. Run `scripts/install-image-relay-startup.ps1` once to have Windows start the worker whenever you sign in.

ComfyUI and the compatible Stable Diffusion checkpoint must already be installed on the laptop. A Cloudflare-managed domain and named tunnel are the better choice for a production-quality permanent URL.

## Deploy steps

1. Push the project to the connected GitHub repository.
2. In Render, create a Blueprint from that repository and select `render.yaml`.
3. Create/use a free MongoDB Atlas M0 cluster. The Blueprint provisions the free Redis-compatible cache.
4. Add the environment secrets listed above in Render, then deploy.
5. Verify `https://nexora-ai-api-mqqk.onrender.com/health` returns `{"status":"ok"}`. Once the Render service is live, redeploy the Vercel frontend so its API rewrite reaches it.
