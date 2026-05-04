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
        bugs: { file: 'trackers/bug-tracker.html', arrayName: 'BUGS' },
        features: { file: 'trackers/feature-tracker.html', arrayName: 'FEATURES' },
        issues: { file: 'trackers/architecture-issues.html', arrayName: 'ISSUES' },
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
            // Match: key: 'value' or key: "value" for the given id
            const escaped = value.replace(/'/g, "\\'");
            const idPattern = `id: ${body.id},`;
            const idx = content.indexOf(idPattern);
            if (idx === -1) { res.statusCode = 404; res.end('Entry not found'); return; }

            // Find the entry block (from id to next }, or }])
            const entryEnd = content.indexOf('},', idx);
            if (entryEnd === -1) { res.statusCode = 500; res.end('Parse error'); return; }
            const entryBlock = content.substring(idx, entryEnd);

            const fieldRegex = new RegExp(`${key}:\\s*'[^']*'`);
            if (fieldRegex.test(entryBlock)) {
              const updated = entryBlock.replace(fieldRegex, `${key}: '${escaped}'`);
              content = content.substring(0, idx) + updated + content.substring(idx + entryBlock.length);
            }
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

      // Fix button — invoke kiro-cli in a new terminal
      server.middlewares.use('/api/tracker/fix', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = JSON.parse(await readBody(req)) as { tracker: string; id: number; title: string; detail: string };
          const type = body.tracker === 'bugs' ? 'bug' : body.tracker === 'issues' ? 'architecture issue' : 'feature';
          const message = `fix ${type}: ${body.title}. Details: ${body.detail}`;
          const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "'\\''");
          const cwd = process.cwd();

          console.log(`🔧 Opening kiro-cli to fix ${type} #${body.id}...`);
          spawn('osascript', ['-e', `tell application "Terminal" to do script "cd '${cwd}' && kiro-cli chat --agent dodging-bullets '${escapedMessage}'"`], {
            stdio: 'ignore',
            detached: true,
          }).unref();

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, message: `kiro-cli opened in new Terminal for ${type} #${body.id}` }));
        } catch (error) { res.statusCode = 500; res.end(String(error)); }
      });
    }
  };
}

export default defineConfig({
  plugins: [saveLevelPlugin()],
  // Editor excluded from production builds — only index.html is built
});
