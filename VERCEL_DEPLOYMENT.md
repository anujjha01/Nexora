# Deploy Nexora to Vercel with free local image generation

Vercel hosts the Vite website. The auth, chat, agent, Redis, MongoDB, and ComfyUI services continue running on the PC with the GPU. Vercel's `/api` rewrite forwards requests to the gateway over HTTPS, so browser requests and session cookies stay on the Vercel site origin. Image generation remains local and does not use a paid image API.

## Before deploying

1. Install/configure a stable HTTPS tunnel to the local backend gateway on port `8000`. Point the tunnel to `http://localhost:8000`. Do not expose ComfyUI's port `8188` publicly.
2. Replace `your-stable-tunnel-host.example.com` in `frontend/vite-project/vercel.json` with the tunnel's hostname, keeping the `https://` prefix and `/api/:path*` suffix. Commit this change before importing the repo into Vercel.
3. Keep the auth, chat, agent, Redis, MongoDB, ImageKit, and ComfyUI services running on the GPU PC. The gateway's `AUTH_SERVICE`, `CHAT_SERVICE`, and `AGENT_SERVICE` values should point to the reachable local services.
4. After the first Vercel deployment, set `FRONTEND_URL` in the gateway environment to the exact Vercel production origin, such as `https://your-project.vercel.app`, then restart the gateway. Add preview origins only if you intend to use preview deployments.
5. Set `COOKIE_SECURE=true` (or `NODE_ENV=production`) in the auth service environment and restart it, so login cookies work through the HTTPS Vercel URL.

## Vercel project settings

- Import this repository into Vercel.
- Set **Root Directory** to `frontend/vite-project`.
- Framework preset: **Vite**.
- Build command: `npm run build`.
- Output directory: `dist`.
- Add `VITE_FIREBASE_API_KEY` from the Firebase Web app configuration. This is a public browser key, not a server secret.
- Deploy. The Vercel rewrite forwards `/api/...` to the gateway, and the second rewrite handles direct navigation to frontend routes.

Do not add provider or database secrets to `VITE_*` settings. Vite embeds those values into public browser files. Backend secrets belong only in the service environments on the PC.

## Runtime requirements and limits

The GPU PC must stay powered on and connected, with the services and tunnel running. If the PC sleeps or the tunnel stops, the deployed site remains visible but its API and image generation are unavailable. A temporary tunnel URL changes when it restarts; use a stable hostname or update `vercel.json` and redeploy after it changes. The gateway allows only its configured `FRONTEND_URL`, so keep that value aligned with the production domain.

Vercel's external proxy has a 120-second request limit. The ComfyUI photo workflow should finish within that time on the local GPU, but a cold start or slow generation can time out at Vercel even while the local generator allows longer jobs.

Vercel is not hosting the persistent backend or GPU model in this setup. Moving image generation completely off the PC requires a hosted image/GPU service and is outside the free local-GPU setup.
