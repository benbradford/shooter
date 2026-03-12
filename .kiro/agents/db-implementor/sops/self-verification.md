# SOP: Self-Verification Before Completion

## Purpose

Before marking any task complete, verify that ALL requirements are met and nothing was missed.

## When to Use

**ALWAYS run this before marking task complete.**

No exceptions. Even if you think everything is done.

## Verification Checklist

### 1. Task Requirements Met

**Check against tasks.md:**
- [ ] All subtasks completed
- [ ] All files created/modified as specified
- [ ] Dependencies satisfied

**Ask yourself:**
- Did I create every file listed?
- Did I modify every file listed?
- Did I complete every subtask?

### 2. Design Specification Met

**Check against design.md:**
- [ ] Implementation matches design specification
- [ ] All APIs implemented as specified
- [ ] All behaviors implemented as specified

**Ask yourself:**
- Does my code match the design.md examples?
- Did I implement all methods shown in design?
- Did I follow the exact patterns specified?

### 3. Acceptance Criteria Met

**Check against requirements.md:**
- [ ] All acceptance criteria satisfied
- [ ] Edge cases handled
- [ ] Error conditions handled

**Ask yourself:**
- Can I verify each acceptance criterion?
- Did I handle all edge cases mentioned?
- Did I add error handling where specified?

### 4. Scripts/Tools Actually Work

**If task created scripts:**
- [ ] Script has CLI interface
- [ ] Script can be run from command line
- [ ] Script produces expected output
- [ ] Script handles errors gracefully

**Test:**
```bash
node scripts/{script}.js --help  # Should show usage
node scripts/{script}.js {args}  # Should work
```

### 5. Integration Points Complete

**Check integration:**
- [ ] Exports added to index.ts (if component)
- [ ] Imports added where needed
- [ ] Agent instructions reference new scripts (if applicable)
- [ ] Documentation updated (if applicable)

**Ask yourself:**
- Can other code use what I created?
- Are all integration points connected?
- Did I update all files that reference this?

### 6. Nothing Missed

**Review task one more time:**
- [ ] Re-read task description
- [ ] Re-read all subtasks
- [ ] Check for implicit requirements

**Ask yourself:**
- Is there anything implied but not explicit?
- Did I make any assumptions?
- Is there related functionality I should have added?

### 7. Quality Check

**Code quality:**
- [ ] Follows coding standards
- [ ] Pattern checks pass
- [ ] Build passes
- [ ] Lint passes
- [ ] No TODO comments left

**Ask yourself:**
- Would this pass code review?
- Is this the minimal implementation?
- Did I follow existing patterns?

### 8. User Intent Check

**Step back and ask:**
- [ ] Does this achieve what the user wanted?
- [ ] Is the end state correct?
- [ ] Would the user be satisfied with this?

**Critical questions:**
- If the user tested this right now, would it work?
- Did I deliver what was asked for?
- Is anything incomplete or half-done?

## Red Flags (Stop and Fix)

🚨 **If ANY of these are true, DO NOT mark complete:**

- Script exists but doesn't have CLI interface
- Script runs but doesn't produce output
- Function exported but not used anywhere
- File created but not referenced
- Agent instructions don't mention new scripts
- Build passes but functionality doesn't work
- Test generated but can't run
- Integration points not connected

## Self-Correction Questions

**Before marking complete, ask yourself:**

1. **"If I were the user, would I be satisfied?"**
   - If no: What's missing?

2. **"Can someone else use what I built?"**
   - If no: What integration is missing?

3. **"Did I test this actually works?"**
   - If no: Test it now

4. **"Is there anything incomplete?"**
   - If yes: Complete it now

5. **"Did I follow the spec exactly?"**
   - If no: Why not? Is spec wrong or did I miss something?

## Example: test-generator.js

**Initial implementation:**
- ✅ Has selectTemplate()
- ✅ Has generateTest()
- ✅ Has CLI interface
- ❌ CLI only shows template type
- ❌ Doesn't write test file
- ❌ Doesn't write level file

**Self-verification catches:**
- "Can someone use this script?" → No, it doesn't write files
- "Does this achieve what was asked?" → No, incomplete
- "Would user be satisfied?" → No, doesn't work

**Fix:**
- Add file writing to CLI
- Add directory creation
- Add error handling
- Test it works

**Now:**
- ✅ Complete and functional

## Reporting Verification

**Before generating report, verify:**
- [ ] All items in report are accurate
- [ ] Screenshots actually exist
- [ ] Tests actually ran
- [ ] Pattern checks actually passed
- [ ] Files actually created

**Don't report:**
- ✅ Test generated (if file doesn't exist)
- ✅ Screenshot captured (if file doesn't exist)
- ✅ Pattern checks passed (if you didn't run them)

## Success Criteria

Only mark complete when:
- ✅ All 8 verification checks pass
- ✅ No red flags present
- ✅ Self-correction questions answered positively
- ✅ Actually tested the implementation
- ✅ User would be satisfied

## Final Question

**Before marking complete, ask:**

**"If the user asked me right now to demonstrate this working, could I?"**

- If YES: Mark complete
- If NO: Fix what's missing first
