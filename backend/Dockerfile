# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

RUN npx tsc --outDir dist

# ── Stage 2: Production ────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle/ ./drizzle/

# Data directory (mount as volume)
RUN mkdir -p /app/data

ENV PORT=8787
ENV DATABASE_PATH=/app/data/fundrequest.db

EXPOSE 8787

CMD ["node", "dist/index.js"]
