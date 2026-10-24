# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY backend/package.json .
RUN npm install --production
COPY backend/src ./src
COPY --from=frontend-builder /app/dist ./public
EXPOSE 6767
CMD ["node", "src/index.js"]
