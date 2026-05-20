# Session Redesign — Inspired by KiRoom

## Problem

Our `sessions.html` works but feels primitive compared to KiRoom's room/thread model:
- Sessions are just tmux panes shown via ttyd iframes — no structured data
- No real separation of input from output (the terminal IS both)
- Session "resumption" means the tmux pane is still alive; if it dies, the session is gone
- No message history, no search, no archiving with recall
- Switching sessions reloads the iframe, losing scroll position
- No message queueing — can't send follow-up messages while agent is busy

## What KiRoom Does Differently

KiRoom is a full web app (Express + React + SQLite + WebSocket) that manages `kiro-cli` processes programmatically via ACP (Agent Client Protocol):

| Aspect | Our sessions.html | KiRoom |
|--------|-------------------|--------|
| Session persistence | tmux pane alive = session exists | SQLite stores session ID; process can be killed and resumed |
| Input/Output | Shared terminal (ttyd iframe) | Separate: compose box → REST POST; output → WebSocket stream |
| Session resumption | tmux must stay alive | `session/load` with stored ID; falls back to `session/new` + context replay |
| Switching | Reload iframe src | Instant — just render different thread's messages from DB |
| Message queue | Not supported | QueueDispatcher: sequential processing with 10s countdown, cancellation |
| Idle management | Manual cleanup button | Auto-cull idle sessions (5-15 min), transparent resume on next message |
| Organization | Flat list + archive section | Rooms → Threads → Drawers, with search and filters |
| Streaming | ttyd renders terminal output | WebSocket events (agent_message_chunk, tool_call_update, turn_end) |
| History | Scroll up in terminal (limited) | Full message history in SQLite, searchable |

## What We Should Adopt

### Phase 1: Structured Session Data (Low Effort)

Store messages in a SQLite database (or JSON file) alongside the tmux session:
- Every user prompt and agent response saved with timestamps
- Session metadata: name, engine, status, created/updated, working directory
- Enables search across all sessions, proper history

### Phase 2: Input/Output Separation (Medium Effort)

Replace the ttyd iframe with a custom UI:
- **Output panel**: Rendered markdown messages (like a chat), with collapsible tool calls
- **Input panel**: Compose box at the bottom, supports multi-line, can queue messages
- Keep tmux as the *backend* process manager, but don't show raw terminal to user
- Stream output from tmux via WebSocket (parse ANSI, render as structured messages)

### Phase 3: Session Lifecycle (Medium Effort)

- **Idle culling**: Kill agent processes after N minutes idle, keep session data
- **Transparent resume**: On next message, use `claude --resume <id>` or equivalent
- **Session forking**: Branch off a conversation from any point
- **Context replay**: When resuming, inject key context back into the agent

### Phase 4: Room Organization (Low Effort)

- Group sessions into "rooms" (projects/topics)
- Drawer tabs within rooms for sub-categorization
- Home room concept — default view on load

## What We Should NOT Adopt

- **Full ACP protocol** — overkill for our needs; we use claude/kiro directly
- **Multi-provider orchestration** — we just have kiro + claude
- **Sub-agent spawning** — not needed for a game dev project
- **Custom MCP server** — adds complexity we don't need
- **100+ settings** — keep it simple

## Key Insight

The fundamental architecture shift is: **don't make the terminal the UI**. Use the terminal (tmux) as a headless process manager, and build a proper web UI on top that reads/writes to structured data. This gives us:
- Instant session switching (no iframe reload)
- Searchable history
- Message queueing
- Proper session lifecycle management
- Better mobile/responsive experience

## References

- KiRoom source: `~/workspace/KiRoom/src/KiRoom/`
- KiRoom architecture: `~/workspace/KiRoom/src/KiRoom/docs/architecture.md`
- KiRoom features: `~/workspace/KiRoom/src/KiRoom/docs/features.md`
- Our current sessions: `workbench/sessions.html`
- Our session API: `vite.config.ts` (session management endpoints)
