# ── Build & Run ────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# better-sqlite3 butuh build tools untuk native addon
RUN apk add --no-cache python3 make g++ gcc musl-dev

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Data directory (mount as volume)
RUN mkdir -p /app/data

ENV PORT=8787
ENV DATABASE_PATH=/app/data/fundrequest.db

EXPOSE 8787

CMD ["npx", "tsx", "src/index.ts"]
