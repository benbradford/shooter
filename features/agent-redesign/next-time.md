# What to Do Next Time

## When User Reports a Bug

### ❌ DON'T
- Trust external analysis (ChatGPT, Stack Overflow) without verification
- Propose complex solutions immediately
- Add code without testing
- Fix multiple bugs at once
- Skip the agents you created

### ✅ DO
1. **Verify bug exists** - Run integration tests to reproduce
2. **Use db-runtime-analyst** - Trace actual execution (not assumed)
3. **Use db-failure-analyst** - Identify attack scenarios
4. **Add minimal instrumentation** - Console.log to see what's happening
5. **Fix one bug at a time** - Test after each fix
6. **Check simple issues first** - Config, state, timing, cleanup
7. **Only redesign if needed** - Most bugs are simple

## The Process That Worked

```
1. User reports bug
   ↓
2. Run integration tests to reproduce
   ↓
3. Delegate to db-runtime-analyst (trace execution)
   ↓
4. Delegate to db-failure-analyst (identify attacks)
   ↓
5. Add minimal instrumentation based on findings
   ↓
6. Fix bugs one at a time
   ↓
7. Test after each fix
   ↓
8. Remove instrumentation
   ↓
9. Final comprehensive test
```

## Time Comparison

**What I did:**
- Jumped to implementation: 30 min wasted
- Added broken instrumentation: 10 min wasted
- Finally used tests: 45 min to fix
- **Total: 85 minutes**

**What I should have done:**
- Run tests to reproduce: 5 min
- Use runtime analyst: 10 min
- Use failure analyst: 10 min
- Add instrumentation: 5 min
- Fix bugs iteratively: 30 min
- **Total: 60 minutes**

**Time saved: 25 minutes**

## Key Insight

**Integration tests are the source of truth.**

Not:
- External analysis (ChatGPT)
- Assumptions about execution
- Theoretical problems
- "Should work" reasoning

Tests either pass or fail. No ambiguity.

## For Future Features

When designing new features:
1. **Design test strategy first** - How will we verify it works?
2. **Use existing test infrastructure** - Don't reinvent
3. **Create test levels** - Small, focused levels for testing
4. **Test edge cases** - Rapid operations, stress tests, invalid data
5. **Automate everything** - No human verification needed

## Agent Usage Pattern

```
Bug reported
    ↓
Run tests (verify bug exists)
    ↓
db-runtime-analyst (trace execution)
    ↓
db-failure-analyst (identify attacks)
    ↓
Add instrumentation (based on findings)
    ↓
Fix iteratively (test after each)
    ↓
Comprehensive test (verify complete)
```

**Don't skip the analysis phase.**
