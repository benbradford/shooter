import * as vscode from 'vscode';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { SessionsProvider } from './sessionsProvider';

export type SessionEngine = 'kiro' | 'claude';

export interface Session {
  id: string;
  port: number;
  label: string;
  status: 'active' | 'dead';
  archived: boolean;
  tmuxSession: string;
  createdAt: string;
  command: string;
  tag?: string;
  prompt?: string;
  agent?: string;
  engine?: SessionEngine;
}

const TMUX_PATH = '/opt/homebrew/bin/tmux';

/**
 * Read the user's login-shell PATH so child processes spawned by VS Code
 * (which may have a stripped-down PATH when launched from Finder/Spotlight)
 * can find tools installed under ~/.toolbox/bin, /opt/homebrew/bin, etc.
 *
 * Resolved once at module load. Falls back to process.env.PATH on failure.
 */
function resolveLoginShellPath(): string {
  try {
    const shell = process.env.SHELL ?? '/bin/zsh';
    const out = execSync(`${shell} -lic 'echo -n $PATH' 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (out) return out;
  } catch { /* fall through */ }
  return process.env.PATH ?? '/usr/bin:/bin';
}
const LOGIN_PATH = resolveLoginShellPath();
const TMUX_ENV: NodeJS.ProcessEnv = { ...process.env, PATH: LOGIN_PATH };

export class SessionManager {
  private openTerminals = new Map<string, vscode.Terminal>();
  private projectRoot: string;
  private sessionFile: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    this.sessionFile = path.join(this.projectRoot, '.sessions.json');

    // Track terminal closures
    vscode.window.onDidCloseTerminal(terminal => {
      for (const [id, t] of this.openTerminals) {
        if (t === terminal) {
          this.openTerminals.delete(id);
          break;
        }
      }
    });
  }

  getSessions(): Session[] {
    if (!fs.existsSync(this.sessionFile)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8')) as Session[];
      // Check which tmux sessions are still alive
      return data.map(s => ({
        ...s,
        status: this.isTmuxAlive(s.tmuxSession) ? 'active' as const : 'dead' as const,
      }));
    } catch {
      return [];
    }
  }

  private isTmuxAlive(tmuxName: string): boolean {
    try {
      execSync(`${TMUX_PATH} has-session -t '${tmuxName}' 2>/dev/null`, { env: TMUX_ENV });
      return true;
    } catch {
      return false;
    }
  }

  openSession(session: Session): void {
    // If terminal already open, just reveal it
    const existing = this.openTerminals.get(session.id);
    if (existing) {
      existing.show();
      return;
    }

    // Use `new-session -A` so VS Code's terminal is attached at session start —
    // critical for TUIs like Claude that render based on initial terminal capabilities.
    // -A: attach if exists, create otherwise. Idempotent.
    const terminal = vscode.window.createTerminal({
      name: session.label,
      shellPath: TMUX_PATH,
      shellArgs: ['new-session', '-A', '-s', session.tmuxSession, '-c', this.projectRoot, session.command],
      env: { PATH: LOGIN_PATH },
    });
    terminal.show();
    this.openTerminals.set(session.id, terminal);
  }

  async createSession(provider: SessionsProvider, forceEngine?: SessionEngine): Promise<void> {
    const engine = forceEngine ?? await vscode.window.showQuickPick(
      [
        { label: 'Kiro', description: 'kiro-cli chat --agent dodging-bullets', value: 'kiro' as SessionEngine },
        { label: 'Claude', description: 'claude (Claude Code CLI)', value: 'claude' as SessionEngine },
      ],
      { placeHolder: 'Select AI engine for this session' }
    ).then(pick => pick?.value);
    if (!engine) return;

    const defaultLabel = `${engine === 'claude' ? 'Claude' : 'Kiro'} ${Date.now().toString(36)}`;
    const label = await vscode.window.showInputBox({
      prompt: 'Session label',
      value: defaultLabel,
    });
    if (!label) return;

    const id = this.generateId();
    const tmuxName = `db-${id}`;
    const shellCmd = engine === 'claude'
      ? `cd '${this.projectRoot}' && claude --dangerously-skip-permissions`
      : `cd '${this.projectRoot}' && kiro-cli chat --agent dodging-bullets`;

    const session: Session = {
      id, port: 0, label, status: 'active', archived: false,
      tmuxSession: tmuxName, createdAt: new Date().toISOString(), command: shellCmd,
      engine,
    };

    this.persistSession(session);
    provider.refresh();

    // VS Code terminal creates the tmux session on demand via new-session -A
    this.openSession(session);
  }

  async renameSession(session: Session, provider: SessionsProvider): Promise<void> {
    const newLabel = await vscode.window.showInputBox({
      prompt: 'New label',
      value: session.label,
    });
    if (!newLabel || newLabel === session.label) return;

    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) {
      s.label = newLabel;
      this.saveRawSessions(sessions);
      // Update terminal name if open
      const terminal = this.openTerminals.get(session.id);
      if (terminal) {
        // Can't rename terminal in VS Code API, but it'll update on next open
      }
    }
    provider.refresh();
  }

  async archiveSession(session: Session, provider: SessionsProvider): Promise<void> {
    // Kill the tmux session — archived sessions are intended to be inactive
    try {
      execSync(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`, { env: TMUX_ENV });
    } catch { /* already dead */ }

    // Close any open VS Code terminal for this session
    const terminal = this.openTerminals.get(session.id);
    if (terminal) {
      terminal.dispose();
      this.openTerminals.delete(session.id);
    }

    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) { s.archived = true; s.status = 'dead'; this.saveRawSessions(sessions); }
    provider.refresh();
  }

  async unarchiveSession(session: Session, provider: SessionsProvider): Promise<void> {
    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) { s.archived = false; this.saveRawSessions(sessions); }
    provider.refresh();
  }

  async killSession(session: Session, provider: SessionsProvider): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Kill session "${session.label}"?`, { modal: true }, 'Kill'
    );
    if (confirm !== 'Kill') return;

    try {
      execSync(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`, { env: TMUX_ENV });
    } catch { /* already dead */ }

    // Close VS Code terminal if open
    const terminal = this.openTerminals.get(session.id);
    if (terminal) { terminal.dispose(); this.openTerminals.delete(session.id); }

    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) { s.status = 'dead'; this.saveRawSessions(sessions); }
    provider.refresh();
  }

  async deleteSession(session: Session, provider: SessionsProvider): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Delete session "${session.label}"? This cannot be undone.`, { modal: true }, 'Delete'
    );
    if (confirm !== 'Delete') return;

    // Kill tmux if alive
    try {
      execSync(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`, { env: TMUX_ENV });
    } catch { /* already dead */ }

    // Close VS Code terminal if open
    const terminal = this.openTerminals.get(session.id);
    if (terminal) { terminal.dispose(); this.openTerminals.delete(session.id); }

    const sessions = this.loadRawSessions().filter(s => s.id !== session.id);
    this.saveRawSessions(sessions);
    provider.refresh();
  }

  async restartSession(session: Session, provider: SessionsProvider): Promise<void> {
    // For workflow sessions (have a prompt), ask which engine to use
    let engine: SessionEngine = session.engine ?? 'kiro';
    if (session.prompt) {
      const pick = await vscode.window.showQuickPick(
        [
          { label: 'Kiro', description: 'kiro-cli chat --agent dodging-bullets', value: 'kiro' as SessionEngine },
          { label: 'Claude', description: 'claude (Claude Code CLI)', value: 'claude' as SessionEngine },
        ],
        { placeHolder: 'Rerun with which engine?' }
      );
      if (!pick) return;
      engine = pick.value;
    }

    const tmuxName = session.tmuxSession;

    try {
      execSync(`${TMUX_PATH} kill-session -t '${tmuxName}' 2>/dev/null`, { env: TMUX_ENV });
    } catch { /* already dead */ }

    // Close any existing VS Code terminal for this session — it's attached to the
    // tmux session we just killed and will show stale content.
    const existingTerminal = this.openTerminals.get(session.id);
    if (existingTerminal) {
      existingTerminal.dispose();
      this.openTerminals.delete(session.id);
    }

    // Rebuild command — if session has a prompt, write a new temp file
    let shellCmd: string;
    if (session.prompt) {
      const tmpFile = path.join(this.projectRoot, 'tmp', `quick-${Date.now()}.txt`);
      const tmpDir = path.join(this.projectRoot, 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpFile, session.prompt, 'utf-8');
      if (engine === 'claude') {
        shellCmd = `cd '${this.projectRoot}' && claude --dangerously-skip-permissions -p "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
      } else {
        const agent = session.agent ?? 'dodging-bullets';
        // --classic: required for kiro-cli to auto-submit the positional INPUT in the new TUI
        shellCmd = `cd '${this.projectRoot}' && kiro-cli --classic chat --agent ${agent} "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
      }
    } else {
      // No prompt — swap the base command if engine changed
      if (engine === 'claude' && session.command.includes('kiro-cli')) {
        shellCmd = `cd '${this.projectRoot}' && claude --dangerously-skip-permissions`;
      } else if (engine === 'kiro' && session.command.includes('claude')) {
        shellCmd = `cd '${this.projectRoot}' && kiro-cli chat --agent dodging-bullets`;
      } else {
        shellCmd = session.command;
      }
    }

    // Persist updated engine + command
    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) { s.engine = engine; s.command = shellCmd; this.saveRawSessions(sessions); }

    provider.refresh();
    // VS Code terminal recreates the tmux session via new-session -A
    this.openSession({ ...session, status: 'active', command: shellCmd, engine });
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 8);
  }

  private loadRawSessions(): Session[] {
    if (!fs.existsSync(this.sessionFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
    } catch { return []; }
  }

  private saveRawSessions(sessions: Session[]): void {
    fs.writeFileSync(this.sessionFile, JSON.stringify(sessions, null, 2));
  }

  private persistSession(session: Session): void {
    const sessions = this.loadRawSessions();
    sessions.push(session);
    this.saveRawSessions(sessions);
  }
}
