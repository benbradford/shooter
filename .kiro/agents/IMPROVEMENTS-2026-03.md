# Agent Improvements - March 2026

## Issues Identified During Pet System Implementation

### Issue 1: db-design Skipped Clarifying Questions
**Problem:** Design agent created specs without asking clarifying questions first
**Impact:** Ambiguities discovered during implementation
**Fix:** Added mandatory checkpoint - disambiguate-feature MUST run before creating specs

### Issue 2: db-runtime-analyst Hangs
**Problem:** Runtime analyst gets stuck and doesn't respond
**Impact:** Can't validate designs
**Fix:** Added complexity/timeout management - abbreviated analysis for complex features

### Issue 3: Tasks Not Marked Complete
**Problem:** tasks.md not updated with checkmarks during implementation
**Impact:** Can't track progress
**Fix:** Strengthened requirements - mark IMMEDIATELY after each task

### Issue 4: Implementation Claimed Complete When Not
**Problem:** HUD carousel skipped but marked complete
**Impact:** Misleading documentation
**Fix:** Added rule - Do NOT claim complete until ALL tasks done

## Files Updated

1. `.kiro/agents/db-design/instructions.md` - Mandatory disambiguate checkpoint
2. `.kiro/agents/db-runtime-analyst/instructions.md` - Timeout management
3. `.agents/summary/index.md` - Task completion enforcement
