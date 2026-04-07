import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

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
    }
  };
}

export default defineConfig({
  plugins: [saveLevelPlugin()],
  // Editor excluded from production builds — only index.html is built
});
