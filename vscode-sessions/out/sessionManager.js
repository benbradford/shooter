"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TMUX_PATH = '/opt/homebrew/bin/tmux';
/**
 * Read the user's login-shell PATH so child processes spawned by VS Code
 * (which may have a stripped-down PATH when launched from Finder/Spotlight)
 * can find tools installed under ~/.toolbox/bin, /opt/homebrew/bin, etc.
 *
 * Resolved once at module load. Falls back to process.env.PATH on failure.
 */
function resolveLoginShellPath() {
    try {
        const shell = process.env.SHELL ?? '/bin/zsh';
        const out = (0, child_process_1.execSync)(`${shell} -lic 'echo -n $PATH' 2>/dev/null`, { encoding: 'utf-8' }).trim();
        if (out)
            return out;
    }
    catch { /* fall through */ }
    return process.env.PATH ?? '/usr/bin:/bin';
}
const LOGIN_PATH = resolveLoginShellPath();
const TMUX_ENV = { ...process.env, PATH: LOGIN_PATH };
class SessionManager {
    context;
    openTerminals = new Map();
    projectRoot;
    sessionFile;
    constructor(context) {
        this.context = context;
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
    getSessions() {
        if (!fs.existsSync(this.sessionFile))
            return [];
        try {
            const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
            // Check which tmux sessions are still alive
            return data.map(s => ({
                ...s,
                status: this.isTmuxAlive(s.tmuxSession) ? 'active' : 'dead',
            }));
        }
        catch {
            return [];
        }
    }
    isTmuxAlive(tmuxName) {
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} has-session -t '${tmuxName}' 2>/dev/null`, { env: TMUX_ENV });
            return true;
        }
        catch {
            return false;
        }
    }
    openSession(session) {
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
            env: { PATH: LOGIN_PATH },
        });
        terminal.show();
        this.openTerminals.set(session.id, terminal);
    }
    async createSession(provider, forceEngine) {
        const engine = forceEngine ?? await vscode.window.showQuickPick([
            { label: 'Kiro', description: 'kiro-cli chat --agent dodging-bullets', value: 'kiro' },
            { label: 'Claude', description: 'claude (Claude Code CLI)', value: 'claude' },
        ], { placeHolder: 'Select AI engine for this session' }).then(pick => pick?.value);
        if (!engine)
            return;
        const defaultLabel = `${engine === 'claude' ? 'Claude' : 'Kiro'} ${Date.now().toString(36)}`;
        const label = await vscode.window.showInputBox({
            prompt: 'Session label',
            value: defaultLabel,
        });
        if (!label)
            return;
        const id = this.generateId();
        const tmuxName = `db-${id}`;
        const shellCmd = engine === 'claude'
            ? `cd '${this.projectRoot}' && claude`
            : `cd '${this.projectRoot}' && kiro-cli chat --agent dodging-bullets`;
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} new-session -d -s '${tmuxName}' -c '${this.projectRoot}' '${shellCmd.replace(/'/g, "'\\''")}'`, { env: TMUX_ENV });
            (0, child_process_1.execSync)(`${TMUX_PATH} set-option -t '${tmuxName}' mouse on 2>/dev/null || true`, { env: TMUX_ENV });
            (0, child_process_1.execSync)(`${TMUX_PATH} set-option -t '${tmuxName}' history-limit 10000 2>/dev/null || true`, { env: TMUX_ENV });
        }
        catch (e) {
            vscode.window.showErrorMessage(`Failed to create session: ${e}`);
            return;
        }
        const session = {
            id, port: 0, label, status: 'active', archived: false,
            tmuxSession: tmuxName, createdAt: new Date().toISOString(), command: shellCmd,
            engine,
        };
        this.persistSession(session);
        provider.refresh();
        // Open it immediately
        this.openSession(session);
    }
    async renameSession(session, provider) {
        const newLabel = await vscode.window.showInputBox({
            prompt: 'New label',
            value: session.label,
        });
        if (!newLabel || newLabel === session.label)
            return;
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
    async archiveSession(session, provider) {
        const sessions = this.loadRawSessions();
        const s = sessions.find(x => x.id === session.id);
        if (s) {
            s.archived = true;
            this.saveRawSessions(sessions);
        }
        provider.refresh();
    }
    async unarchiveSession(session, provider) {
        const sessions = this.loadRawSessions();
        const s = sessions.find(x => x.id === session.id);
        if (s) {
            s.archived = false;
            this.saveRawSessions(sessions);
        }
        provider.refresh();
    }
    async killSession(session, provider) {
        const confirm = await vscode.window.showWarningMessage(`Kill session "${session.label}"?`, { modal: true }, 'Kill');
        if (confirm !== 'Kill')
            return;
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`, { env: TMUX_ENV });
        }
        catch { /* already dead */ }
        // Close VS Code terminal if open
        const terminal = this.openTerminals.get(session.id);
        if (terminal) {
            terminal.dispose();
            this.openTerminals.delete(session.id);
        }
        const sessions = this.loadRawSessions();
        const s = sessions.find(x => x.id === session.id);
        if (s) {
            s.status = 'dead';
            this.saveRawSessions(sessions);
        }
        provider.refresh();
    }
    async deleteSession(session, provider) {
        const confirm = await vscode.window.showWarningMessage(`Delete session "${session.label}"? This cannot be undone.`, { modal: true }, 'Delete');
        if (confirm !== 'Delete')
            return;
        // Kill tmux if alive
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} kill-session -t '${session.tmuxSession}' 2>/dev/null`, { env: TMUX_ENV });
        }
        catch { /* already dead */ }
        // Close VS Code terminal if open
        const terminal = this.openTerminals.get(session.id);
        if (terminal) {
            terminal.dispose();
            this.openTerminals.delete(session.id);
        }
        const sessions = this.loadRawSessions().filter(s => s.id !== session.id);
        this.saveRawSessions(sessions);
        provider.refresh();
    }
    async restartSession(session, provider) {
        // For workflow sessions (have a prompt), ask which engine to use
        let engine = session.engine ?? 'kiro';
        if (session.prompt) {
            const pick = await vscode.window.showQuickPick([
                { label: 'Kiro', description: 'kiro-cli chat --agent dodging-bullets', value: 'kiro' },
                { label: 'Claude', description: 'claude (Claude Code CLI)', value: 'claude' },
            ], { placeHolder: 'Rerun with which engine?' });
            if (!pick)
                return;
            engine = pick.value;
        }
        const tmuxName = session.tmuxSession;
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} kill-session -t '${tmuxName}' 2>/dev/null`, { env: TMUX_ENV });
        }
        catch { /* already dead */ }
        // Rebuild command — if session has a prompt, write a new temp file
        let shellCmd;
        if (session.prompt) {
            const tmpFile = path.join(this.projectRoot, 'tmp', `quick-${Date.now()}.txt`);
            const tmpDir = path.join(this.projectRoot, 'tmp');
            if (!fs.existsSync(tmpDir))
                fs.mkdirSync(tmpDir, { recursive: true });
            fs.writeFileSync(tmpFile, session.prompt, 'utf-8');
            if (engine === 'claude') {
                shellCmd = `cd '${this.projectRoot}' && claude -p "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
            }
            else {
                const agent = session.agent ?? 'dodging-bullets';
                shellCmd = `cd '${this.projectRoot}' && kiro-cli chat --agent ${agent} "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
            }
        }
        else {
            // No prompt — swap the base command if engine changed
            if (engine === 'claude' && session.command.includes('kiro-cli')) {
                shellCmd = `cd '${this.projectRoot}' && claude`;
            }
            else if (engine === 'kiro' && session.command.includes('claude')) {
                shellCmd = `cd '${this.projectRoot}' && kiro-cli chat --agent dodging-bullets`;
            }
            else {
                shellCmd = session.command;
            }
        }
        try {
            (0, child_process_1.execSync)(`${TMUX_PATH} new-session -d -s '${tmuxName}' -c '${this.projectRoot}' '${shellCmd.replace(/'/g, "'\\''")}'`, { env: TMUX_ENV });
            (0, child_process_1.execSync)(`${TMUX_PATH} set-option -t '${tmuxName}' mouse on 2>/dev/null || true`, { env: TMUX_ENV });
            (0, child_process_1.execSync)(`${TMUX_PATH} set-option -t '${tmuxName}' history-limit 10000 2>/dev/null || true`, { env: TMUX_ENV });
        }
        catch (e) {
            vscode.window.showErrorMessage(`Failed to restart session: ${e}`);
            return;
        }
        // Update the stored engine
        const sessions = this.loadRawSessions();
        const s = sessions.find(x => x.id === session.id);
        if (s) {
            s.engine = engine;
            s.command = shellCmd;
            this.saveRawSessions(sessions);
        }
        provider.refresh();
        this.openSession({ ...session, status: 'active' });
    }
    generateId() {
        return Math.random().toString(36).slice(2, 8);
    }
    loadRawSessions() {
        if (!fs.existsSync(this.sessionFile))
            return [];
        try {
            return JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        }
        catch {
            return [];
        }
    }
    saveRawSessions(sessions) {
        fs.writeFileSync(this.sessionFile, JSON.stringify(sessions, null, 2));
    }
    persistSession(session) {
        const sessions = this.loadRawSessions();
        sessions.push(session);
        this.saveRawSessions(sessions);
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map