#!/usr/bin/env node
/**
 * Extract and summarize kiro + claude session history for doc updates.
 *
 * Usage:
 *   node scripts/extract-sessions.mjs [--since ISO_TIMESTAMP] [--limit N]
 *
 * Reads sessions from BOTH:
 *   - ~/.kiro/sessions/cli/*.json (kiro-cli)
 *   - ~/.claude/projects/{encoded-cwd}/*.jsonl (Claude Code)
 *
 * Filters by cwd containing "dodging-bullets" (kiro) or by being in the project's
 * Claude projects directory. Filters by updated_at since stored timestamp, extracts
 * user prompts, and outputs a concise summary of: requests, problems, fixes, patterns.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const KIRO_SESSIONS_DIR = join(homedir(), '.kiro', 'sessions', 'cli');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
// Claude encodes cwd by replacing '/' with '-' (so leading '/' becomes leading '-')
const CLAUDE_PROJECT_DIR = join(CLAUDE_PROJECTS_DIR, process.cwd().split('/').join('-'));
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

function loadKiroSessions() {
  if (!existsSync(KIRO_SESSIONS_DIR)) return [];
  const files = readdirSync(KIRO_SESSIONS_DIR).filter(f => f.endsWith('.json') && !f.includes('/'));
  const sessions = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(KIRO_SESSIONS_DIR, file), 'utf-8'));
      if (data.cwd && data.cwd.includes(CWD_FILTER)) {
        sessions.push({
          source: 'kiro',
          session_id: data.session_id,
          cwd: data.cwd,
          created_at: data.created_at,
          updated_at: data.updated_at,
          title: data.title,
          _jsonlPath: join(KIRO_SESSIONS_DIR, `${data.session_id}.jsonl`),
        });
      }
    } catch {
      // Skip malformed files
    }
  }

  return sessions;
}

function loadClaudeSessions() {
  if (!existsSync(CLAUDE_PROJECT_DIR)) return [];
  const files = readdirSync(CLAUDE_PROJECT_DIR).filter(f => f.endsWith('.jsonl'));
  const sessions = [];

  for (const file of files) {
    const fullPath = join(CLAUDE_PROJECT_DIR, file);
    try {
      // Use file mtime as updated_at (cheap). created_at and title get refined
      // when prompts are extracted. This keeps metadata loading fast.
      const stat = statSync(fullPath);
      const sessionId = file.replace(/\.jsonl$/, '');
      sessions.push({
        source: 'claude',
        session_id: sessionId,
        cwd: process.cwd(),
        created_at: stat.birthtime?.toISOString() ?? stat.mtime.toISOString(),
        updated_at: stat.mtime.toISOString(),
        title: null, // Filled in by extractUserPrompts
        _jsonlPath: fullPath,
      });
    } catch {
      // Skip unreadable files
    }
  }

  return sessions;
}

function loadAllSessions() {
  return [...loadKiroSessions(), ...loadClaudeSessions()];
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

function extractUserPrompts(session) {
  const jsonlPath = session._jsonlPath;
  if (!jsonlPath || !existsSync(jsonlPath)) return [];

  const content = readFileSync(jsonlPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const prompts = [];

  if (session.source === 'kiro') {
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.kind === 'Prompt' && entry.data?.content) {
          for (const item of entry.data.content) {
            if (item.kind === 'text' && item.data) {
              prompts.push(truncate(item.data));
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
    return prompts;
  }

  // Claude: extract user prompts AND refine title/created_at as a side effect
  let firstTimestamp = null;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      if (entry.type === 'ai-title' && entry.aiTitle && !session.title) {
        session.title = entry.aiTitle;
        continue;
      }

      if (entry.type !== 'user' || !entry.message) continue;

      // Skip side-chain (subagent) prompts to avoid double-counting
      if (entry.isSidechain) continue;

      if (entry.timestamp && !firstTimestamp) firstTimestamp = entry.timestamp;

      const content = entry.message.content;
      if (typeof content === 'string' && content.trim()) {
        prompts.push(truncate(content));
      } else if (Array.isArray(content)) {
        for (const item of content) {
          // Skip tool results (they look like user messages but aren't real prompts)
          if (item?.type === 'tool_result') continue;
          if (item?.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
            prompts.push(truncate(item.text));
          } else if (typeof item === 'string' && item.trim()) {
            prompts.push(truncate(item));
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (firstTimestamp) session.created_at = firstTimestamp;
  if (!session.title && prompts.length > 0) session.title = prompts[0].slice(0, 120);

  return prompts;
}

function truncate(text) {
  return text.length > MAX_PROMPT_LENGTH ? text.slice(0, MAX_PROMPT_LENGTH) + '...' : text;
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
    bySource: { kiro: 0, claude: 0 },
    dateRange: { earliest: null, latest: null },
    categories: { problem: [], feature: [], design: [], maintenance: [], other: [] },
    titles: [],
    frequentTopics: new Map(),
  };

  for (const session of sessions) {
    summary.bySource[session.source] = (summary.bySource[session.source] || 0) + 1;

    // Extract prompts FIRST so Claude's title/created_at get refined before we read them
    const prompts = extractUserPrompts(session);

    if (!summary.dateRange.earliest || session.created_at < summary.dateRange.earliest) {
      summary.dateRange.earliest = session.created_at;
    }
    if (!summary.dateRange.latest || session.updated_at > summary.dateRange.latest) {
      summary.dateRange.latest = session.updated_at;
    }

    if (session.title) {
      summary.titles.push(`[${session.source}] ${session.title.slice(0, 120)}`);
    }

    for (const prompt of prompts) {
      const category = categorizePrompt(prompt);
      if (summary.categories[category].length < 30) {
        summary.categories[category].push(prompt);
      }

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
  lines.push(`\nAnalyzed ${summary.totalSessions} sessions (kiro: ${summary.bySource.kiro || 0}, claude: ${summary.bySource.claude || 0})`);
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

function writeTimestamp(sessions) {
  const dir = resolve('tmp');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  // Use the latest session's updated_at (not wall clock) to avoid gap where
  // sessions completing during our execution get skipped on next run
  const latest = sessions.reduce((max, s) => {
    const t = new Date(s.updated_at);
    return t > max ? t : max;
  }, new Date(0));
  writeFileSync(TIMESTAMP_FILE, latest.toISOString());
}

// Main
const { since, limit } = parseArgs();
const allSessions = loadAllSessions();
const filtered = filterSessions(allSessions, since, limit);

if (filtered.length === 0) {
  console.log('No new sessions found since last update.');
  if (since) console.log(`(since: ${since})`);
  const kiroCount = allSessions.filter(s => s.source === 'kiro').length;
  const claudeCount = allSessions.filter(s => s.source === 'claude').length;
  console.log(`Total dodging-bullets sessions: ${allSessions.length} (kiro: ${kiroCount}, claude: ${claudeCount})`);
  process.exit(0);
}

const summary = summarizeSessions(filtered);
const output = formatOutput(summary);
console.log(output);

// Write timestamp marker
if (!process.argv.includes('--dry-run')) {
  writeTimestamp(filtered);
  console.log(`\n---\nTimestamp updated: ${TIMESTAMP_FILE}`);
}
