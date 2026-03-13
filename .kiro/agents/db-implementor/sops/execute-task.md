# SOP: Execute Single Task

## Purpose

Execute a single task from a feature's tasks.md file with full verification including test creation and execution.

## Prerequisites

- Feature has complete design (requirements.md, design.md, tasks.md)
- Task dependencies are satisfied
- Build and lint currently pass

## Steps

**CRITICAL: Log every step to tmp/logs/db-implementor.log AND save checkpoints**

### 0. Check for Resume Point

```bash
# Check if we're resuming from a previous failure
if [ -f tmp/logs/checkpoint.log ]; then
  LAST_CHECKPOINT=$(tail -1 tmp/logs/checkpoint.log)
  echo "[RESUME] Found checkpoint: $LAST_CHECKPOINT" >> tmp/logs/db-implementor.log
  # Skip to the step after the last checkpoint
fi
```

### 1. Read Task

```bash
echo "[STEP 1] Reading task {taskId}" >> tmp/logs/db-implementor.log
node scripts/task-reader.js features/{feature}/tasks.md {taskId}
echo "[STEP 1] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] task_read:{taskId}" >> tmp/logs/checkpoint.log
```

### 2. Read Design Context

```bash
echo "[STEP 2] Reading design.md" >> tmp/logs/db-implementor.log
# Read features/{feature}/design.md
echo "[STEP 2] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] design_read:{taskId}" >> tmp/logs/checkpoint.log
```

### 3. Search for Similar Patterns

```bash
echo "[STEP 3] Searching patterns" >> tmp/logs/db-implementor.log
# Use code tool to find similar components/entities
echo "[STEP 3] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] patterns_found:{taskId}" >> tmp/logs/checkpoint.log
```

### 4. Implement Code

```bash
echo "[STEP 4] Implementing code" >> tmp/logs/db-implementor.log

# CRITICAL: Never create assets without user approval
if [[ "{taskName}" == *"asset"* ]] || [[ "{taskName}" == *"icon"* ]] || [[ "{taskName}" == *"sprite"* ]] || [[ "{taskName}" == *"image"* ]] || [[ "{taskName}" == *"texture"* ]]; then
  echo "[STEP 4] Task requires asset creation" >> tmp/logs/db-implementor.log
  echo "[STEP 4] Searching for existing assets" >> tmp/logs/db-implementor.log
  # Search public/assets/ for existing files
  # Report findings to user and ask:
  # "Found existing: {files}. Use one of these, or should I create placeholder?"
  # STOP and wait for user response - DO NOT create assets automatically
fi

# Write code using fs_write
echo "[STEP 4] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] code_written:{taskId}:{files_created}" >> tmp/logs/checkpoint.log
```

**Rules:**
- Follow design.md exactly
- Use existing patterns
- Minimal code
- No redundant comments
- Props pattern for components
- **NEVER create assets (images, sprites, icons) without user approval**
  - Search for existing assets first
  - Report findings to user
  - Ask: "Use existing {file}? Or create placeholder?"
  - Wait for user response before proceeding
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
echo "[CHECKPOINT] test_created:{taskId}:{test_file}" >> tmp/logs/checkpoint.log
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
echo "[CHECKPOINT] build_passed:{taskId}" >> tmp/logs/checkpoint.log
```

**If fails:** Fix and retry (max 3 attempts)

### 7. Run Test

```bash
echo "[STEP 7] Running test" >> tmp/logs/db-implementor.log
npm run test:single test-{feature}-{taskId}
echo "[STEP 7] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] test_passed:{taskId}" >> tmp/logs/checkpoint.log
```

**If fails:** Fix and retry (max 3 attempts)

### 8. Mark Complete

```bash
echo "[STEP 8] Marking complete" >> tmp/logs/db-implementor.log
node scripts/mark-task-complete.js features/{feature}/tasks.md {taskId} "{time}"
echo "[STEP 8] Complete" >> tmp/logs/db-implementor.log
echo "[CHECKPOINT] task_complete:{taskId}" >> tmp/logs/checkpoint.log
```

### 9. Report

```bash
echo "[STEP 9] Generating report" >> tmp/logs/db-implementor.log
echo "=== TASK COMPLETE ===" >> tmp/logs/db-implementor.log
# Clear checkpoint for this task
sed -i '' "/{taskId}/d" tmp/logs/checkpoint.log
```
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
