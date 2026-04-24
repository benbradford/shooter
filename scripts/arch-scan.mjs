#!/usr/bin/env node

/**
 * Architecture Metrics Scanner
 * 
 * Deterministic, repeatable analysis of TypeScript files.
 * Produces structured JSON that the architect agent interprets.
 * 
 * Usage:
 *   node scripts/arch-scan.mjs [path]           # scan file or directory
 *   node scripts/arch-scan.mjs src/             # scan all .ts files under src/
 *   node scripts/arch-scan.mjs --top=20         # top 20 hotspots in src/
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, relative, extname } from 'path';

// ─── Configuration ───────────────────────────────────────────────

const THRESHOLDS = {
  god_object_loc: 300,
  god_object_methods: 15,
  big_method_loc: 50,
  high_imports: 10,
  high_imports_critical: 15,
  boolean_flags: 5,
  magic_number_min: 2,       // ignore 0, 1
  deep_nesting_spaces: 16,   // 4 levels × 4 spaces
  state_enum_values: 5,
  switch_branches: 3,
};

// ─── File Discovery ──────────────────────────────────────────────

function findTsFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'android', 'test'].includes(entry.name)) continue;
      findTsFiles(full, files);
    } else if (extname(entry.name) === '.ts' && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

// ─── Per-File Analysis ───────────────────────────────────────────

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const loc = lines.length;

  // Imports
  const imports = [];
  for (const line of lines) {
    const m = line.match(/^import\s.*from\s+['"](.+?)['"]/);
    if (m) imports.push(m[1]);
  }

  // Classes and methods
  const classes = [];
  const methods = [];
  let currentClass = null;
  let braceDepth = 0;
  let classStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Class detection
    const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
    if (classMatch && !currentClass) {
      currentClass = classMatch[1];
      classStartLine = i + 1;
      braceDepth = 0;
    }

    // Method detection (inside or outside class)
    const methodMatch = line.match(/^\s*(private|public|protected|readonly)?\s*(async\s+)?(\w+)\s*\(.*\).*[:{]/);
    if (methodMatch && methodMatch[3] !== 'if' && methodMatch[3] !== 'for' && methodMatch[3] !== 'while' && methodMatch[3] !== 'switch' && methodMatch[3] !== 'constructor') {
      methods.push({
        name: methodMatch[3],
        visibility: methodMatch[1] || 'public',
        line: i + 1,
        class: currentClass,
      });
    }

    // Constructor
    if (line.match(/^\s*(private|public|protected)?\s*constructor\s*\(/)) {
      methods.push({ name: 'constructor', visibility: 'public', line: i + 1, class: currentClass });
    }

    // Track class boundaries via braces
    if (currentClass) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0 && i > classStartLine) {
        classes.push({ name: currentClass, startLine: classStartLine, endLine: i + 1, loc: i + 1 - classStartLine });
        currentClass = null;
      }
    }
  }

  // Boolean flags
  const booleanFlags = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/private\s+(?:readonly\s+)?(\w+)\s*(?::\s*boolean\s*=|=\s*(?:true|false))/);
    if (m) booleanFlags.push({ name: m[1], line: i + 1 });
    const m2 = lines[i].match(/private\s+(is[A-Z]\w+|has[A-Z]\w+|should[A-Z]\w+|can[A-Z]\w+)\s*[=:]/);
    if (m2 && !booleanFlags.find(b => b.name === m2[1])) booleanFlags.push({ name: m2[1], line: i + 1 });
  }

  // Magic numbers
  const magicNumbers = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s*(\/\/|\/\*|\*|import|export\s+const|const\s+\w+|type\s+|interface\s+)/)) continue;
    // Find numeric literals that aren't in const declarations
    const nums = [...line.matchAll(/(?<![a-zA-Z_.'"])\b(\d+\.?\d*)\b(?![a-zA-Z_x])/g)];
    for (const nm of nums) {
      const val = parseFloat(nm[1]);
      if (val <= 1 || isNaN(val)) continue;
      if (line.match(/const\s+\w+.*=/) || line.match(/readonly\s+\w+.*=/)) continue;
      magicNumbers.push({ value: val, line: i + 1, context: line.trim().substring(0, 80) });
    }
  }

  // Deep nesting
  const deepNesting = [];
  for (let i = 0; i < lines.length; i++) {
    const leadingSpaces = lines[i].match(/^(\s*)/)[1].length;
    if (leadingSpaces >= THRESHOLDS.deep_nesting_spaces && lines[i].trim().length > 0) {
      deepNesting.push({ line: i + 1, depth: Math.floor(leadingSpaces / 2) });
    }
  }

  // Switch statements and branch counts
  const switches = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/\bswitch\s*\(/)) {
      let cases = 0;
      for (let j = i + 1; j < Math.min(i + 100, lines.length); j++) {
        if (lines[j].match(/\bcase\s+/)) cases++;
        if (lines[j].match(/^\s*\}/)) break;
      }
      switches.push({ line: i + 1, cases });
    }
  }

  // State-like enums/types
  const stateTypes = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/type\s+(\w*[Ss]tate\w*)\s*=/);
    if (m) {
      // Count union members
      let values = 0;
      let j = i;
      while (j < lines.length && !lines[j].includes(';')) {
        values += (lines[j].match(/'/g) || []).length / 2;
        j++;
      }
      stateTypes.push({ name: m[1], values: Math.round(values), line: i + 1 });
    }
  }

  // Singleton access
  const singletonAccess = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(\w+)\.getInstance\(\)/);
    if (m) singletonAccess.push({ class: m[1], line: i + 1 });
  }

  // WorldState flag access
  const worldStateAccess = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(setFlag|getFlag|isFlagCondition)\s*\(\s*[`'"](.*?)[`'"]/);
    if (m) worldStateAccess.push({ method: m[1], flag: m[2], line: i + 1 });
  }

  // Update method detection
  const updateMethods = methods.filter(m => m.name === 'update' || m.name === 'onUpdate');

  // Method sizes (approximate from line gaps)
  const methodSizes = [];
  const sortedMethods = [...methods].sort((a, b) => a.line - b.line);
  for (let i = 0; i < sortedMethods.length; i++) {
    const start = sortedMethods[i].line;
    const end = i + 1 < sortedMethods.length ? sortedMethods[i + 1].line - 1 : Math.min(start + 100, loc);
    const size = end - start;
    if (size > 0) {
      methodSizes.push({ ...sortedMethods[i], estimatedLoc: size });
    }
  }

  return {
    file: filePath,
    loc,
    imports: { count: imports.length, paths: imports },
    classes,
    methods: { count: methods.length, list: methods },
    methodSizes: methodSizes.filter(m => m.estimatedLoc > THRESHOLDS.big_method_loc),
    booleanFlags: { count: booleanFlags.length, list: booleanFlags },
    magicNumbers: { count: magicNumbers.length, list: magicNumbers.slice(0, 20) },
    deepNesting: { count: deepNesting.length, lines: deepNesting.slice(0, 10) },
    switches,
    stateTypes,
    singletonAccess: { count: singletonAccess.length, list: singletonAccess },
    worldStateAccess: { count: worldStateAccess.length, list: worldStateAccess },
    updateMethods: updateMethods.length,
  };
}

// ─── Rule Evaluation ─────────────────────────────────────────────

function evaluateRules(fileMetrics) {
  const issues = [];
  const m = fileMetrics;
  const f = m.file;

  // GOD_OBJ: God Object
  if (m.loc > THRESHOLDS.god_object_loc && m.methods.count > THRESHOLDS.god_object_methods) {
    issues.push({
      id: 'GOD_OBJ',
      rule: 'God Object',
      severity: m.loc > 500 ? 'critical' : 'high',
      file: f,
      metrics: { loc: m.loc, methods: m.methods.count, imports: m.imports.count },
      description: `Class has ${m.loc} LOC and ${m.methods.count} methods (thresholds: ${THRESHOLDS.god_object_loc}/${THRESHOLDS.god_object_methods})`,
    });
  }

  // BIG_METHOD: Oversized Methods
  for (const method of m.methodSizes) {
    issues.push({
      id: 'BIG_METHOD',
      rule: 'Oversized Method',
      severity: method.estimatedLoc > 100 ? 'high' : 'medium',
      file: f,
      metrics: { method: method.name, loc: method.estimatedLoc, line: method.line },
      description: `Method '${method.name}' is ~${method.estimatedLoc} lines (threshold: ${THRESHOLDS.big_method_loc})`,
    });
  }

  // HIGH_IMPORT: High Import Count
  if (m.imports.count > THRESHOLDS.high_imports) {
    issues.push({
      id: 'HIGH_IMPORT',
      rule: 'High Import Count',
      severity: m.imports.count > THRESHOLDS.high_imports_critical ? 'high' : 'medium',
      file: f,
      metrics: { imports: m.imports.count },
      description: `${m.imports.count} imports (threshold: ${THRESHOLDS.high_imports})`,
    });
  }

  // STATE_EXPLOSION: Boolean Flag Explosion
  if (m.booleanFlags.count > THRESHOLDS.boolean_flags) {
    issues.push({
      id: 'STATE_EXPLOSION',
      rule: 'State Flag Explosion',
      severity: 'medium',
      file: f,
      metrics: { flags: m.booleanFlags.count, names: m.booleanFlags.list.map(b => b.name) },
      description: `${m.booleanFlags.count} boolean flags (threshold: ${THRESHOLDS.boolean_flags}): ${m.booleanFlags.list.map(b => b.name).join(', ')}`,
    });
  }

  // OCP_SWITCH: Large Switch Statements
  for (const sw of m.switches) {
    if (sw.cases > THRESHOLDS.switch_branches) {
      issues.push({
        id: 'OCP_SWITCH',
        rule: 'Large Switch Statement',
        severity: sw.cases > 8 ? 'high' : 'medium',
        file: f,
        metrics: { line: sw.line, cases: sw.cases },
        description: `Switch with ${sw.cases} cases at line ${sw.line} (threshold: ${THRESHOLDS.switch_branches})`,
      });
    }
  }

  // INLINE_STATE: Inline State Machine
  if (m.stateTypes.length > 0) {
    for (const st of m.stateTypes) {
      if (st.values > THRESHOLDS.state_enum_values && m.switches.some(s => s.cases >= st.values - 1)) {
        issues.push({
          id: 'INLINE_STATE',
          rule: 'Inline State Machine',
          severity: 'medium',
          file: f,
          metrics: { stateType: st.name, values: st.values, line: st.line },
          description: `State type '${st.name}' with ${st.values} values managed via switch — consider state classes`,
        });
      }
    }
  }

  // PERSIST_SCATTER: Scattered Persistence
  if (m.worldStateAccess.count > 8) {
    issues.push({
      id: 'PERSIST_SCATTER',
      rule: 'Scattered Persistence',
      severity: 'medium',
      file: f,
      metrics: { accessCount: m.worldStateAccess.count, flags: [...new Set(m.worldStateAccess.list.map(a => a.flag))] },
      description: `${m.worldStateAccess.count} WorldState flag accesses across the file — consider a persistence helper`,
    });
  }

  // HIDDEN_DEP: Hidden Dependencies (Singletons)
  if (m.singletonAccess.count > 2) {
    issues.push({
      id: 'HIDDEN_DEP',
      rule: 'Hidden Dependencies (Singletons)',
      severity: m.singletonAccess.count > 5 ? 'high' : 'medium',
      file: f,
      metrics: { count: m.singletonAccess.count, classes: [...new Set(m.singletonAccess.list.map(s => s.class))] },
      description: `${m.singletonAccess.count} singleton accesses — dependencies not visible in constructor/props`,
    });
  }

  // MAGIC_NUM: Magic Numbers
  if (m.magicNumbers.count > 5) {
    issues.push({
      id: 'MAGIC_NUM',
      rule: 'Magic Numbers',
      severity: 'low',
      file: f,
      metrics: { count: m.magicNumbers.count, samples: m.magicNumbers.list.slice(0, 5).map(n => `${n.value} (line ${n.line})`) },
      description: `${m.magicNumbers.count} magic numbers — extract to named constants`,
    });
  }

  return issues;
}

// ─── Main ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetPath = 'src';
let topN = 0;

for (const arg of args) {
  if (arg.startsWith('--top=')) topN = parseInt(arg.slice(6));
  else targetPath = arg;
}

const rootDir = process.cwd();
let files;

if (existsSync(targetPath) && statSync(targetPath).isFile()) {
  files = [targetPath];
} else if (existsSync(targetPath) && statSync(targetPath).isDirectory()) {
  files = findTsFiles(targetPath);
} else {
  console.error(`Path not found: ${targetPath}`);
  process.exit(1);
}

// Analyze all files
const allMetrics = files.map(f => analyzeFile(f));

// ─── Fan-In Analysis (cross-file) ────────────────────────────────
// For each file, count how many OTHER files import from it

const allFileContents = new Map();
for (const f of files) {
  allFileContents.set(f, readFileSync(f, 'utf-8'));
}

for (const m of allMetrics) {
  const relPath = relative(rootDir, m.file).replace(/\.ts$/, '');
  const baseName = relPath.split('/').pop();
  // Count files that import from this file
  const dependents = new Set();
  for (const [otherFile, content] of allFileContents) {
    if (otherFile === m.file) continue;
    // Check if any import references this file
    const lines = content.split('\n');
    for (const line of lines) {
      const im = line.match(/^import\s.*from\s+['"](.+?)['"]/);
      if (im && (im[1].endsWith('/' + baseName) || im[1].endsWith('/' + baseName.replace(/Component$|Entity$|State$/, '')))) {
        dependents.add(relative(rootDir, otherFile));
      }
    }
  }
  m.fanIn = { count: dependents.size, dependents: [...dependents] };
}

// Sort by LOC descending
allMetrics.sort((a, b) => b.loc - a.loc);

// If --top, only analyze top N
const toAnalyze = topN > 0 ? allMetrics.slice(0, topN) : allMetrics;

// Evaluate rules
const allIssues = [];
for (const m of toAnalyze) {
  allIssues.push(...evaluateRules(m));

  // CHANGE_RISK: High fan-in AND high fan-out
  if (m.fanIn.count > 10 && m.imports.count > 10) {
    allIssues.push({
      id: 'CHANGE_RISK',
      rule: 'High Change Impact',
      severity: 'critical',
      file: m.file,
      metrics: { fanIn: m.fanIn.count, fanOut: m.imports.count, dependents: m.fanIn.dependents.slice(0, 10) },
      description: `Used by ${m.fanIn.count} files AND depends on ${m.imports.count} modules — changes here are high-risk`,
    });
  } else if (m.fanIn.count > 10) {
    allIssues.push({
      id: 'HIGH_FANIN',
      rule: 'Widely Depended On',
      severity: 'high',
      file: m.file,
      metrics: { fanIn: m.fanIn.count, dependents: m.fanIn.dependents.slice(0, 10) },
      description: `Used by ${m.fanIn.count} files — changes here have wide blast radius`,
    });
  }
}

// ─── Priority Scoring ────────────────────────────────────────────
// Score each file by: severity-weighted issue count × fan-in multiplier

const filePriority = new Map();
for (const m of toAnalyze) {
  const relFile = relative(rootDir, m.file);
  let score = 0;
  for (const issue of allIssues) {
    if (relative(rootDir, issue.file) !== relFile) continue;
    const w = { critical: 10, high: 5, medium: 2, low: 1 };
    score += w[issue.severity] || 0;
  }
  // Fan-in multiplier: widely-used files are more urgent to fix
  const fanInMultiplier = 1 + Math.min(m.fanIn.count, 20) * 0.1;
  score = Math.round(score * fanInMultiplier);
  if (score > 0) filePriority.set(relFile, { score, fanIn: m.fanIn.count, loc: m.loc, issues: allIssues.filter(i => relative(rootDir, i.file) === relFile).length });
}

const priorities = [...filePriority.entries()].sort((a, b) => b[1].score - a[1].score);

// Severity ordering
const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
allIssues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

// Summary
const summary = {
  files_analyzed: toAnalyze.length,
  total_loc: toAnalyze.reduce((s, m) => s + m.loc, 0),
  issues: {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    high: allIssues.filter(i => i.severity === 'high').length,
    medium: allIssues.filter(i => i.severity === 'medium').length,
    low: allIssues.filter(i => i.severity === 'low').length,
    total: allIssues.length,
  },
  priorities: priorities.slice(0, 10).map(([file, data]) => ({ file, ...data })),
  hotspots: allMetrics.slice(0, 10).map(m => ({
    file: relative(rootDir, m.file),
    loc: m.loc,
    methods: m.methods.count,
    imports: m.imports.count,
    fanIn: m.fanIn.count,
  })),
};

// Build report
const report = {
  timestamp: new Date().toISOString(),
  thresholds: THRESHOLDS,
  summary,
  issues: allIssues.map(i => ({ ...i, file: relative(rootDir, i.file) })),
  fileMetrics: toAnalyze.map(m => ({
    file: relative(rootDir, m.file),
    loc: m.loc,
    methods: m.methods.count,
    imports: m.imports.count,
    fanIn: m.fanIn.count,
    fanInDependents: m.fanIn.dependents,
    booleanFlags: m.booleanFlags.count,
    singletonAccess: m.singletonAccess.count,
    worldStateAccess: m.worldStateAccess.count,
    updateMethods: m.updateMethods,
    magicNumbers: m.magicNumbers.count,
  })),
};

// Write JSON
writeFileSync('tmp/architect-report.json', JSON.stringify(report, null, 2));

// Print human-readable summary
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  ARCHITECTURE SCAN');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Files analyzed:  ${summary.files_analyzed}`);
console.log(`  Total LOC:       ${summary.total_loc}`);
console.log(`  Issues found:    ${summary.issues.total}`);
console.log(`    Critical: ${summary.issues.critical}  High: ${summary.issues.high}  Medium: ${summary.issues.medium}  Low: ${summary.issues.low}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Priorities
if (priorities.length > 0) {
  console.log('🔥 TOP PRIORITIES (fix these first):');
  for (let i = 0; i < Math.min(10, priorities.length); i++) {
    const [file, data] = priorities[i];
    console.log(`  ${String(i + 1).padStart(2)}. ${file}`);
    console.log(`      Score: ${data.score}  |  ${data.issues} issues  |  Fan-in: ${data.fanIn} dependents  |  ${data.loc} LOC`);
  }
  console.log('');
}

console.log('TOP HOTSPOTS (by LOC):');
for (const h of summary.hotspots) {
  console.log(`  ${String(h.loc).padStart(5)} LOC  ${String(h.methods).padStart(3)} methods  ${String(h.imports).padStart(3)} imports  ${String(h.fanIn).padStart(3)} fan-in  ${h.file}`);
}
console.log('');

// Print issues grouped by severity
for (const sev of ['critical', 'high', 'medium', 'low']) {
  const sevIssues = allIssues.filter(i => i.severity === sev);
  if (sevIssues.length === 0) continue;
  console.log(`── ${sev.toUpperCase()} (${sevIssues.length}) ${'─'.repeat(40)}`);
  for (const issue of sevIssues) {
    console.log(`  [${issue.id}] ${relative(rootDir, issue.file)}`);
    console.log(`    ${issue.description}`);
  }
  console.log('');
}

console.log(`Full report: tmp/architect-report.json`);
