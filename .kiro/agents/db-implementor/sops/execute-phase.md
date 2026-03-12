# SOP: Execute Phase

## Purpose

Execute all tasks in a phase sequentially with automated testing and pattern enforcement.

## Prerequisites

- Feature has complete design
- Previous phases complete (if dependencies exist)
- Build and lint currently pass

## Steps

### 1. Read Phase Tasks

**Action:** Extract all tasks in phase from tasks.md

**Example:** Phase 1 has tasks 1.1, 1.2, 1.3, 1.4, 1.5

### 2. Check Dependencies

**Action:** Verify all dependencies satisfied

**For each task:**
- Check if dependencies listed
- Verify dependency tasks are complete
- If not: Report error and stop

### 3. Execute Tasks Sequentially

**Action:** Run execute-task.md SOP for each task

**For each task in phase:**
1. Execute task (follow execute-task.md)
2. If task fails: Stop and report
3. If task succeeds: Continue to next
4. Track deferred tests

### 4. Re-run Deferred Tests

**Action:** After phase complete, re-run all deferred tests

**For each deferred test:**
- Run test again
- Verify it now passes
- Report results
- Mark as verified

### 5. Integration Verification

**Action:** Verify all tasks in phase work together

**Check:**
- All components integrate correctly
- No build errors
- No lint warnings
- All tests pass (or deferred with reason)

### 6. Generate Phase Report

**Action:** Summarize phase completion

**Format:**
```
✅ Phase {X}: {Name} Complete

Tasks: {X}/{X} complete
Time: {actual} vs {estimated}
Tests: {X} generated, {Y} passed, {Z} deferred

Deferred tests re-run:
- {test1}: ✅ Pass
- {test2}: ✅ Pass

Next: Phase {X+1} ready
```

## Success Criteria

Phase is complete when:
- ✅ All tasks in phase complete
- ✅ All deferred tests re-run
- ✅ Integration verified
- ✅ Build passes
- ✅ Lint passes
- ✅ Phase report generated

## Common Issues

**Task fails mid-phase:**
- Stop execution
- Report which task failed
- Don't continue to next task
- User must fix before continuing

**Deferred test still fails:**
- Report to user
- Investigate dependency issue
- May need to fix implementation
- Don't mark phase complete until resolved
