FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --workspace=server
COPY server/ ./server/
RUN npm run build --workspace=server

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --omit=dev --workspace=server
COPY --from=builder /app/server/dist ./server/dist
EXPOSE 3001
CMD ["npm", "start", "--workspace=server"]
