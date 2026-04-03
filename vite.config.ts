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
    }
  };
}

export default defineConfig({
  plugins: [saveLevelPlugin()]
});
