# SOP: Execute Single Task (Simplified)

## Purpose

Execute a single task from a feature's tasks.md file with build/lint verification only. Testing removed to prevent connection timeouts.

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

### 5. Build and Lint

```bash
echo "[STEP 5] Building and linting" >> tmp/logs/db-implementor.log
npm run build && npx eslint src --ext .ts
echo "[STEP 5] Complete" >> tmp/logs/db-implementor.log
```

**If fails:** Fix and retry (max 3 attempts)

### 6. Mark Complete

```bash
echo "[STEP 6] Marking complete" >> tmp/logs/db-implementor.log
node scripts/mark-task-complete.js features/{feature}/tasks.md {taskId} "{time}"
echo "[STEP 6] Complete" >> tmp/logs/db-implementor.log
```

### 7. Report

```bash
echo "[STEP 7] Generating report" >> tmp/logs/db-implementor.log
echo "=== TASK COMPLETE ===" >> tmp/logs/db-implementor.log
```

## Success Criteria

- ✅ Code implemented per design.md
- ✅ Build passes (0 errors)
- ✅ Lint passes (0 warnings)
- ✅ Task marked complete
- ✅ Report generated

**User tests manually after implementation.**
