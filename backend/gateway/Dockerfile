FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/backend/gateway
COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm ci --omit=dev
COPY backend/gateway/package*.json ./
RUN npm ci --omit=dev
COPY backend/gateway/ ./
COPY backend/shared/ ../shared/
EXPOSE 8000
CMD ["node", "index.js"]
