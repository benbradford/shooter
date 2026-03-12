#!/usr/bin/env node

import fs from 'fs';

export function readTask(tasksFilePath, taskId) {
  const content = fs.readFileSync(tasksFilePath, 'utf8');
  const lines = content.split('\n');
  
  const taskPattern = new RegExp(`^### Task ${taskId.replace('.', '\\.')}:`);
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) {
      startLine = i;
    } else if (startLine !== -1 && /^### Task \d+\.\d+:/.test(lines[i])) {
      endLine = i;
      break;
    }
  }
  
  if (startLine === -1) {
    throw new Error(`Task ${taskId} not found in ${tasksFilePath}`);
  }
  
  if (endLine === -1) endLine = lines.length;
  
  const taskLines = lines.slice(startLine, endLine);
  const taskName = taskLines[0].replace(/^### Task \d+\.\d+: /, '').replace(/ ✅$/, '');
  
  const files = [];
  const subtasks = [];
  let dependencies = 'None';
  let estimatedTime = '';
  
  for (const line of taskLines) {
    if (line.startsWith('**File')) {
      const matches = line.match(/`([^`]+)`/g);
      if (matches) {
        files.push(...matches.map(m => m.replace(/`/g, '')));
      }
    }
    if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
      subtasks.push({
        text: line.replace(/^- \[[x ]\] /, ''),
        complete: line.includes('[x]')
      });
    }
    if (line.startsWith('**Dependencies**:')) {
      dependencies = line.replace('**Dependencies**: ', '');
    }
    if (line.startsWith('**Estimated Time**:')) {
      estimatedTime = line.replace('**Estimated Time**: ', '');
    }
  }
  
  return {
    id: taskId,
    name: taskName,
    files,
    subtasks,
    dependencies,
    estimatedTime,
    content: taskLines.join('\n')
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tasksFile, taskId] = process.argv.slice(2);
  if (!tasksFile || !taskId) {
    console.error('Usage: node task-reader.js <tasks.md> <taskId>');
    process.exit(1);
  }
  console.log(JSON.stringify(readTask(tasksFile, taskId), null, 2));
}
