# UX principles

## Overview

Creating a great **Onariam Sync** experience is about delivering a focused, session-native flow that feels built for moving clipboard content between phone and browser—not a generic website squeezed into a sync tool.

The goal is to design surfaces that feel consistent and useful while extending what users can do in a **short-lived peer-to-peer session** in ways that add real value.

**Good examples on this platform**

- Scan a QR or open a send link → paste on phone → item appears in the desktop inbox
- Copy the latest note to the system clipboard in one tap
- Host approves a joiner; everyone shares the same inbox
- Optional: summarize the latest inbox item locally (secondary, in a drawer)

**Poor examples on this platform**

- Long marketing copy or feature tours inside the session
- Multi-step tutorials when the empty inbox already shows **code + QR + copy link**
- Dashboards, settings walls, or navigation-heavy layouts during sync
- Ads, upsells, or unrelated messaging in the inbox
- Large previews of sensitive clipboard content

Use the principles below to guide development. They are adapted from [OpenAI’s ChatGPT Apps SDK UX guidance](https://developers.openai.com/apps-sdk/concepts/ux-principles); Onariam Sync is a **web session product**, not a ChatGPT app, but the same discipline applies.

---

## Principles for great Onariam Sync UX

The product should do at least one thing **better** because it is a dedicated sync session—not a generic paste box:

- **Session leverage** – QR, session code, realtime inbox, and P2P delivery make phone → browser paste fast and obvious.
- **Native fit** – Each route (`/`, `/sync/[code]`, `/send/[code]`) feels like one job: start, receive, or send.
- **Composability** – Small actions (link phone, add to inbox, send, copy, leave) combine into a full workflow without extra screens.

If you cannot describe the clear benefit of the current screen in one sentence, simplify before shipping.

The UI should also **improve the session** by providing something users cannot get from copy-paste alone: shared inbox, connection status, host approval, and optional local summarize.

### 1. Extract, don’t port

Focus on the core jobs users use Onariam Sync for. Do not mirror a full website or native app.

Identify **atomic actions** with minimal inputs and outputs:

| Surface | Atomic actions |
|--------|----------------|
| Lobby (`/`) | Start session · Join with code |
| Desktop session (`/sync/[code]`) | Link phone · Add to inbox · Copy item · Leave |
| Phone send (`/send/[code]`) | Paste/type · Send to browser |
| Join gate | Session code (if needed) · Name · Icon · Enter |

Each action should be invokable without clarifying questions. Avoid screens that duplicate what the QR, code, or inbox already show.

### 2. Design for how users arrive

Expect users to land **with intent**—not to browse.

Support:

- **Direct entry** — opened `/send/abc-defg-hijk` from a QR (paste and send immediately)
- **Join entry** — have a session code from someone else
- **Host entry** — “Start session” from the lobby with a name and icon
- **First run** — remember name/avatar in `localStorage`; teach pairing with **code + QR**, not a long checklist

Do not require navigation through unrelated steps to complete one paste.

### 3. Design for the session environment

Onariam Sync provides the **session workspace**. Use UI selectively to clarify the current task:

- **Pairing** — code, QR, copy link (empty inbox or header drawer)
- **Compose** — editor panel for “Add to inbox”
- **Inbox** — paper cards with text, copy, source, time

Skip ornamental components that do not advance link → paste → receive → copy. Optional tools (AI summarize, show full URL, assignee tags) stay **secondary**.

### 4. Optimize for flow, not navigation

The session holds state (connection, latest item, copied flag). The UI supplies:

- **Clear, declarative actions** — one primary button per full-screen state
- **Concise status** — one line for connection/send/delivery (not paragraphs)
- **Obvious next step** — e.g. “Copy link for phone” when inbox is empty; “Send to browser” on phone

Avoid deep menus for tasks that belong on the current screen.

### 5. Embrace what is unique here

Highlight what only Onariam Sync does well:

- **Peer-to-peer** — payload does not live on our servers; say once per context, not in every footer
- **Session code** — `abc-defg-hijk` visible when pairing matters
- **Realtime shared inbox** — latest item highlighted; optional auto-copy toggle
- **Host approval** — pending joiners are actionable, not buried
- **Optional local AI** — summarize latest note in a drawer; never block send/receive/copy

---

## Checklist before shipping UI changes

Answer these yes/no questions before merging UX-facing work. A **no** means improve before release.

> Onariam Sync is distributed as a web app, not through the ChatGPT App Store. This checklist adapts OpenAI’s publishing baseline for **this** product.

- **Session value** – Does the screen advance link, send, receive, or copy—not generic browsing?
- **Beyond manual paste** – Does the app provide shared inbox, P2P delivery, or session pairing users cannot get from OS clipboard alone?
- **Atomic actions** – Are controls indivisible and self-explanatory (e.g. one “Send to browser”, one “Add to inbox”)?
- **Helpful UI only** – Would replacing QR, inbox cards, or the compose panel with plain text meaningfully hurt the task?
- **End-to-end in session** – Can users finish phone → desktop paste without leaving `/sync` or `/send`?
- **Performance** – Do P2P connect, inbox update, and copy feel fast enough on mobile and desktop?
- **Discoverability** – Can a new user infer what to do from the headline + one CTA + code/QR?
- **Platform fit** – Does the UI use session code, QR, inbox, and connection state—not unrelated patterns?

Additionally, avoid:

- Displaying **long-form or static content** better suited for marketing pages
- Requiring **complex multi-step workflows** when code + QR already explain pairing
- Using the space for **ads, upsells, or irrelevant messaging**
- Surfacing **sensitive clipboard content** in oversized or public-looking cards
- **Duplicating system clipboard** with redundant composers or duplicate status lines

---

## Mapping from ChatGPT concepts

| ChatGPT principle | Onariam Sync |
|-------------------|--------------|
| Conversational leverage | Session code, QR, status lines, shared inbox |
| Native fit | Routes and layouts per role (host desktop, phone send, joiner) |
| Composability | Link · Send · Add · Copy · Leave as building blocks |
| Model-friendly tools | *(N/A for web UI)* — keep actions discrete for future APIs |
| In-chat completion | Complete paste in session without extra tabs |

---

## Implementation pointers

- UI primitives: `lib/ui.ts` (`panel`, `paperCard`, `pageShell`, `touchTarget`)
- Visual system: `DESIGN.md`, `cohere/DESIGN.md`
- Empty inbox: show **session code + QR + copy link**; avoid long step lists
- Mobile: solid session header, no compose panels stuck at `opacity: 0`

### Next steps

- Polish visual details per `DESIGN.md`
- For ChatGPT Apps SDK UI patterns (if building a ChatGPT app later), see [OpenAI UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines)
