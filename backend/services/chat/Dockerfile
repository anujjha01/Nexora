FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/backend/services/chat
COPY backend/services/chat/package*.json ./
RUN npm ci --omit=dev
COPY backend/services/chat/ ./
COPY backend/shared/ ../../shared/
EXPOSE 8002
CMD ["node", "index.js"]
