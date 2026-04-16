# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# better-sqlite3 perlu build tools untuk native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Build: tsc (compile TS) + tsc-alias (resolve @/ paths)
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# better-sqlite3 perlu build tools juga di production
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

# Cleanup build tools setelah install
RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY drizzle/ ./drizzle/

# Data directory (mount as volume)
RUN mkdir -p /app/data

ENV PORT=8787
ENV DATABASE_PATH=/app/data/fundrequest.db

EXPOSE 8787

CMD ["node", "dist/index.js"]
