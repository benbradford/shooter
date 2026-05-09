import * as vscode from 'vscode';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { SessionsProvider } from './sessionsProvider';

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
}

const TMUX_PATH = '/opt/homebrew/bin/tmux';

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
      execSync(`${TMUX_PATH} has-session -t '${tmuxName}' 2>/dev/null`);
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

    // Create a VS Code terminal that attaches to the tmux session
    const terminal = vscode.window.createTerminal({
      name: session.label,
      shellPath: TMUX_PATH,
      shellArgs: ['attach-session', '-t', session.tmuxSession],
      cwd: this.projectRoot,
    });
    terminal.show();
    this.openTerminals.set(session.id, terminal);
  }

  async createSession(provider: SessionsProvider): Promise<void> {
    const label = await vscode.window.showInputBox({
      prompt: 'Session label',
      value: `Session ${Date.now().toString(36)}`,
    });
    if (!label) return;

    const id = this.generateId();
    const tmuxName = `db-${id}`;
    const shellCmd = `cd '${this.projectRoot}' && kiro-cli chat --agent dodging-bullets`;

    try {
      execSync(`${TMUX_PATH} new-session -d -s '${tmuxName}' -c '${this.projectRoot}' '${shellCmd.replace(/'/g, "'\\''")}'`);
      execSync(`${TMUX_PATH} set-option -t '${tmuxName}' mouse on 2>/dev/null || true`);
      execSync(`${TMUX_PATH} set-option -t '${tmuxName}' history-limit 10000`);
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to create session: ${e}`);
      return;
    }

    const session: Session = {
      id, port: 0, label, status: 'active', archived: false,
      tmuxSession: tmuxName, createdAt: new Date().toISOString(), command: shellCmd,
    };

    this.persistSession(session);
    provider.refresh();

    // Open it immediately
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
    const sessions = this.loadRawSessions();
    const s = sessions.find(x => x.id === session.id);
    if (s) { s.archived = true; this.saveRawSessions(sessions); }
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
      execSync(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`);
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
      execSync(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`);
    } catch { /* already dead */ }

    // Close VS Code terminal if open
    const terminal = this.openTerminals.get(session.id);
    if (terminal) { terminal.dispose(); this.openTerminals.delete(session.id); }

    const sessions = this.loadRawSessions().filter(s => s.id !== session.id);
    this.saveRawSessions(sessions);
    provider.refresh();
  }

  restartSession(session: Session, provider: SessionsProvider): void {
    const tmuxName = session.tmuxSession;

    try {
      execSync(`${TMUX_PATH} kill-session -t '${tmuxName}' 2>/dev/null`);
    } catch { /* already dead */ }

    // Rebuild command — if session has a prompt, write a new temp file
    let shellCmd: string;
    if (session.prompt) {
      const agent = session.agent ?? 'dodging-bullets';
      const tmpFile = path.join(this.projectRoot, 'tmp', `quick-${Date.now()}.txt`);
      const tmpDir = path.join(this.projectRoot, 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpFile, session.prompt, 'utf-8');
      shellCmd = `cd '${this.projectRoot}' && kiro-cli chat --agent ${agent} "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
    } else {
      shellCmd = session.command;
    }

    try {
      execSync(`${TMUX_PATH} new-session -d -s '${tmuxName}' -c '${this.projectRoot}' '${shellCmd.replace(/'/g, "'\\''")}'`);
      execSync(`${TMUX_PATH} set-option -t '${tmuxName}' mouse on 2>/dev/null || true`);
      execSync(`${TMUX_PATH} set-option -t '${tmuxName}' history-limit 10000`);
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to restart session: ${e}`);
      return;
    }

    provider.refresh();
    this.openSession({ ...session, status: 'active' });
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
