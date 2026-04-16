# ── Single stage: langsung run dengan tsx ──────────────────
FROM node:20-alpine
WORKDIR /app

# better-sqlite3 perlu build tools untuk native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

# Cleanup build tools setelah native modules compiled
RUN apk del python3 make g++

COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Data directory (mount as volume)
RUN mkdir -p /app/data

ENV PORT=8787
ENV DATABASE_PATH=/app/data/fundrequest.db

EXPOSE 8787

# Jalankan langsung dengan tsx (no tsc build needed)
CMD ["npx", "tsx", "src/index.ts"]
