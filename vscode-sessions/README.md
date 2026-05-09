# DB Sessions — VS Code Extension

Manage kiro-cli sessions from VS Code's sidebar with native copy/paste support.

## Why

The browser-based sessions (ttyd) have a copy problem — you can't select text and Cmd+C when the terminal app has mouse mode enabled. VS Code's integrated terminal intercepts copy shortcuts before they reach the terminal, so copy/paste always works.

## Features

- Sidebar panel showing all sessions (Workflows / Sessions / Archived)
- Click a session to open it in a VS Code integrated terminal
- Sessions persist when you switch between them (tmux keeps running)
- Right-click context menu: Rename, Archive, Kill, Delete
- "New Session" button creates a `kiro-cli chat --agent dodging-bullets` session
- Shares `.sessions.json` with the web-based sessions system (both coexist)
- Auto-refreshes every 5 seconds

## Prerequisites

- **tmux** — `brew install tmux`
- **kiro-cli** — Must be on PATH
- **VS Code** — 1.85+

## Install

```bash
cd vscode-sessions
npm install
npx tsc -p ./
npx @vscode/vsce package --allow-missing-repository
code --install-extension db-sessions-0.1.0.vsix
```

After installing, restart VS Code. The "DB Sessions" icon appears in the activity bar (left sidebar).

## Updating

After making changes to the extension source:

```bash
cd vscode-sessions
npx tsc -p ./
npx @vscode/vsce package --allow-missing-repository
code --install-extension db-sessions-0.1.0.vsix --force
```

Then reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window").

## Usage

1. Click the **DB Sessions** icon in the activity bar
2. Click **+** to create a new session, or click an existing one to open it
3. The session opens in a VS Code terminal — select text normally, Cmd+C to copy
4. Switching to another session doesn't kill the previous one (tmux persists)
5. Right-click a session for Rename / Archive / Kill / Delete

## How It Works

- Sessions are tmux sessions (same as the web-based system)
- Instead of ttyd (browser terminal), VS Code terminals run `tmux attach-session -t db-{id}`
- The `.sessions.json` file in the project root is the shared state between this extension and the web UI
- Sessions created in either system are visible in both

## Development

To iterate on the extension without packaging:

```bash
cd vscode-sessions
# Open this folder in VS Code, press F5 to launch Extension Development Host
```
