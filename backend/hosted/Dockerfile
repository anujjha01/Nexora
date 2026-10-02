FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev --package-lock=false

COPY backend/gateway/ ./backend/gateway/
COPY backend/services/auth/ ./backend/services/auth/
COPY backend/services/chat/ ./backend/services/chat/
COPY backend/services/agent/ ./backend/services/agent/
COPY backend/shared/ ./backend/shared/
COPY backend/hosted/ ./backend/hosted/

EXPOSE 10000
CMD ["node", "backend/hosted/server.js"]
