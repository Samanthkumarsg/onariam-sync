# Hook model (ethical) — Onariam Sync

Adapted from Nir Eyal’s **Trigger → Action → Variable Reward → Investment** loop. Goal: users return when cross-device paste hurts—not to maximize time in the app. See [UX.md](../UX.md) for guardrails.

## Loop

```text
Trigger     →  “I need this on my computer”
Action      →  Scan / open send link → paste → Send
Reward      →  Item in inbox / delivered / copied
Investment  →  Name, avatar, remembered lobby draft, session ritual
```

**Regret test:** Would users thank you for the habit? If not, don’t ship it.

## Surfaces (implementation: `lib/hook-copy.ts`)

| Surface | Trigger | Action | Reward | Investment |
|---------|---------|--------|--------|------------|
| Lobby `/` | Need desktop paste | Start / Join | Session + code | Profile draft in `localStorage` |
| Empty inbox | Phone not linked | Copy link / QR | “Phone connected” | Host shares invite text |
| `/send/[code]` | Opened link / QR | Paste, Send | Sent → Delivered → Copied | Join profile |
| Desktop inbox | Item arrives | Copy | Toast + highlight | Inbox during session |

## Copy principles

- **One primary CTA** per full-screen state.
- **Variable reward = outcome timing** (connecting → connected, sent → on desktop)—not badges or streaks.
- **No** push spam, streaks, or tutorials when code + QR already explain pairing.
- **Share text** (`formatPhoneInviteClipboard`) is the external trigger packaging.

## Reward feedback (implemented)

- **Haptics** — `lib/haptic.ts`: light / success / celebrate on phone (coarse pointer only; respects `prefers-reduced-motion`).
- **Send button** — brief scale pulse when delivered or copied on desktop (`animate-hook-reward`).
- **Moments** — send tap, P2P connected, delivered/copied ack, auto-copy on desktop, manual copy, invite link copied.

## Metrics (ethical)

- Time to first successful paste
- Session completion (paste received + copied)
- Return within 7 days when user had a real trigger  
- **Not** session length or notification CTR
