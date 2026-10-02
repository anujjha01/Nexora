FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/backend/services/auth
COPY backend/services/auth/package*.json ./
RUN npm ci --omit=dev
COPY backend/services/auth/ ./
COPY backend/shared/ ../../shared/
EXPOSE 8001
CMD ["node", "index.js"]
