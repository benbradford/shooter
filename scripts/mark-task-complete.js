#!/usr/bin/env node

import fs from 'fs';

export function markTaskComplete(tasksFilePath, taskId, actualTime) {
  const content = fs.readFileSync(tasksFilePath, 'utf8');
  const lines = content.split('\n');
  
  const taskPattern = new RegExp(`^### Task ${taskId.replace('.', '\\.')}:`);
  let taskLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) {
      taskLineIndex = i;
      break;
    }
  }
  
  if (taskLineIndex === -1) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Add ✅ to task header if not present
  if (!lines[taskLineIndex].includes('✅')) {
    lines[taskLineIndex] = lines[taskLineIndex].replace(/:$/, ': ✅');
  }
  
  // Mark all subtasks complete
  for (let i = taskLineIndex; i < lines.length; i++) {
    if (/^### Task \d+\.\d+:/.test(lines[i]) && i !== taskLineIndex) {
      break;
    }
    if (lines[i].startsWith('- [ ]')) {
      lines[i] = lines[i].replace('- [ ]', '- [x]');
    }
  }
  
  // Add actual time if provided
  if (actualTime) {
    for (let i = taskLineIndex; i < lines.length; i++) {
      if (lines[i].startsWith('**Estimated Time**:')) {
        if (!lines[i + 1]?.startsWith('**Actual Time**:')) {
          lines.splice(i + 1, 0, `**Actual Time**: ${actualTime}`);
        }
        break;
      }
    }
  }
  
  fs.writeFileSync(tasksFilePath, lines.join('\n'), 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tasksFile, taskId, actualTime] = process.argv.slice(2);
  if (!tasksFile || !taskId) {
    console.error('Usage: node mark-task-complete.js <tasks.md> <taskId> [actualTime]');
    process.exit(1);
  }
  markTaskComplete(tasksFile, taskId, actualTime);
  console.log(`✅ Task ${taskId} marked complete`);
}
