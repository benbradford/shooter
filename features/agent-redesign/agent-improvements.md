# Agent Improvements - Based on Level Loading Experience

## For db-runtime-analyst

### Add: Integration Test Verification Step

**Current:** Traces execution on paper
**Should add:** Run integration tests to verify bugs exist

**New step in SOP:**
```markdown
### Step 0: Verify Bug Exists

Before analyzing, verify the bug is real:
1. Check if integration tests exist for this feature
2. Run tests to reproduce the bug
3. Capture actual error messages and stack traces
4. Use test output as ground truth for analysis

If tests pass, the bug may not exist or may be theoretical.
```

### Add: Simple Fixes First Checklist

**Before recommending complex solutions, check:**
- [ ] Configuration mismatches (texture keys, asset groups)
- [ ] State management issues (flags not set, state reset)
- [ ] Timing issues (operations in wrong order)
- [ ] Missing cleanup (display objects not destroyed)

**Only recommend architectural changes if simple fixes don't apply.**

## For db-failure-analyst

### Add: Test-Driven Attack Scenarios

**Current:** Describes attacks theoretically
**Should add:** Create actual test code for each attack

**New output format:**
```markdown
## Attack 1: Rapid Transitions

### Test Code
\`\`\`javascript
// test/tests/{feature}/test-rapid-transitions.js
const testRapidTransitions = test({
  given: 'Player in level',
  when: 'Triggering 5 transitions rapidly',
  then: 'Only first executes, others ignored'
}, async (page) => {
  // Test implementation
});
\`\`\`

### Expected: First transition executes, others ignored
### Actual: All 5 queue, crash
### Risk: HIGH
### Mitigation: Add transition lock
```

**Benefit:** Tests can be run immediately to verify attacks work

## For db-design

### Add: Prerequisite Analysis Step

**Before creating design, check:**
1. Do integration tests exist for similar features?
2. What patterns do existing tests use?
3. Can we reuse test infrastructure?

**Add to instructions:**
```markdown
## Step 0: Survey Test Infrastructure

Before designing, check:
- What integration tests exist?
- What test patterns are used?
- Can we test this feature automatically?
- What test levels exist?

Design should include test strategy using existing infrastructure.
```

### Add: Simplicity Bias

**Add to principles:**
```markdown
## Principle: Simple First, Complex If Needed

Before proposing architectural changes:
1. Check for configuration issues
2. Check for state management issues  
3. Check for timing issues
4. Check for cleanup issues

Only propose complex solutions if simple fixes don't apply.

**Red flags for over-engineering:**
- Proposing new systems when existing ones work
- Adding abstractions without clear benefit
- Recommending rewrites for config issues
```

## For dodging-bullets (Coordinator)

### Add: Mandatory Test Verification

**Before delegating to design agent:**
```markdown
## Step 1: Verify Bug With Tests

If user reports a bug:
1. Check if integration tests exist
2. Run tests to reproduce
3. Capture error messages
4. Pass test output to design agent

Don't design solutions for unverified bugs.
```

### Add: Iterative Fix Protocol

**When fixing bugs:**
```markdown
## Iterative Fix Protocol

1. Reproduce bug with test
2. Add minimal instrumentation
3. Fix one bug
4. Run tests
5. Repeat until all tests pass
6. Remove instrumentation
7. Final test run

Never fix multiple bugs at once.
```
