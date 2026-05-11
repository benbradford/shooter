# Claude Code Integration

Add Claude Code as an alternative AI engine alongside Kiro for development sessions.

## Goal

Allow the developer to choose between Kiro (orchestrated multi-agent workflow) and Claude Code (direct implementation) on a per-task basis, using the same session infrastructure.

## Changes Made

### 1. CLAUDE.md (project root)

Project context file for Claude Code. Equivalent to `.kiro/agents/dodging-bullets.md` but tailored for Claude's direct working style — no multi-agent ceremony, just project architecture, coding standards, and file structure.

### 2. VS Code Extension (`vscode-sessions/`)

**Session creation** — "New Session" now prompts to pick Kiro or Claude. Dedicated title bar buttons for each:
- Terminal icon → Kiro (`kiro-cli chat --agent dodging-bullets`)
- Comment icon → Claude (`claude`)

**Session display** — Sessions show `[K]` or `[C]` tag and use different icons to distinguish engine type.

**Workflow rerun** — Rerunning a dead workflow now prompts which engine to use, so you can re-attempt a Kiro task with Claude (or vice versa). Engine choice is persisted to `.sessions.json`.

**Files modified:**
- `vscode-sessions/src/sessionManager.ts` — Added `SessionEngine` type, engine picker in `createSession`, engine-aware `restartSession`
- `vscode-sessions/src/sessionsProvider.ts` — Engine tag `[K]`/`[C]` in description, different icons per engine
- `vscode-sessions/src/extension.ts` — Registered `dbSessions.createKiro` and `dbSessions.createClaude` commands
- `vscode-sessions/package.json` — New commands and title bar buttons

### 3. Workbench Trackers

All three trackers now have parallel action buttons:

| Tracker | Kiro button | Claude button |
|---------|-------------|---------------|
| Bug Tracker | `🤖 Fix` | `🟣 Fix` |
| Architecture Issues | `🤖 Fix` | `🟣 Fix` |
| Feature Tracker | `🤖 Impl` | `🟣 Impl` |

The `/api/tracker/fix` endpoint accepts an optional `engine` field (`'kiro'` | `'claude'`). Claude sessions spawn `claude -p "{prompt}"` instead of `kiro-cli chat --agent dodging-bullets "{prompt}"`.

**Files modified:**
- `vite.config.ts` — `/api/tracker/fix` endpoint accepts `engine` param, builds appropriate shell command
- `workbench/bug-tracker.html` — Claude button + engine-aware `fixEntry(id, engine)`
- `workbench/architecture-issues.html` — Same pattern
- `workbench/feature-tracker.html` — Same pattern

### 4. Session Data Model

The `Session` interface in both the VS Code extension and the vite dev server now includes:

```typescript
engine?: 'kiro' | 'claude';
```

Existing sessions without this field default to `'kiro'` behavior.

## How It Works

| Action | Kiro | Claude |
|--------|------|--------|
| New session (VS Code) | `kiro-cli chat --agent dodging-bullets` in tmux | `claude` in tmux |
| Fix/Impl from tracker | Writes prompt to tmp file, runs via kiro-cli | Writes prompt to tmp file, runs via `claude -p` |
| Rerun workflow | Prompts engine choice, rebuilds command | Same |

## Design Decisions

- **No workflow parity forced** — Claude works directly rather than mimicking Kiro's multi-agent phases. Each tool plays to its strengths.
- **Shared session infrastructure** — Both engines use the same tmux/ttyd/`.sessions.json` system. No duplication.
- **Engine stored per-session** — So restarts and display always know which tool is in use.
- **Purple color coding** — Claude buttons use `#b388ff` purple to visually distinguish from Kiro's green robot emoji.
