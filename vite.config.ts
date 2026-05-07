import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';

// ── Session Registry ──────────────────────────────────────────
interface Session {
  id: string;
  port: number;
  label: string;
  status: 'active' | 'dead';
  archived: boolean;
  ttydPid: number;
  tmuxSession: string;
  createdAt: string;
  command: string;
}

const sessions: Map<string, Session> = new Map();
let nextSessionId = 1;

const SESSION_FILE = path.resolve('.sessions.json');

function persistSessions(): void {
  const data = [...sessions.values()].map(({ ttydPid, ...rest }) => rest);
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

function recoverSessions(): void {
  if (!fs.existsSync(SESSION_FILE)) return;
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as Session[];
    for (const s of data) {
      // Check if tmux session is still alive
      if (isTmuxSessionAlive(s.tmuxSession)) {
        s.status = 'active';
        s.ttydPid = 0; // Will be re-spawned on connect
      } else {
        s.status = 'dead';
        s.ttydPid = 0;
      }
      sessions.set(s.id, s);
      // Track highest ID to avoid collisions
      const num = Number.parseInt(s.id.replace('s', ''), 10);
      if (num >= nextSessionId) nextSessionId = num + 1;
    }
    console.log(`📋 Recovered ${sessions.size} sessions from disk`);
  } catch { /* corrupted file, start fresh */ }
}

recoverSessions();

function generateSessionId(): string {
  let id = `s${nextSessionId++}`;
  // Avoid collisions with existing tmux sessions
  while (isTmuxSessionAlive(`db-${id}`) || sessions.has(id)) {
    id = `s${nextSessionId++}`;
  }
  return id;
}

function isTmuxSessionAlive(tmuxName: string): boolean {
  try {
    execSync(`/opt/homebrew/bin/tmux has-session -t '${tmuxName}' 2>/dev/null`);
    return true;
  } catch { return false; }
}

function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function isPortInUse(port: number): boolean {
  try {
    execSync(`lsof -i :${port} -P -t 2>/dev/null`);
    return true;
  } catch { return false; }
}

function findAvailablePort(): number {
  let port = 7681;
  while (isPortInUse(port)) port++;
  return port;
}

function cleanupDeadSessions(): void {
  for (const [, session] of sessions) {
    if (session.status === 'active' && !isTmuxSessionAlive(session.tmuxSession)) {
      session.status = 'dead';
      // Kill orphaned ttyd if still running
      try { process.kill(session.ttydPid); } catch { /* already dead */ }
    }
  }
}

function spawnTtydForTmux(tmuxName: string, port: number): number {
  const ttydPath = '/opt/homebrew/bin/ttyd';
  const tmuxPath = '/opt/homebrew/bin/tmux';
  const ttyd = spawn(ttydPath, [
    '--port', String(port),
    '--writable',
    tmuxPath, 'attach-session', '-t', tmuxName,
  ], { stdio: 'ignore', detached: true });
  ttyd.unref();
  return ttyd.pid!;
}

function spawnSession(label: string, shellCmd: string): Session {
  const cwd = process.cwd();
  const port = findAvailablePort();
  const tmuxPath = '/opt/homebrew/bin/tmux';
  const id = generateSessionId();
  const tmuxName = `db-${id}`;

  console.log(`🚀 Session "${label}" (tmux: ${tmuxName}) on port ${port}...`);

  // Create a detached tmux session running the command
  execSync(`${tmuxPath} new-session -d -s '${tmuxName}' -c '${cwd}' '${shellCmd.replace(/'/g, "'\\''")}'`);

  // Spawn ttyd attached to the tmux session
  const ttydPid = spawnTtydForTmux(tmuxName, port);

  const session: Session = {
    id, port, label, status: 'active', archived: false,
    ttydPid, tmuxSession: tmuxName, createdAt: new Date().toISOString(), command: shellCmd,
  };
  sessions.set(id, session);
  persistSessions();
  return session;
}

/** Re-spawn ttyd for an existing tmux session (reconnect after tab switch) */
function ensureTtydRunning(session: Session): void {
  if (isProcessAlive(session.ttydPid)) return;
  // tmux is alive but ttyd died (user navigated away) — respawn ttyd
  session.ttydPid = spawnTtydForTmux(session.tmuxSession, session.port);
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

function saveLevelPlugin(): Plugin {
  return {
    name: 'save-level',
    configureServer(server) {
      server.middlewares.use('/api/save-level', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { levelName, data } = JSON.parse(body) as { levelName: string; data: string };
            const filePath = path.resolve('public/levels', `${levelName}.json`);
            if (!filePath.startsWith(path.resolve('public/levels'))) {
              res.statusCode = 400;
              res.end('Invalid level name');
              return;
            }
            fs.writeFileSync(filePath, data, 'utf-8');
            console.log(`✓ Saved level: public/levels/${levelName}.json`);
            res.statusCode = 200;
            res.end('OK');
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
        });
      });

      server.middlewares.use('/api/save-state', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { profile, data } = JSON.parse(body) as { profile?: string; data?: string };
            const fileName = profile ?? 'default';
            const filePath = path.resolve('public/states', `${fileName}.json`);
            if (!filePath.startsWith(path.resolve('public/states'))) { res.statusCode = 400; res.end('Invalid'); return; }
            fs.writeFileSync(filePath, data ?? body, 'utf-8');
            console.log(`✓ Saved state: public/states/${fileName}.json`);
            res.statusCode = 200;
            res.end('OK');
          } catch (error) { res.statusCode = 500; res.end(String(error)); }
        });
      });

      server.middlewares.use('/api/profiles', (_req, res) => {
        try {
          const statesDir = path.resolve('public/states');
          const profiles: string[] = [];
          for (let i = 1; i <= 3; i++) {
            if (fs.existsSync(path.join(statesDir, `Profile${i}.json`))) profiles.push(`Profile${i}`);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(profiles));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      server.middlewares.use('/api/create-profile', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { name } = JSON.parse(body) as { name: string };
            const statesDir = path.resolve('public/states');
            const dest = path.join(statesDir, `${name}.json`);
            if (!dest.startsWith(statesDir)) { res.statusCode = 400; res.end('Invalid'); return; }
            const template = fs.readFileSync(path.join(statesDir, 'empty.json'), 'utf-8');
            fs.writeFileSync(dest, template, 'utf-8');
            console.log(`✓ Created profile: ${name}.json`);
            res.statusCode = 200;
            res.end('OK');
          } catch (error) { res.statusCode = 500; res.end(String(error)); }
        });
      });

      server.middlewares.use('/api/delete-profile', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { name } = JSON.parse(body) as { name: string };
            const filePath = path.resolve('public/states', `${name}.json`);
            if (!filePath.startsWith(path.resolve('public/states'))) { res.statusCode = 400; res.end('Invalid'); return; }
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            console.log(`✓ Deleted profile: ${name}.json`);
            res.statusCode = 200;
            res.end('OK');
          } catch (error) { res.statusCode = 500; res.end(String(error)); }
        });
      });

      server.middlewares.use('/api/levels', (_req, res) => {
        try {
          const levelsDir = path.resolve('public/levels');
          const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));
          const levels = files.map(f => {
            const name = f.replace('.json', '');
            try {
              const content = JSON.parse(fs.readFileSync(path.join(levelsDir, f), 'utf-8')) as { width?: number; height?: number; levelTheme?: string };
              return { name, width: content.width ?? 0, height: content.height ?? 0, theme: content.levelTheme ?? 'dungeon' };
            } catch {
              return { name, width: 0, height: 0, theme: 'unknown' };
            }
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(levels));
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });

      // ── Tracker API ──────────────────────────────────────────

      const TRACKER_FILES: Record<string, { file: string; arrayName: string }> = {
        bugs: { file: 'workbench/bug-tracker.html', arrayName: 'BUGS' },
        features: { file: 'workbench/feature-tracker.html', arrayName: 'FEATURES' },
        issues: { file: 'workbench/architecture-issues.html', arrayName: 'ISSUES' },
      };

      // Update an entry's status (and optionally detail)
      server.middlewares.use('/api/tracker/update', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { tracker: string; id: number; fields: Record<string, string> };
          const tracker = TRACKER_FILES[body.tracker];
          if (!tracker) { res.statusCode = 400; res.end('Unknown tracker'); return; }

          const filePath = path.resolve(tracker.file);
          let content = fs.readFileSync(filePath, 'utf-8');

          for (const [key, value] of Object.entries(body.fields)) {
            const escaped = value.replace(/'/g, "\\'");
            const idPattern = `id: ${body.id},`;
            const idx = content.indexOf(idPattern);
            if (idx === -1) { res.statusCode = 404; res.end('Entry not found'); return; }

            // Find the full entry block by searching backwards for { and forwards for }
            const entryStart = content.lastIndexOf('{', idx);
            const entryEnd = content.indexOf('}', idx);
            if (entryStart === -1 || entryEnd === -1) { res.statusCode = 500; res.end('Parse error'); return; }
            const entryBlock = content.substring(entryStart, entryEnd + 1);

            // Try single-quoted field first, then backtick-quoted
            const singleQuoteRegex = new RegExp(`${key}:\\s*'[^']*'`);
            const backtickRegex = new RegExp(`${key}:\\s*\`[\\s\\S]*?\``);
            let updated: string;
            if (singleQuoteRegex.test(entryBlock)) {
              updated = entryBlock.replace(singleQuoteRegex, `${key}: '${escaped}'`);
            } else if (backtickRegex.test(entryBlock)) {
              updated = entryBlock.replace(backtickRegex, `${key}: '${escaped}'`);
            } else {
              continue; // Field not found in entry, skip
            }
            content = content.substring(0, entryStart) + updated + content.substring(entryStart + entryBlock.length);
          }

          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`✓ Updated ${tracker.file} entry #${body.id}`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Add a new entry
      server.middlewares.use('/api/tracker/add', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { tracker: string; entry: Record<string, unknown> };
          const tracker = TRACKER_FILES[body.tracker];
          if (!tracker) { res.statusCode = 400; res.end('Unknown tracker'); return; }

          const filePath = path.resolve(tracker.file);
          let content = fs.readFileSync(filePath, 'utf-8');

          // Find the max id
          const idMatches = [...content.matchAll(/id:\s*(\d+)/g)];
          const maxId = idMatches.reduce((max, m) => Math.max(max, Number.parseInt(m[1])), 0);
          body.entry.id = maxId + 1;
          body.entry.added = new Date().toISOString().slice(0, 10);

          // Build the entry string
          const pairs = Object.entries(body.entry).map(([k, v]) =>
            typeof v === 'string' ? `${k}: '${v.replace(/'/g, "\\'")}'` : `${k}: ${JSON.stringify(v)}`
          ).join(', ');
          const entryStr = `  { ${pairs} },`;

          // Insert before the closing ];
          const arrayEnd = content.indexOf('];', content.indexOf(`const ${tracker.arrayName}`));
          content = content.substring(0, arrayEnd) + entryStr + '\n' + content.substring(arrayEnd);

          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`✓ Added entry #${body.entry.id} to ${tracker.file}`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, id: body.entry.id }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Refresh issues — invoke db-architect agent to scan codebase and update tracker
      server.middlewares.use('/api/tracker/refresh', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { issues: string };
          const cwd = process.cwd();

          const message = `Run a full architecture review of the codebase. Use node scripts/arch-scan.mjs --top=20 to get metrics, then analyze the results.

Here are the currently tracked open issues in workbench/architecture-issues.html:

${body.issues}

Your task:
1. Verify which of the above issues have been FIXED (check the actual code). For any fixed issues, call the /api/tracker/update endpoint or directly update the ISSUES array in workbench/architecture-issues.html to set status to 'done' and update the detail field with what was done.
2. For issues that are still open, update their detail field if you have new information (e.g. the LOC count changed, the problem got worse or better).
3. Add any NEW architecture issues you discover that are not already tracked. Add them directly to the ISSUES array in workbench/architecture-issues.html following the existing format.
4. Update the "Last audit" date at the bottom of the file to today's date.

IMPORTANT: Make changes directly to workbench/architecture-issues.html. Follow the existing ISSUES array format exactly.`;

          const tmpFile = path.resolve('tmp', `refresh-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent db-architect "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🔄 Refresh Issues', shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}`, message: 'db-architect agent launched to refresh issues' }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Help Me Decide — invoke kiro-cli to recommend what to tackle next
      server.middlewares.use('/api/tracker/decide', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { issues: string };
          const cwd = process.cwd();

          const message = `Here are all open architecture issues in the project:\n\n${body.issues}\n\nAnalyze these issues and recommend which ONE I should tackle next. Consider:\n- Severity and risk\n- Fan-in (how many files depend on it)\n- Effort vs impact ratio\n- Whether fixing it unblocks other issues\n\nGive a clear recommendation with reasoning, and a suggested approach.`;

          const tmpFile = path.resolve('tmp', `decide-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🧠 Help Me Decide', shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Update Docs — invoke kiro-cli to update and audit docs
      server.middlewares.use('/api/tracker/update-docs', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const cwd = process.cwd();
          const message = `Update the docs. Follow the "When asked to update the docs" workflow in docs/README.md:
1. Run \`node scripts/extract-sessions.mjs --dry-run\` to see what's been worked on since last update
2. Update existing doc sections to reflect code changes
3. Remove obsolete information about deleted features
4. Add new information for new features
5. Keep docs accurate and minimal
6. Update multiple doc files as needed
7. Update \`.agents/summary\` to keep it in sync with doc changes
8. Ask clarifying questions if there's conflicting information or unclear behavior
9. Audit — Run the audit script, fact-check file paths/symbols/code references, review files >300 lines, remove stale info
10. Run \`node scripts/extract-sessions.mjs\` (without --dry-run) to write the timestamp`;
          const tmpFile = path.resolve('tmp', `update-docs-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('📝 Update Docs', shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Commit All — invoke kiro-cli to generate commit message, commit, and optionally push
      server.middlewares.use('/api/tracker/commit', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const cwd = process.cwd();
          const message = `Run \`git status\` and \`git diff --stat\` to see all uncommitted changes. Then:
1. Show the user a summary of what changed (files modified/added/deleted and a brief description of the work done)
2. Generate a concise commit message (conventional commit style, e.g. "feat: ...", "fix: ...", or a general summary if mixed)
3. Show the proposed commit message and ask: "Commit with this message? (y/n/edit)"
   - If yes: Run \`git add .\` then \`git commit -m"<message>"\`
   - If edit: Let the user provide a new message, then commit with that
   - If no: Stop without committing
4. After committing, ask if they want to push (y/n). If yes, run \`git push\`. If no, say done.

If there are no changes to commit, say so and stop.`;

          const tmpFile = path.resolve('tmp', `commit-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🔀 Commit All', shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // New Session — open a blank kiro-cli session
      server.middlewares.use('/api/tracker/session', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const cwd = process.cwd();
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets`;
          const session = spawnSession(`Session ${nextSessionId - 1}`, shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Fix button — invoke kiro-cli via ttyd (browser-based terminal)
      server.middlewares.use('/api/tracker/fix', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { tracker: string; id: number; title: string; detail: string; diagnoseOnly?: boolean };
          const type = body.tracker === 'bugs' ? 'bug' : body.tracker === 'issues' ? 'architecture issue' : 'feature';
          const prefix = body.diagnoseOnly
            ? `Diagnose this ${type} WITHOUT making any code changes. Explain what you understand about the issue, which files are likely involved, and how you would approach fixing it. Do NOT edit any files.\n\n`
            : `fix ${type}: `;
          const message = `${prefix}${body.title}. Details: ${body.detail}`;
          const cwd = process.cwd();
          const action = body.diagnoseOnly ? '🔍' : '🔧';

          // Write message to temp file to avoid shell escaping issues
          const tmpFile = path.resolve('tmp', `fix-${body.id}-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const label = `${action} ${type} #${body.id}: ${body.title.slice(0, 40)}`;
          const session = spawnSession(label, shellCmd);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, sessionId: session.id, url: `http://localhost:${session.port}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // ── Session Management API ──────────────────────────────────

      server.middlewares.use('/api/sessions', async (req, res, next) => {
        // Only handle exact /api/sessions path, not sub-paths like /api/sessions/create
        if (req.url && req.url !== '/' && req.url !== '') { next(); return; }
        if (req.method === 'GET') {
          cleanupDeadSessions();
          const list = [...sessions.values()].map(s => ({
            id: s.id, port: s.port, label: s.label, status: s.status,
            archived: s.archived, createdAt: s.createdAt,
          }));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(list));
          return;
        }
        res.statusCode = 405; res.end('Method not allowed');
      });

      server.middlewares.use('/api/sessions/create', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { label?: string; command?: string };
          const cwd = process.cwd();
          const shellCmd = body.command ?? `cd '${cwd}' && kiro-cli chat --agent dodging-bullets`;
          const label = body.label ?? `Session ${nextSessionId}`;
          const session = spawnSession(label, shellCmd);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, session: { id: session.id, port: session.port, label: session.label, status: session.status, archived: session.archived, createdAt: session.createdAt } }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      server.middlewares.use('/api/sessions/rename', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string; label: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          session.label = body.label;
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      server.middlewares.use('/api/sessions/archive', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          session.archived = true;
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      server.middlewares.use('/api/sessions/unarchive', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          session.archived = false;
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      server.middlewares.use('/api/sessions/kill', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          // Kill ttyd
          try { process.kill(session.ttydPid); } catch { /* already dead */ }
          // Kill tmux session
          try {
            execSync(`/opt/homebrew/bin/tmux kill-session -t '${session.tmuxSession}' 2>/dev/null`);
          } catch { /* already dead */ }
          session.status = 'dead';
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Reconnect — ensure ttyd is running for an existing session
      server.middlewares.use('/api/sessions/delete', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          if (!session.archived) { res.statusCode = 400; res.end('Can only delete archived sessions'); return; }
          // Kill if still alive
          try { process.kill(session.ttydPid); } catch { /* already dead */ }
          try { execSync(`/opt/homebrew/bin/tmux kill-session -t '${session.tmuxSession}' 2>/dev/null`); } catch { /* already dead */ }
          sessions.delete(body.id);
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Reconnect — ensure ttyd is running for an existing session
      server.middlewares.use('/api/sessions/reconnect', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          if (!isTmuxSessionAlive(session.tmuxSession)) {
            session.status = 'dead';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, reason: 'tmux session dead' }));
            return;
          }
          ensureTtydRunning(session);
          session.status = 'active';
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, port: session.port }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });
    }
  };
}

export default defineConfig({
  plugins: [saveLevelPlugin()],
  server: {
    watch: {
      ignored: ['**/workbench/**'],
    },
  },
  // Editor excluded from production builds — only index.html is built
});
