#!/usr/bin/env node

import { spawn } from 'child_process';
import net from 'net';

export async function startDevServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });
    
    proc.unref();
    
    // Wait for port to be ready
    const checkPort = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          await new Promise((res, rej) => {
            const socket = net.connect(5173, 'localhost');
            socket.on('connect', () => {
              socket.end();
              res();
            });
            socket.on('error', rej);
          });
          resolve(proc.pid);
          return;
        } catch {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      reject(new Error('Dev server failed to start'));
    };
    
    checkPort();
  });
}

export function stopDevServer(pid) {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (err) {
    console.error('Failed to stop dev server:', err.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2];
  
  if (action === 'start') {
    const pid = await startDevServer();
    console.log(`Dev server started (PID: ${pid})`);
  } else if (action === 'stop') {
    const pid = parseInt(process.argv[3]);
    stopDevServer(pid);
    console.log('Dev server stopped');
  } else {
    console.error('Usage: node dev-server-manager.js <start|stop> [pid]');
    process.exit(1);
  }
}
