# 🚀 Vibe SaaS Starter

A production-ready boilerplate for building Mobile SaaS with **Expo**, **Cloudflare Workers**, **Hono**, and **Drizzle ORM**.
Built for the "Vibe Coding" workflow (AI-Assisted Development).

## 🛠 Tech Stack
- **Mobile:** Expo (React Native), TypeScript, NativeWind v4.
- **Backend:** Cloudflare Workers, Hono Framework.
- **Database:** Cloudflare D1 (SQLite), Drizzle ORM.
- **Auth:** JWT Authentication, SecureStore, Multi-tenant Architecture.

## 🤖 AI System Prompt (For Cursor/Windsurf)
Copy prompt di bawah ini ke AI Editor kamu untuk memulai coding dengan konteks yang benar:

---
**[SYSTEM PROMPT]**
Saya menggunakan boilerplate "Vibe SaaS Starter". Berikut konteks arsitekturnya:

1. **Struktur:** Monorepo (`/mobile` Expo, `/backend` Cloudflare Hono).
2. **Database:** Drizzle ORM + Cloudflare D1. Tabel operasional WAJIB punya kolom `tenant_id` untuk isolasi data multi-tenant.
3. **Auth:** JWT di `ExpoSecureStore`. Middleware backend inject `user_id` & `tenant_id`.
4. **Styling:** NativeWind (Tailwind).
5. **API:** Axios dengan Auto-Interceptor token.

Tolong bantu saya buat fitur: [ISI FITUR KAMU]
---

## 🏁 Quick Start

1. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars and set your JWT_SECRET
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

2. **Mobile Setup:**
   ```bash
   cd mobile
   npm install
   cp .env.example .env
   # Edit .env with your Backend URL (Tunnel/Localhost)
   npx expo start -c
   ```

## 📁 Project Structure

```
vibe-stack-starter/
├── backend/                 # Cloudflare Workers + Hono
│   ├── src/
│   │   ├── db/schema.ts     # Drizzle ORM schema (tenants, users, etc.)
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── lib/             # Utilities (auth, helpers)
│   ├── drizzle/             # Database migrations
│   └── wrangler.toml        # Cloudflare config
│
├── mobile/                  # Expo React Native
│   ├── app/                 # Expo Router screens
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom hooks (useAuth, etc.)
│   │   ├── lib/             # API client, utilities
│   │   └── types/           # TypeScript types
│   └── app.json             # Expo config
│
└── README.md
```

## 🔐 Multi-Tenant Architecture

This boilerplate implements a **single-database multi-tenant** pattern:

- Each organization is a **Tenant** (`tenants` table)
- Users belong to a tenant via `tenant_id`
- All operational tables include `tenant_id` foreign key
- Auth middleware injects `tenantId` into every request context

## 📝 License

MIT
