import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';


// Prevent child process errors from crashing the Vite server
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught exception (server kept alive):', err.message);
});
process.on('SIGPIPE', () => { /* ignore broken pipe from dead ttyd */ });

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
  tag?: string;
  prompt?: string;
  agent?: string;
  engine?: 'kiro' | 'claude';
  room?: string;
}

const sessions: Map<string, Session> = new Map();
let nextSessionId = 1;

const SESSION_FILE = path.resolve('.sessions.json');

function persistSessions(): void {
  // Read current disk state — the file is shared with the VS Code extension,
  // which writes sessions directly. We must merge rather than overwrite.
  let onDisk: Session[] = [];
  try {
    if (fs.existsSync(SESSION_FILE)) {
      onDisk = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as Session[];
    }
  } catch { /* corrupted file, proceed without disk state */ }

  const inMemoryIds = new Set(sessions.keys());

  // Sessions we own (created via the dev server). Keep dead ones too so workflow
  // entries survive — they can be re-run via the VS Code extension's restart.
  const fromMemory = [...sessions.values()].map(({ ttydPid, ...rest }) => {
    const diskEntry = onDisk.find(d => d.id === rest.id);
    // Preserve archived flag set by the VS Code extension
    if (diskEntry?.archived !== undefined) rest.archived = diskEntry.archived;
    return rest;
  });

  // Sessions on disk we don't own (created by the VS Code extension)
  const diskOnly = onDisk.filter(s => !inMemoryIds.has(s.id));

  const data = [...fromMemory, ...diskOnly];
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

function updateSessionOnDisk(id: string, fields: Partial<Pick<Session, 'archived'>>): void {
  let data: Session[] = [];
  try {
    if (fs.existsSync(SESSION_FILE)) {
      data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
  } catch { /* start fresh */ }

  const entry = data.find(s => s.id === id);
  if (entry) {
    Object.assign(entry, fields);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
  }
}

function recoverSessions(): void {
  if (!fs.existsSync(SESSION_FILE)) return;
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as Session[];
    let dropped = 0;

    // First pass: collect all sessions, checking liveness
    const candidates: Session[] = [];
    for (const s of data) {
      if (!s.port || s.port === 0) { dropped++; continue; }
      if (isTmuxSessionAlive(s.tmuxSession)) {
        s.status = 'active';
        s.ttydPid = 0;
      } else {
        s.status = 'dead';
        s.ttydPid = 0;
      }
      candidates.push(s);
    }

    // Second pass: deduplicate and clean up.
    // - Dead tagged sessions are dropped (workflows can be re-triggered)
    // - Dead untagged sessions older than 24h are dropped (stale one-off fix sessions)
    // - For live tagged sessions, keep only the newest per tag
    const seenTags = new Map<string, Session>();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const s of candidates) {
      if (s.status === 'dead') {
        if (s.tag) { dropped++; continue; }
        if (new Date(s.createdAt).getTime() < oneDayAgo) { dropped++; continue; }
      }
      if (s.tag) {
        const existing = seenTags.get(s.tag);
        if (existing) {
          if (new Date(s.createdAt) > new Date(existing.createdAt)) {
            sessions.delete(existing.id);
            dropped++;
            seenTags.set(s.tag, s);
          } else {
            dropped++;
            continue;
          }
        } else {
          seenTags.set(s.tag, s);
        }
      }
      sessions.set(s.id, s);
      const num = Number.parseInt(s.id.replace('s', ''), 10);
      if (num >= nextSessionId) nextSessionId = num + 1;
    }

    if (dropped > 0) console.log(`📋 Dropped ${dropped} stale/broken sessions during recovery`);
    console.log(`📋 Recovered ${sessions.size} sessions from disk`);
    if (dropped > 0) persistSessions();
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
  // Exclude both OS-bound ports AND ports held by sessions in the in-memory map.
  // After dev-server restart, ttyd processes die so the OS sees ports as free,
  // but recovered sessions still claim those ports — without this guard, multiple
  // sessions can be assigned the same port and collide on next reconnect.
  const claimedByMap = new Set<number>();
  for (const s of sessions.values()) {
    if (s.port > 0) claimedByMap.add(s.port);
  }
  let port = 7681;
  while (isPortInUse(port) || claimedByMap.has(port)) port++;
  return port;
}

function cleanupDeadSessions(): void {
  for (const [, session] of sessions) {
    if (session.status === 'active' && !isTmuxSessionAlive(session.tmuxSession)) {
      session.status = 'dead';
      // Kill orphaned ttyd if still running
      try { process.kill(session.ttydPid); } catch { /* already dead */ }
    }
    // Note: Do NOT delete dead sessions from the map. Workflows (with `tag`) and
    // sessions with saved prompts can be re-run via the VS Code extension's
    // restartSession. Auto-deleting them here corrupts `.sessions.json` for both
    // surfaces. Use the explicit /api/sessions/delete endpoint to remove a session.
  }
}

function spawnTtydForTmux(tmuxName: string, port: number): number {
  const ttydPath = '/opt/homebrew/bin/ttyd';
  const tmuxPath = '/opt/homebrew/bin/tmux';
  const ttyd = spawn(ttydPath, [
    '--port', String(port),
    '--writable',
    '-t', 'scrollback=10000',
    tmuxPath, 'attach-session', '-t', tmuxName,
  ], { stdio: 'ignore', detached: true, env: { ...process.env, TERM: 'xterm-256color' } });
  ttyd.on('error', () => { /* prevent unhandled error from crashing vite */ });
  ttyd.unref();
  return ttyd.pid!;
}

function spawnSession(label: string, shellCmd: string, tag?: string): Session {
  const cwd = process.cwd();

  // Auto-kill any existing session with the same tag — this makes workflow
  // sessions (Update Docs, Commit All, etc.) singletons. Without this, every
  // click of a workflow button creates a fresh session and the list grows.
  // Also match by label as a fallback — catches older sessions from before
  // tags existed, which would otherwise stick around forever.
  if (tag) {
    for (const [, existing] of sessions) {
      const matches = existing.tag === tag || (!existing.tag && existing.label === label);
      if (!matches) continue;
      if (existing.ttydPid > 0) { try { process.kill(existing.ttydPid); } catch { /* already dead */ } }
      try { execSync(`/opt/homebrew/bin/tmux kill-session -t '${existing.tmuxSession}' 2>/dev/null`); } catch { /* already dead */ }
      sessions.delete(existing.id);
    }
  }

  const port = findAvailablePort();
  const tmuxPath = '/opt/homebrew/bin/tmux';
  const id = generateSessionId();
  const tmuxName = `db-${id}`;

  console.log(`🚀 Session "${label}" (tmux: ${tmuxName}) on port ${port}...`);

  // Create a detached tmux session running the command
  execSync(`${tmuxPath} new-session -d -s '${tmuxName}' -c '${cwd}' '${shellCmd.replace(/'/g, "'\\''")}'`);
  // Enable mouse mode for scroll support
  execSync(`${tmuxPath} set-option -t '${tmuxName}' mouse on 2>/dev/null || true`);
  execSync(`${tmuxPath} set-option -t '${tmuxName}' history-limit 10000 2>/dev/null || true`);

  // Spawn ttyd attached to the tmux session
  const ttydPid = spawnTtydForTmux(tmuxName, port);

  const session: Session = {
    id, port, label, status: 'active', archived: false,
    ttydPid, tmuxSession: tmuxName, createdAt: new Date().toISOString(), command: shellCmd,
  };
  if (tag) session.tag = tag;
  sessions.set(id, session);
  persistSessions();
  return session;
}

/** Re-spawn ttyd for an existing tmux session (reconnect after tab switch) */
function ensureTtydRunning(session: Session): void {
  if (isProcessAlive(session.ttydPid)) return;
  // If our stored port is now occupied by another process (e.g. another session
  // grabbed it after dev-server restart), reassign to a fresh port. Otherwise
  // ttyd would silently fail to bind and the iframe would connect to whichever
  // session got there first, making this session look "broken".
  if (isPortInUse(session.port) || session.port === 0) {
    session.port = findAvailablePort();
  }
  // Ensure mouse mode is on (may be missing for sessions created before this fix)
  try { execSync(`/opt/homebrew/bin/tmux set-option -t '${session.tmuxSession}' mouse on`); } catch { /* session may be dead */ }
  // tmux is alive but ttyd died (user navigated away) — respawn ttyd
  session.ttydPid = spawnTtydForTmux(session.tmuxSession, session.port);
  persistSessions();
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

      server.middlewares.use('/api/paint', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const levelName = url.searchParams.get('level');
        if (!levelName) { res.statusCode = 400; res.end('Missing level param'); return; }
        const filePath = path.resolve('public/levels', `${levelName}_paint.png`);
        if (!filePath.startsWith(path.resolve('public/levels'))) {
          res.statusCode = 400; res.end('Invalid level name'); return;
        }
        if (!fs.existsSync(filePath)) { res.statusCode = 404; res.end('Not found'); return; }
        const data = fs.readFileSync(filePath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.statusCode = 200;
        res.end(data);
      });

      server.middlewares.use('/api/save-paint', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { levelName, data } = JSON.parse(body) as { levelName: string; data: string | null };
            const filePath = path.resolve('public/levels', `${levelName}_paint.png`);
            if (!filePath.startsWith(path.resolve('public/levels'))) {
              res.statusCode = 400; res.end('Invalid level name'); return;
            }
            if (data === null) {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } else {
              fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
            }
            console.log(`✓ Saved paint: public/levels/${levelName}_paint.png`);
            res.statusCode = 200; res.end('OK');
          } catch (error) {
            res.statusCode = 500; res.end(String(error));
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

          const shellCmd = `cd '${cwd}' && kiro-cli --classic chat --agent db-architect "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🔄 Refresh Issues', shellCmd, 'workflow:refresh-issues');

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

          const shellCmd = `cd '${cwd}' && kiro-cli --classic chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🧠 Help Me Decide', shellCmd, 'workflow:decide');

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

          const shellCmd = `cd '${cwd}' && kiro-cli --classic chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('📝 Update Docs', shellCmd, 'workflow:update-docs');

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

          const shellCmd = `cd '${cwd}' && kiro-cli --classic chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const session = spawnSession('🔀 Commit All', shellCmd, 'workflow:commit-all');

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

      // Lint — run eslint and return categorized results
      server.middlewares.use('/api/lint', async (_req, res) => {
        try {
          const { execSync } = await import('child_process');
          const cwd = process.cwd();
          let output: string;
          try {
            output = execSync('npx eslint src --ext .ts --format json', { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
          } catch (e: unknown) {
            // eslint exits with code 1 when there are warnings/errors but still produces valid JSON
            output = (e as { stdout?: string }).stdout || '[]';
          }
          const files = JSON.parse(output) as Array<{ filePath: string; messages: Array<{ ruleId: string; severity: number; message: string; line: number }> }>;
          const ruleMap = new Map<string, { rule: string; severity: string; count: number; message: string; files: Array<{ path: string; line: number }> }>();
          for (const file of files) {
            const relPath = file.filePath.replace(cwd + '/', '');
            for (const msg of file.messages) {
              const rule = msg.ruleId || 'unknown';
              const severity = msg.severity === 2 ? 'error' : 'warning';
              if (!ruleMap.has(rule)) {
                ruleMap.set(rule, { rule, severity, count: 0, message: msg.message, files: [] });
              }
              const entry = ruleMap.get(rule)!;
              entry.count++;
              if (msg.severity === 2) entry.severity = 'error';
              entry.files.push({ path: relPath, line: msg.line });
            }
          }
          const result = [...ruleMap.values()].sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1) || b.count - a.count);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: String(error) })); }
      });

      // Fix button — invoke kiro-cli or claude via ttyd (browser-based terminal)
      server.middlewares.use('/api/tracker/fix', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { tracker: string; id: number; title: string; detail: string; diagnoseOnly?: boolean; engine?: 'kiro' | 'claude' };
          const engine = body.engine ?? 'kiro';
          const type = body.tracker === 'bugs' ? 'bug' : body.tracker === 'issues' ? 'architecture issue' : body.tracker === 'lint' ? 'lint' : 'feature';
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

          const shellCmd = engine === 'claude'
            ? `cd '${cwd}' && claude --dangerously-skip-permissions "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`
            : `cd '${cwd}' && kiro-cli --classic chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const engineTag = engine === 'claude' ? '🟣' : '🤖';
          const label = `${action}${engineTag} ${type} #${body.id}: ${body.title.slice(0, 40)}`;
          // Tag scoped to (type, id) so re-fixing the same issue replaces the
          // old session instead of stacking duplicates.
          const session = spawnSession(label, shellCmd, `fix:${type}-${body.id}`);

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
            archived: s.archived, createdAt: s.createdAt, tag: s.tag, engine: s.engine,
            room: s.room,
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
          const body = JSON.parse(await readBody(req)) as { label?: string; command?: string; tag?: string; prompt?: string; agent?: string; engine?: 'kiro' | 'claude'; room?: string };
          const cwd = process.cwd();
          const engine = body.engine ?? 'kiro';

          // Note: auto-kill of same-tag sessions now lives inside spawnSession itself.

          let shellCmd: string;
          if (body.prompt) {
            const agent = body.agent ?? 'dodging-bullets';
            const tmpFile = path.resolve('tmp', `quick-${Date.now()}.txt`);
            fs.mkdirSync(path.resolve('tmp'), { recursive: true });
            fs.writeFileSync(tmpFile, body.prompt, 'utf-8');
            shellCmd = engine === 'claude'
              ? `cd '${cwd}' && claude --dangerously-skip-permissions "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`
              : `cd '${cwd}' && kiro-cli --classic chat --agent ${agent} "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          } else {
            shellCmd = body.command
              ?? (engine === 'claude'
                ? `cd '${cwd}' && claude`
                : `cd '${cwd}' && kiro-cli chat --agent dodging-bullets`);
          }

          const label = body.label ?? `Session ${nextSessionId}`;
          const session = spawnSession(label, shellCmd, body.tag);
          session.engine = engine;
          if (body.room) session.room = body.room;
          if (body.prompt) session.prompt = body.prompt;
          if (body.agent) session.agent = body.agent;
          persistSessions();

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
          updateSessionOnDisk(body.id, { archived: true });
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
          updateSessionOnDisk(body.id, { archived: false });
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
          if (session.ttydPid > 0) { try { process.kill(session.ttydPid); } catch { /* already dead */ } }
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

      // Cleanup dead — bulk-remove all sessions that are no longer running.
      // Useful for clearing the list after dev-server restarts have left
      // behind unrecoverable entries.
      server.middlewares.use('/api/sessions/cleanup-dead', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          cleanupDeadSessions(); // refresh status flags first
          let removed = 0;
          for (const [id, s] of sessions) {
            if (s.status !== 'dead' && s.port > 0) continue;
            // Belt-and-suspenders: try to kill anything that might still be lingering
            if (s.ttydPid > 0) { try { process.kill(s.ttydPid); } catch { /* already dead */ } }
            try { execSync(`/opt/homebrew/bin/tmux kill-session -t '${s.tmuxSession}' 2>/dev/null`); } catch { /* already dead */ }
            sessions.delete(id);
            removed++;
          }
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, removed }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Reconnect — ensure ttyd is running for an existing session
      server.middlewares.use('/api/sessions/delete', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (session) {
            // Kill if still alive
            if (session.ttydPid > 0) try { process.kill(session.ttydPid); } catch { /* already dead */ }
            if (session.tmuxSession) try { execSync(`/opt/homebrew/bin/tmux kill-session -t '${session.tmuxSession}' 2>/dev/null`); } catch { /* already dead */ }
            sessions.delete(body.id);
          } else {
            // Session not in Map (orphaned from previous server instance) — try tmux cleanup
            try { execSync(`/opt/homebrew/bin/tmux kill-session -t 'db-${body.id}' 2>/dev/null`); } catch { /* already dead */ }
          }
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

      // Update session fields (room, etc.)
      server.middlewares.use('/api/sessions/update', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string; fields: Record<string, unknown> };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          if (body.fields.room !== undefined) session.room = body.fields.room as string;
          if (body.fields.label !== undefined) session.label = body.fields.label as string;
          persistSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Git diff API
      server.middlewares.use('/api/git/diff', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const stat = execSync('git diff --stat', { encoding: 'utf-8', cwd: process.cwd() });
          const diff = execSync('git diff', { encoding: 'utf-8', cwd: process.cwd() });
          // Parse diff into per-file chunks
          const files: { name: string; diff: string }[] = [];
          const parts = diff.split(/^diff --git /m);
          for (let i = 1; i < parts.length; i++) {
            const lines = parts[i].split('\n');
            const match = lines[0].match(/a\/(.+?) b\//);
            const name = match ? match[1] : `file ${i}`;
            files.push({ name, diff: 'diff --git ' + parts[i] });
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ stat, files }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Capture terminal content for copy mode
      server.middlewares.use('/api/sessions/capture', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { id: string };
          const session = sessions.get(body.id);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
          const tmuxPath = '/opt/homebrew/bin/tmux';
          const text = execSync(`${tmuxPath} capture-pane -t '${session.tmuxSession}' -p -S -500`, { encoding: 'utf-8' });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ text }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

    }
  };
}

export default defineConfig({
  plugins: [saveLevelPlugin()],
  server: {
    watch: {
      ignored: ['**/workbench/**', '**/.sessions.json', '**/tmp/**', '**/public/states/**', '**/public/levels/**'],
    },
  },
  // Editor excluded from production builds — only index.html is built
});
