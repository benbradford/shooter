import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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

          console.log('🔄 Launching db-architect agent to refresh issues...');
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent db-architect "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const ttyd = spawn(ttydPath, ['--port', String(port), '--once', '--writable', 'bash', '-c', shellCmd], { stdio: 'ignore', detached: true, cwd });
          ttyd.unref();

          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url, message: 'db-architect agent launched to refresh issues' }));
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

          console.log('🧠 Launching kiro agent to recommend next issue...');
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const ttyd = spawn(ttydPath, ['--port', String(port), '--once', '--writable', 'bash', '-c', shellCmd], { stdio: 'ignore', detached: true, cwd });
          ttyd.unref();

          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url, message: 'kiro agent launched to recommend next issue' }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // Update Docs — invoke kiro-cli to update and audit docs
      server.middlewares.use('/api/tracker/update-docs', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const cwd = process.cwd();
          const message = 'update the docs';
          const tmpFile = path.resolve('tmp', `update-docs-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          console.log('📝 Launching kiro agent to update docs...');
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const ttyd = spawn(ttydPath, ['--port', String(port), '--once', '--writable', 'bash', '-c', shellCmd], { stdio: 'ignore', detached: true, cwd });
          ttyd.unref();

          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url, message: 'kiro agent launched to update docs' }));
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

          console.log('🔀 Launching kiro agent to commit changes...');
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const ttyd = spawn(ttydPath, ['--port', String(port), '--once', '--writable', 'bash', '-c', shellCmd], { stdio: 'ignore', detached: true, cwd });
          ttyd.unref();

          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url, message: 'kiro agent launched to commit changes' }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });

      // New Session — open a blank kiro-cli session in ttyd
      server.middlewares.use('/api/tracker/session', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const cwd = process.cwd();
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';
          console.log(`🚀 New kiro session on port ${port}...`);
          const ttyd = spawn(ttydPath, ['--port', String(port), '--once', '--writable', 'bash', '-c', `cd '${cwd}' && kiro-cli chat --agent dodging-bullets`], { stdio: 'ignore', detached: true, cwd });
          ttyd.unref();
          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url }));
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
          const action = body.diagnoseOnly ? 'Diagnosing' : 'Fixing';

          // Write message to temp file to avoid shell escaping issues
          const tmpFile = path.resolve('tmp', `fix-${body.id}-${Date.now()}.txt`);
          fs.mkdirSync(path.resolve('tmp'), { recursive: true });
          fs.writeFileSync(tmpFile, message, 'utf-8');

          // Find an available port for ttyd (7681+)
          const port = 7681 + Math.floor(Math.random() * 100);
          const ttydPath = '/opt/homebrew/bin/ttyd';

          console.log(`🔧 ${action} ${type} #${body.id} on port ${port}...`);

          // Launch ttyd with kiro-cli — once-mode so it exits when session ends
          const shellCmd = `cd '${cwd}' && kiro-cli chat --agent dodging-bullets "$(cat '${tmpFile}')" ; rm -f '${tmpFile}'`;
          const ttyd = spawn(ttydPath, [
            '--port', String(port),
            '--once',  // Exit ttyd after client disconnects
            '--writable',  // Allow typing in the terminal
            'bash', '-c', shellCmd,
          ], {
            stdio: 'ignore',
            detached: true,
            cwd,
          });
          ttyd.unref();

          const url = `http://localhost:${port}`;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, url, message: `kiro-cli opened for ${type} #${body.id}` }));
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
