# Nimbus Drive

Single-user personal cloud. Files are stored in private Telegram channels through the **Telegram User API (MTProto)** using GramJS (`telegram`). Metadata lives in Prisma. Credentials never reach the browser.

## Architecture

- **App / UI:** Next.js 15 App Router, Tailwind, glass panels, Framer Motion
- **Auth:** Better Auth, email + password, HTTP-only `SameSite=Strict` cookies
- **Data:** Prisma repositories → application services → route handlers / server actions
- **Storage:** GramJS `TelegramClient` + AES-256-GCM encrypted string session
- **Security:** Zod validation, filename sanitization, origin checks, CSP / Helmet-style headers, rate limits, audit log, login history, device sessions

Each library (photos, videos, movies, music, documents, archives, files) maps to one Telegram channel.

## Setup

1. Copy `.env.example` to `.env` and fill every required value.
2. Create API credentials at [https://my.telegram.org](https://my.telegram.org).
3. Generate a GramJS string session **offline** (never commit it). The Settings page accepts the session and encrypts it with `SESSION_ENCRYPTION_KEY`.
4. Create private Telegram channels (one per category) and bind them in Settings.
5. Install and run:

```bash
npm install
npx prisma db push
npm run dev
```

The first account created becomes the only owner. Further sign-ups are rejected.

## Production (Vercel)

- Set `DATABASE_URL` to your PostgreSQL connection string. The Vercel build runs `prisma db push` to create or update the database schema.
- Set all secrets in the Vercel project environment.
- Large uploads use chunked requests; Telegram transfer still needs a Node.js runtime with enough `maxDuration`.
- Virus scanning is a `VirusScanner` interface with a no-op placeholder (`src/services/virus-scanner.ts`).

## Security notes

- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and the string session are server-only.
- Session strings are stored as AES-256-GCM ciphertext.
- Share links are HMAC-signed and expire after 24 hours.
