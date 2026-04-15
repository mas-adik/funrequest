# FundRequest 💰

Aplikasi pencatatan budget mingguan untuk internal kantor.

## Fitur
- **Fund Request** — Pengajuan dana dengan format form standar (cetak PDF)
- **Transaksi** — Pencatatan pemasukan & pengeluaran
- **Report/Closing** — Laporan akhir periode dengan generate PDF
- **Profil** — Kelola data user, ganti password

## Tech Stack
| Komponen | Teknologi |
|----------|-----------|
| Backend | Hono + Node.js + SQLite (better-sqlite3) |
| Frontend | Expo (React Native) → Web build via nginx |
| Database | SQLite file (persisten di NAS) |
| CI/CD | GitHub Actions → GHCR → Docker |

## 🚀 Deploy ke NAS (Docker)

### 1. Clone & Setup
```bash
git clone https://github.com/mas-adik/vibe-stack-starter.git fundrequest
cd fundrequest
cp .env.example .env
# Edit .env → isi JWT_SECRET dengan string acak
```

### 2. Jalankan
```bash
docker-compose up -d
```

### 3. Akses
- **Web App**: `http://IP-NAS:3000`
- **API**: `http://IP-NAS:8787`

### 4. Update (setelah push ke GitHub)
```bash
docker-compose pull && docker-compose up -d
```

## 🛠 Development Lokal

### Backend
```bash
cd backend
npm install
cp .env.example .env   # isi JWT_SECRET
npm run dev             # http://localhost:8787
```

### Mobile (Expo)
```bash
cd mobile
npm install --legacy-peer-deps
cp .env.example .env
npx expo start
```

## 📁 Struktur Project
```
fundrequest/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point (Hono + Node server)
│   │   ├── db/
│   │   │   ├── connection.ts # SQLite singleton
│   │   │   ├── migrate.ts    # Auto migration runner
│   │   │   └── schema.ts     # Drizzle ORM schema
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT authentication
│   │   └── routes/
│   │       ├── auth.ts       # Login, register, forgot/reset password
│   │       ├── users.ts      # Profile CRUD
│   │       ├── departments.ts
│   │       ├── fund-requests.ts
│   │       ├── transactions.ts
│   │       └── reports.ts
│   ├── drizzle/              # SQL migration files
│   └── Dockerfile
├── mobile/
│   ├── app/
│   │   ├── (auth)/           # Login, Register, Forgot Password
│   │   └── (app)/            # Bottom Tab: FundReq, Transaksi, Report, Profile
│   ├── src/
│   │   ├── components/       # Button, Input, CurrencyInput, etc.
│   │   ├── contexts/         # AuthContext
│   │   ├── lib/              # API client
│   │   └── types/
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .github/workflows/docker.yml
└── .env.example
```

## 📝 Catatan
- Data SQLite tersimpan di `./data/fundrequest.db` (di-mount sebagai volume)
- Backup rutin folder `./data/` untuk keamanan data
- OTP lupa password saat ini di-log ke console backend (belum kirim email)
