# SOP: Execute Single Task

## Purpose

Execute a single task from a feature's tasks.md file with automated testing and pattern enforcement.

## Prerequisites

- Feature has complete design (requirements.md, design.md, tasks.md)
- Task dependencies are satisfied
- Build and lint currently pass

## Steps

### 1. Read Task

**Action:** Parse task from tasks.md

```bash
node scripts/task-reader.js features/{feature}/tasks.md {taskId}
```

**Extract:**
- Task name
- Files to create/modify
- Subtasks
- Dependencies
- Estimated time

### 2. Read Design Context

**Action:** Read relevant sections from design.md

**Focus on:**
- Component/system being implemented
- API signatures
- Implementation patterns
- Integration points

### 3. Search for Similar Patterns

**Action:** Find similar code in codebase

**Search for:**
- Similar components (if creating component)
- Similar entities (if creating entity)
- Similar managers (if creating manager)

**Use:** code tool search_symbols, grep for patterns

### 4. Implement Code

**Action:** Write minimal code following design.md

**Rules:**
- Follow design.md specification exactly
- Use existing patterns
- Minimal code (no verbose implementations)
- No redundant comments
- Use props pattern for components

### 5. Run Pattern Checks

**Action:** Check code quality

```bash
node scripts/pattern-checker.js {filePath}
```

**Checks:**
- Props pattern (no defaults)
- Magic numbers (all named with units)
- Update order (if component)
- Readonly properties

**If violations:** Fix automatically or report to user

### 6. Build and Lint

**Action:** Verify code compiles

```bash
npm run build && npx eslint src --ext .ts
```

**If fails:**
- Analyze error message
- Fix issue
- Retry (max 3 attempts)
- If still fails: Report to user

### 7. Generate Test

**Action:** Create test from template

```bash
node scripts/test-generator.js "{taskName}" {featureName}
```

**Steps:**
- Select template based on task type
- Fill template with task-specific values
- Generate test level (if needed)
- Save test file to test/tests/{category}/

### 8. Run Test in Browser

**Action:** Execute test with Puppeteer

```bash
# Start dev server
node scripts/dev-server-manager.js start

# Run test
node test/tests/{category}/test-{feature}-{task}.js

# Stop server
node scripts/dev-server-manager.js stop {pid}
```

**If test fails due to dependency:**
- Mark as "deferred"
- Track for re-run after dependency completes
- Continue with task completion

### 9. Take Screenshot

**Action:** Capture visual result

**Automatic:** Test runner captures screenshot to test/screenshots/

**Verify:**
- Entity renders (if applicable)
- Position correct (if applicable)
- Animation playing (if applicable)

### 10. Add to Regression Suite

**Action:** Update regression file

```bash
node scripts/regression-generator.js {featureName} test-{feature}-{task}.js
```

### 11. Mark Task Complete

**Action:** Update tasks.md

```bash
node scripts/mark-task-complete.js features/{feature}/tasks.md {taskId} "{actualTime}"
```

**Updates:**
- Mark subtasks [x]
- Add ✅ to header
- Add actual time

### 12. Generate Report

**Action:** Create completion report

**Format:**
```
✅ Task {X.Y}: {Name}

Files Created: [list]
Files Modified: [list]
Pattern Enforcement: [results]
Build & Lint: [results]
Testing: [results]
Visual Verification: [results]
Regression: [results]
Time: {actual} minutes
Next: Task {X+1} ready
```

## Success Criteria

Task is complete when:
- ✅ Code implemented per design.md
- ✅ Build passes (0 errors)
- ✅ Lint passes (0 warnings)
- ✅ Pattern checks pass
- ✅ Test generated
- ✅ Test runs (pass or deferred)
- ✅ Screenshot captured
- ✅ Added to regression suite
- ✅ Task marked complete
- ✅ Report generated

## Common Issues

**Build fails:**
- Check error message carefully
- Look for missing imports
- Check for typos in type names
- Verify dependencies are satisfied

**Test fails:**
- Check if dependency issue (defer if so)
- Verify test level has needed entities
- Check test logic matches implementation
- Review screenshot for visual issues

**Pattern violations:**
- Fix automatically if simple
- Ask user if complex or ambiguous
- Document decision in report
