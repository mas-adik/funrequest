# ── Stage 1: Build Expo Web ─────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

# API URL: saat diakses dari browser, /api/ di-proxy oleh nginx ke backend
ENV EXPO_PUBLIC_API_URL=/api

RUN npx expo export --platform web

# ── Stage 2: Serve dengan nginx ────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
