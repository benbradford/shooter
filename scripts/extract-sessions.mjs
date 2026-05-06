#!/usr/bin/env node
/**
 * Extract and summarize kiro session history for doc updates.
 * 
 * Usage:
 *   node scripts/extract-sessions.mjs [--since ISO_TIMESTAMP] [--limit N]
 * 
 * Reads ~/.kiro/sessions/cli/*.json, filters by cwd containing "dodging-bullets",
 * filters by updated_at since stored timestamp, extracts user prompts from .jsonl files,
 * and outputs a concise summary of: requests, problems, fixes, missing context, patterns.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const SESSIONS_DIR = join(homedir(), '.kiro', 'sessions', 'cli');
const TIMESTAMP_FILE = resolve('tmp/last-doc-update-timestamp.txt');
const CWD_FILTER = 'dodging-bullets';
const DEFAULT_LIMIT = 50;
const MAX_PROMPT_LENGTH = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  let since = null;
  let limit = DEFAULT_LIMIT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--since' && args[i + 1]) {
      since = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[++i], 10);
    }
  }

  if (!since && existsSync(TIMESTAMP_FILE)) {
    since = readFileSync(TIMESTAMP_FILE, 'utf-8').trim();
  }

  return { since, limit };
}

function loadSessionMetadata() {
  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json') && !f.includes('/'));
  const sessions = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8'));
      if (data.cwd && data.cwd.includes(CWD_FILTER)) {
        sessions.push(data);
      }
    } catch {
      // Skip malformed files
    }
  }

  return sessions;
}

function filterSessions(sessions, since, limit) {
  let filtered = sessions;

  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter(s => new Date(s.updated_at) > sinceDate);
  }

  // Sort by updated_at descending (most recent first)
  filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return filtered.slice(0, limit);
}

function extractUserPrompts(sessionId) {
  const jsonlPath = join(SESSIONS_DIR, `${sessionId}.jsonl`);
  if (!existsSync(jsonlPath)) return [];

  const content = readFileSync(jsonlPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const prompts = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.kind === 'Prompt' && entry.data?.content) {
        for (const item of entry.data.content) {
          if (item.kind === 'text' && item.data) {
            const text = item.data.length > MAX_PROMPT_LENGTH
              ? item.data.slice(0, MAX_PROMPT_LENGTH) + '...'
              : item.data;
            prompts.push(text);
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return prompts;
}

function categorizePrompt(text) {
  const lower = text.toLowerCase();
  if (lower.includes('bug') || lower.includes('broken') || lower.includes('not working') || lower.includes('fix') || lower.includes('error') || lower.includes('crash')) {
    return 'problem';
  }
  if (lower.includes('design') || lower.includes('spec') || lower.includes('plan')) {
    return 'design';
  }
  if (lower.includes('implement') || lower.includes('add') || lower.includes('create')) {
    return 'feature';
  }
  if (lower.includes('update') || lower.includes('doc') || lower.includes('refactor')) {
    return 'maintenance';
  }
  return 'other';
}

function summarizeSessions(sessions) {
  const summary = {
    totalSessions: sessions.length,
    dateRange: { earliest: null, latest: null },
    categories: { problem: [], feature: [], design: [], maintenance: [], other: [] },
    titles: [],
    frequentTopics: new Map(),
  };

  for (const session of sessions) {
    if (!summary.dateRange.earliest || session.created_at < summary.dateRange.earliest) {
      summary.dateRange.earliest = session.created_at;
    }
    if (!summary.dateRange.latest || session.updated_at > summary.dateRange.latest) {
      summary.dateRange.latest = session.updated_at;
    }

    // Use title as quick summary
    if (session.title) {
      summary.titles.push(session.title.slice(0, 120));
    }

    // Extract and categorize user prompts
    const prompts = extractUserPrompts(session.session_id);
    for (const prompt of prompts) {
      const category = categorizePrompt(prompt);
      if (summary.categories[category].length < 30) {
        summary.categories[category].push(prompt);
      }

      // Track frequent keywords
      const keywords = prompt.toLowerCase().match(/\b(editor|entity|level|collision|sprite|animation|pathfinding|asset|sound|hud|joystick|pet|escort|laser|pushable|lever|npc|interaction|lua|world\s?state|save|load|transition|theme|water|void|jump|punch|super\s?punch|breakable|trigger|event|cell\s?modifier)\b/g);
      if (keywords) {
        for (const kw of keywords) {
          summary.frequentTopics.set(kw, (summary.frequentTopics.get(kw) || 0) + 1);
        }
      }
    }
  }

  return summary;
}

function formatOutput(summary) {
  const lines = [];

  lines.push('# Session Analysis Summary');
  lines.push(`\nAnalyzed ${summary.totalSessions} sessions`);
  if (summary.dateRange.earliest) {
    lines.push(`Period: ${summary.dateRange.earliest?.slice(0, 10)} to ${summary.dateRange.latest?.slice(0, 10)}`);
  }

  // Top topics
  const sortedTopics = [...summary.frequentTopics.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (sortedTopics.length > 0) {
    lines.push('\n## Most Active Topics');
    for (const [topic, count] of sortedTopics) {
      lines.push(`- ${topic}: ${count} mentions`);
    }
  }

  // Problems encountered
  if (summary.categories.problem.length > 0) {
    lines.push('\n## Problems & Bugs Encountered');
    const unique = [...new Set(summary.categories.problem.map(p => p.slice(0, 200)))].slice(0, 15);
    for (const p of unique) {
      lines.push(`- ${p}`);
    }
  }

  // Features implemented
  if (summary.categories.feature.length > 0) {
    lines.push('\n## Features Implemented');
    const unique = [...new Set(summary.categories.feature.map(p => p.slice(0, 200)))].slice(0, 15);
    for (const p of unique) {
      lines.push(`- ${p}`);
    }
  }

  // Design work
  if (summary.categories.design.length > 0) {
    lines.push('\n## Design Work');
    const unique = [...new Set(summary.categories.design.map(p => p.slice(0, 200)))].slice(0, 10);
    for (const p of unique) {
      lines.push(`- ${p}`);
    }
  }

  // Session titles (recent activity overview)
  if (summary.titles.length > 0) {
    lines.push('\n## Recent Session Titles');
    const unique = [...new Set(summary.titles)].slice(0, 20);
    for (const t of unique) {
      lines.push(`- ${t}`);
    }
  }

  return lines.join('\n');
}

function writeTimestamp() {
  const dir = resolve('tmp');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(TIMESTAMP_FILE, new Date().toISOString());
}

// Main
const { since, limit } = parseArgs();
const allSessions = loadSessionMetadata();
const filtered = filterSessions(allSessions, since, limit);

if (filtered.length === 0) {
  console.log('No new sessions found since last update.');
  if (since) console.log(`(since: ${since})`);
  console.log(`Total dodging-bullets sessions: ${allSessions.length}`);
  process.exit(0);
}

const summary = summarizeSessions(filtered);
const output = formatOutput(summary);
console.log(output);

// Write timestamp marker
if (!process.argv.includes('--dry-run')) {
  writeTimestamp();
  console.log(`\n---\nTimestamp updated: ${TIMESTAMP_FILE}`);
}
