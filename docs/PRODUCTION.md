# Production operations

## Deploy checklist

1. **Supabase** — Apply migrations (`supabase db push` or CI). Enable backups and review security advisors.
2. **Environment** — Copy `.env.example` to `.env.local` / Vercel project env. Set `TURN_*` for reliable WebRTC.
3. **TURN** — Use a managed provider (Twilio, Cloudflare Calls, Metered, etc.). Credentials are served from `GET /api/ice` only.
4. **Session cleanup** — On the linked Supabase project, `pg_cron` job `onariam_cleanup_expired_rooms` runs daily at **03:15 UTC** (`select public.cleanup_expired_rooms();`). Migration: `20260528120100_schedule_cleanup_cron.sql`.
5. **Monitoring** — Track P2P connect failures, Realtime subscribe errors, and RPC rate-limit responses (`rate limit exceeded`, `session expired`).

## Security

| Control | Implementation |
|--------|----------------|
| Clipboard HTML XSS | `lib/sanitize-html.ts` on ingest, decode, and inbox render |
| TURN secrets | Server env only; `/api/ice` |
| Session TTL | `rooms.expires_at` (24h default) |
| Abuse limits | `create_meeting` 20/hour, `join_meeting` 60/hour per device fingerprint |
| HTTP headers | Root `middleware.ts` |

## Privacy note

Clipboard **payload** is sent over WebRTC when connected. **Inbox sync** also broadcasts item text over Supabase Realtime so multiple desktops stay in sync. Document this in your privacy policy for production users.

## Rate limits

Adjust in migration `check_rate_limit` calls inside `create_meeting` / `join_meeting` if your traffic profile differs.
