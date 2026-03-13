# SOP: Execute Single Task

## Purpose

Execute a single task from a feature's tasks.md file with full verification including test creation and execution.

## Prerequisites

- Feature has complete design (requirements.md, design.md, tasks.md)
- Task dependencies are satisfied
- Build and lint currently pass

## Steps

**CRITICAL: Log every step to tmp/logs/db-implementor.log**

### 1. Read Task

```bash
echo "[STEP 1] Reading task {taskId}" >> tmp/logs/db-implementor.log
node scripts/task-reader.js features/{feature}/tasks.md {taskId}
echo "[STEP 1] Complete" >> tmp/logs/db-implementor.log
```

### 2. Read Design Context

```bash
echo "[STEP 2] Reading design.md" >> tmp/logs/db-implementor.log
# Read features/{feature}/design.md
echo "[STEP 2] Complete" >> tmp/logs/db-implementor.log
```

### 3. Search for Similar Patterns

```bash
echo "[STEP 3] Searching patterns" >> tmp/logs/db-implementor.log
# Use code tool to find similar components/entities
echo "[STEP 3] Complete" >> tmp/logs/db-implementor.log
```

### 4. Implement Code

```bash
echo "[STEP 4] Implementing code" >> tmp/logs/db-implementor.log
# Write code using fs_write
echo "[STEP 4] Complete" >> tmp/logs/db-implementor.log
```

**Rules:**
- Follow design.md exactly
- Use existing patterns
- Minimal code
- No redundant comments
- Props pattern for components
- **Entity IDs in test levels**: Must follow `{type}{number}` pattern (e.g., `npc0`, `skeleton0`)
  - Why: `EntityManager.getFirst(type)` uses `id.startsWith(type)`
  - ✅ Correct: `{"id": "npc0", "type": "npc"}`
  - ❌ Wrong: `{"id": "test_npc1", "type": "npc"}` (breaks getFirst lookup)

### 5. Create Test

```bash
echo "[STEP 5] Creating test" >> tmp/logs/db-implementor.log
# Create test file: test/tests/{feature}/test-{feature}-{taskId}.js
# Create test level: public/levels/test/test-{feature}-{taskId}.json (if needed)
echo "[STEP 5] Complete" >> tmp/logs/db-implementor.log
```

**Test guidelines:**
- Use GWT format (Given/When/Then)
- Test acceptance criteria from task
- Use existing helpers from `test/helpers/`
- Keep minimal and focused
- **Use `{type}{number}` pattern for entity IDs**

### 6. Build and Lint

```bash
echo "[STEP 6] Building and linting" >> tmp/logs/db-implementor.log
npm run build && npx eslint src --ext .ts
echo "[STEP 6] Complete" >> tmp/logs/db-implementor.log
```

**If fails:** Fix and retry (max 3 attempts)

### 7. Run Test

```bash
echo "[STEP 7] Running test" >> tmp/logs/db-implementor.log
npm run test:single test-{feature}-{taskId}
echo "[STEP 7] Complete" >> tmp/logs/db-implementor.log
```

**If fails:** Fix and retry (max 3 attempts)

### 8. Mark Complete

```bash
echo "[STEP 8] Marking complete" >> tmp/logs/db-implementor.log
node scripts/mark-task-complete.js features/{feature}/tasks.md {taskId} "{time}"
echo "[STEP 8] Complete" >> tmp/logs/db-implementor.log
```

### 9. Report

```bash
echo "[STEP 9] Generating report" >> tmp/logs/db-implementor.log
echo "=== TASK COMPLETE ===" >> tmp/logs/db-implementor.log
```

## Success Criteria

- ✅ Code implemented per design.md
- ✅ Test created and passes
- ✅ Build passes (0 errors)
- ✅ Lint passes (0 errors, warnings acceptable)
- ✅ Task marked complete
- ✅ Report generated
