FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/backend/services/agent
COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm ci --omit=dev
COPY backend/services/agent/package*.json ./
RUN npm ci --omit=dev
COPY backend/services/agent/ ./
COPY backend/shared/ ../../shared/
RUN mkdir -p storage/documents storage/presentations
EXPOSE 8003
CMD ["node", "index.js"]
