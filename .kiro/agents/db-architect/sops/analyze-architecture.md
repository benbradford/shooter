# SOP: Architecture Analysis

## Trigger

When asked to analyze code — a file, system, directory, or full codebase.

## Phase 1: Discovery

### Single File
1. Read the file
2. Run metrics (see Metrics Collection below)
3. Get document symbols
4. Find all references to the class/component (who uses it?)

### System (e.g., "the pushable system")
1. Search for symbols matching the system name
2. Glob for related files: `**/*pushable*`, `**/*Pushable*`
3. Grep for imports of the main component
4. Build the file list, then analyze each

### Directory
1. List all `.ts` files in the directory
2. Sort by LOC (largest first) — `wc -l src/ecs/components/**/*.ts | sort -rn`
3. Analyze top offenders first

### Full Codebase
1. Find hotspots: `find src -name "*.ts" -exec wc -l {} + | sort -rn | head -30`
2. Analyze the top 10-15 largest files
3. Check for cross-cutting issues (circular deps, god objects, coupling)

## Phase 2: Metrics Collection

For each file, collect:

```bash
# Basic metrics
wc -l <file>                                    # Total LOC
grep -c "^\s*private\s" <file>                  # Private members
grep -c "^\s*public\s\|^\s*readonly\s" <file>   # Public members
grep -c "^import" <file>                        # Import count
grep -c "private.*\(.*\).*{" <file>             # Private methods (approx)

# Boolean flags
grep -cE "private.*boolean|private.*is[A-Z]|private.*has[A-Z]|private.*should[A-Z]|private.*can[A-Z]" <file>

# Magic numbers (numeric literals not in const declarations)
grep -nE "[^a-zA-Z_]([2-9]|[1-9][0-9]+)[^a-zA-Z_0-9x]" <file> | grep -v "const\|import\|//\|*\|index\|length"
```

Use `get_document_symbols` for accurate method/property counts.

## Phase 3: Rule Evaluation

### STRUCTURAL RULES

#### GOD_OBJ: God Object
**Thresholds:** LOC > 300 AND methods > 15
**Severity:** HIGH if LOC > 500, MEDIUM if LOC > 300
**Check:**
- Count total LOC
- Count methods via `get_document_symbols`
- If both thresholds exceeded → flag
**Evidence:** LOC count, method count, list of responsibility clusters

#### BIG_METHOD: Oversized Method
**Thresholds:** Method LOC > 50
**Severity:** MEDIUM
**Check:**
- Use `get_document_symbols` to find methods
- Estimate method size from line ranges
**Evidence:** Method name, line range, LOC

#### DEEP_NEST: Deep Nesting
**Thresholds:** Nesting depth > 4
**Severity:** LOW
**Check:**
- `grep -n "^\s\{16,\}" <file>` (4+ levels of 4-space indent)
**Evidence:** Line numbers, nesting depth

### COUPLING RULES

#### HIGH_IMPORT: High Import Count
**Thresholds:** Imports > 10
**Severity:** MEDIUM if > 10, HIGH if > 15
**Check:**
- Count import lines
- Categorize: same-module vs cross-module
**Evidence:** Import count, list of imported modules

#### HIGH_FANIN: High Fan-In (many dependents)
**Thresholds:** Referenced by > 15 files
**Severity:** HIGH (changes here break many things)
**Check:**
- `find_references` on the main class/export
- Count unique files
**Evidence:** Reference count, list of dependent files

#### HIGH_FANOUT: High Fan-Out (depends on many things)
**Thresholds:** Imports from > 10 distinct modules
**Severity:** MEDIUM
**Check:**
- Count unique import paths
**Evidence:** Import count, dependency list

#### CIRCULAR_DEP: Circular Dependency
**Severity:** CRITICAL
**Check:**
- For each import, check if the imported module imports back
- `grep -l "from.*<this-module>" <imported-files>`
**Evidence:** The cycle path (A → B → A)

### SOLID RULES

#### SRP_VIOLATION: Single Responsibility Violation
**Severity:** HIGH
**Check:**
- Identify distinct "responsibility clusters" in a class:
  - Group methods by what data they touch
  - If a class has methods touching 3+ distinct concerns → flag
- Common violations: mixing persistence + logic + rendering
**Evidence:** Method groups, what each group does

#### OCP_SWITCH: Open/Closed Violation (type switching)
**Severity:** MEDIUM
**Check:**
- `pattern_search` for switch statements or long if/else chains
- Check if they switch on type/enum with > 3 branches
**Evidence:** Switch location, branch count

#### DIP_CONCRETE: Dependency Inversion Violation
**Severity:** LOW
**Check:**
- `new ConcreteClass()` inside business logic (not factories)
- Direct instantiation of dependencies instead of injection
**Evidence:** Instantiation sites

### GAME-SPECIFIC RULES

#### UPDATE_HEAVY: Heavy Update Loop
**Severity:** HIGH
**Check:**
- Find `update(delta)` methods
- Check for: object allocation, array creation, complex loops, pathfinding calls every frame
- Acceptable: simple state checks, position updates, animation ticks
**Evidence:** What's happening in update(), estimated cost

#### STATE_EXPLOSION: State Flag Explosion
**Thresholds:** > 5 boolean state flags in one class
**Severity:** MEDIUM
**Check:**
- Count boolean fields
- Check if they represent states that should be a state machine
**Evidence:** Flag names, suggested state machine

#### MAGIC_NUM: Magic Numbers
**Severity:** LOW
**Check:**
- Numeric literals not in const declarations
- Exclude: 0, 1, -1, 2 (common math), array indices
- Focus on: pixel values, timing values, thresholds
**Evidence:** The numbers and where they appear

#### INLINE_STATE: Inline State Machine
**Severity:** MEDIUM
**Check:**
- String/enum state field with switch/if chains in update()
- Should be using proper state classes (IState pattern)
**Evidence:** State field, switch locations, state count

#### PERSIST_SCATTER: Scattered Persistence
**Severity:** MEDIUM
**Check:**
- WorldState flag reads/writes spread across many methods
- Should be centralized in a persistence helper
**Evidence:** Flag access sites, flag count

### FRAGILITY RULES

#### CHANGE_RISK: High Change Impact
**Severity:** CRITICAL
**Check:**
- File has BOTH high fan-in (>10 dependents) AND high fan-out (>10 dependencies)
- Changes here are risky: many things depend on it AND it depends on many things
**Evidence:** Fan-in count, fan-out count

#### HIDDEN_DEP: Hidden Dependency
**Severity:** HIGH
**Check:**
- Singleton access (`getInstance()`) deep in business logic
- Global state reads/writes not visible in the interface
**Evidence:** Singleton access sites

#### TEMPORAL_COUPLING: Temporal Coupling
**Severity:** HIGH
**Check:**
- Methods that must be called in a specific order
- `init()` that must be called after construction
- State that's invalid between construction and initialization
**Evidence:** The coupling chain

### CODE QUALITY RULES

#### DRY_VIOLATION: Duplicated Logic
**Severity:** MEDIUM
**Check:**
- Similar code blocks across files
- Copy-pasted patterns with minor variations
**Evidence:** The duplicated blocks, suggested extraction

#### DEAD_CODE: Unreferenced Code
**Severity:** LOW
**Check:**
- `find_references` returns 0 for exported symbols
- Methods never called
**Evidence:** The dead symbol, reference count

## Phase 4: Report Generation

1. Sort issues by severity (critical → low)
2. Group by file
3. For each issue, write the full format from instructions.md
4. Write JSON report to `tmp/architect-report.json`
5. Print human-readable summary

## Phase 5: Update Tech Debt Tracker

After generating the report, update `trackers/architecture-issues.html`:

1. **Read the existing `ISSUES` array** in the HTML file
2. **Mark completed issues as done**: For any issue where the code has been fixed (verify by checking the file), set `status: 'done'`
3. **Add new issues**: For any new issue found in this review that isn't already tracked, add a new entry to the `ISSUES` array with the next available `id`
4. **Update the `Last audit` date** at the bottom of the HTML to today's date
5. **Do NOT remove issues** — keep done/wontfix/deferred items for history

New issue entry format:
```javascript
{
  id: N, severity: 'critical|high|medium|low', status: 'open',
  title: 'Short description',
  detail: 'Detailed explanation with evidence and suggested fix.',
  files: ['src/path/to/file.ts'],
  effort: '2h', risk: 'Low|Med|High', fanIn: N, category: 'performance|architecture|maintainability|pattern|scaling|code-quality',
  added: 'YYYY-MM-DD',
}
```

## Confidence Scoring

Rate each finding:
- **0.9-1.0**: Metrics clearly exceed thresholds, pattern is unambiguous
- **0.7-0.9**: Strong evidence but some judgment involved
- **0.5-0.7**: Possible issue, needs human review
- **< 0.5**: Don't report — too uncertain

## ECS-Aware Exceptions

Do NOT flag these as issues:
- Components with `update(delta)` methods — this is the ECS pattern
- Entity factory functions — composition over inheritance is correct
- Components accessing other components via `entity.require()` — this is expected
- Props-based constructors with many parameters — this is the project's pattern
- Files under 100 LOC — small focused files are good

DO flag these even in ECS:
- Components that manage multiple unrelated concerns
- Components that directly modify other entities' components
- State machines implemented as switch statements instead of state classes
- Persistence logic mixed into gameplay components
