# SOP: Research and Evaluate Architectural Approaches

## Purpose

Before committing to a design, research industry patterns and evaluate multiple approaches with honest pros/cons and confidence levels.

## When to Use

**Always use this SOP before creating requirements.md.** Every feature deserves exploration.

## Process

### Step 1: Understand the Problem Space

**Questions to answer:**
- What is the core problem we're solving?
- What are the constraints (performance, memory, platform)?
- What are the user's priorities (speed vs robustness vs scalability)?
- What similar problems exist in game development?

**Output:** Clear problem statement

---

### Step 2: Research Industry Patterns

**Research sources:**
- **Similar games**: How do Zelda, Hollow Knight, Hades, Stardew Valley solve this?
- **Game engines**: What do Unity, Unreal, Godot recommend?
- **Web games**: What patterns work in browser environments?
- **Design patterns**: What classic patterns apply?

**Questions to answer:**
- How do AAA games handle this?
- How do indie games handle this?
- What are the proven, battle-tested solutions?
- What are the common pitfalls?

**Output:** Summary of industry approaches with references

---

### Step 3: Generate 3-5 Approaches

**Required variety:**
- **Conservative**: Minimal changes to existing code
- **Radical**: Major refactor or architectural shift
- **Industry Standard**: Proven pattern from research
- **Hybrid**: Combination of patterns
- **Novel**: Creative solution specific to this codebase

**For each approach, define:**
- **Name**: Descriptive (e.g., "Loading Scene Pipeline", "Asset Manager with Streaming")
- **Type**: Conservative/Radical/Industry Standard/Hybrid/Novel
- **How it works**: 2-3 paragraph explanation
- **Key components**: What needs to be built
- **Integration points**: How it fits with existing code

**Output:** 3-5 distinct approaches

---

### Step 4: Evaluate Each Approach

**For each approach, document:**

**Pros (3-5 specific benefits):**
- What does this do well?
- What problems does it solve?
- What future features does it enable?

**Cons (3-5 specific drawbacks):**
- What are the downsides?
- What complexity does it add?
- What doesn't it solve?

**Confidence Level (0-100%):**
- How certain are you this will work?
- What are the risks?
- What could go wrong?
- Be honest - if you're 60% confident, say so

**Time Estimate:**
- Hours/days/weeks to implement
- Include testing and debugging time
- Pad by 50% for unknowns

**Complexity (Low/Medium/High):**
- How hard is this to implement?
- How hard is this to maintain?
- How hard is this to debug?

**Scalability (Poor/Good/Excellent):**
- How well does it handle 10x growth?
- What breaks first as game grows?
- What needs to change for 100+ levels?

**Robustness (Fragile/Solid/Bulletproof):**
- How many edge cases are handled?
- How likely to break with changes?
- How well does it handle errors?

**Output:** Complete evaluation for each approach

---

### Step 5: Create Comparison

**Action:** Create side-by-side comparison table

**Format:**
```markdown
| Approach | Confidence | Time | Complexity | Scalability | Robustness | Key Benefit | Key Drawback |
|----------|-----------|------|------------|-------------|------------|-------------|--------------|
| Approach 1 | 85% | 8h | Medium | Good | Solid | Clean separation | Scene overhead |
| Approach 2 | 60% | 15h | High | Excellent | Solid | Scales infinitely | Very complex |
| Approach 3 | 95% | 2h | Low | Poor | Fragile | Fast to implement | Doesn't scale |
```

**Output:** Clear visual comparison

---

### Step 6: Make Bold Recommendation

**Don't hedge. Pick the best approach and defend it.**

**Structure:**
```markdown
## Recommendation: Approach X

**Why this is the right choice:**
1. Reason 1 (with evidence)
2. Reason 2 (with evidence)
3. Reason 3 (with evidence)

**Trade-offs we're accepting:**
- Trade-off 1 (why it's worth it)
- Trade-off 2 (why it's worth it)

**Confidence:** X%

**Why not the others:**
- Approach Y: Reason it's worse
- Approach Z: Reason it's worse

**If user prioritizes speed:** Consider Approach Y instead
**If user prioritizes robustness:** Stick with Approach X
```

**Key points:**
- Be decisive - don't say "either could work"
- Explain reasoning clearly
- Acknowledge trade-offs honestly
- Provide confidence level
- Consider user's stated priorities

**If user wants robustness:** Recommend the robust solution even if it takes weeks
**If user wants speed:** Recommend the fast solution even if it's not perfect

**Output:** Clear, bold recommendation

---

### Step 7: Get User Approval

**Present to user:**
1. Show all approaches with pros/cons
2. Show comparison table
3. State your recommendation clearly
4. Ask: "Which approach should we pursue?"

**If user questions recommendation:**
- Defend your reasoning
- Provide more evidence
- Consider their feedback
- Revise if they have valid concerns

**If user rejects all approaches:**
- Ask what they're looking for
- Research more
- Generate new approaches
- Repeat process

**Output:** User-approved approach

---

### Step 8: Create approaches.md

**Action:** Document all research and evaluation

**Save to:** `features/{feature-name}/approaches.md`

**Content:**
- Industry research summary
- All approaches evaluated
- Comparison table
- Recommendation with reasoning
- User's decision

**Why save this:**
- Documents why we chose this approach
- Helps future sessions understand trade-offs
- Shows alternatives that were considered
- Prevents revisiting rejected approaches

**Output:** Complete approaches.md file

---

## Verification Checklist

Before proceeding to requirements.md:

- [ ] Researched industry patterns
- [ ] Generated 3+ approaches (including radical options)
- [ ] Evaluated pros/cons for each
- [ ] Provided honest confidence levels
- [ ] Created comparison table
- [ ] Made bold recommendation
- [ ] Got user approval
- [ ] Saved approaches.md

## Common Pitfalls

### ❌ Only Presenting One Approach
**Problem:** User doesn't see alternatives
**Solution:** Always generate 3+ approaches

### ❌ Being Too Conservative
**Problem:** Miss better solutions by avoiding complexity
**Solution:** Include radical approaches, be bold

### ❌ Hedging on Recommendation
**Problem:** User doesn't know what to choose
**Solution:** Pick one and defend it clearly

### ❌ Ignoring User Priorities
**Problem:** Recommend fast solution when user wants robust
**Solution:** Listen to what user values (speed/robustness/scalability)

### ❌ Low Confidence Without Explanation
**Problem:** User doesn't understand risks
**Solution:** Explain why confidence is low and what could go wrong

### ❌ Skipping Research
**Problem:** Reinventing the wheel, missing proven patterns
**Solution:** Always research how others solved this

## Success Criteria

Research is complete when:
- ✅ Industry patterns documented
- ✅ 3+ approaches generated
- ✅ Honest pros/cons for each
- ✅ Confidence levels provided
- ✅ Bold recommendation made
- ✅ User approved approach
- ✅ approaches.md saved

## Example Output

```markdown
## Architectural Approaches Evaluated

**Industry Research:**
- Zelda: Dedicated loading scenes with door transitions
- Hollow Knight: Gate transitions hide loading
- Unity: Scene-based loading with async operations

**Approach 1: Loading Scene Pipeline (Industry Standard)**
- Confidence: 85%
- Time: 8-12 hours
- Complexity: Medium
- Pros: Clean separation, proven pattern, handles errors
- Cons: Scene transition overhead, more code

**Approach 2: Preload All Assets (Radical)**
- Confidence: 95%
- Time: 1-2 hours
- Complexity: Low
- Pros: Simplest, bulletproof, instant transitions
- Cons: Doesn't scale, initial load slower

**Approach 3: Asset Manager with Streaming (Complex)**
- Confidence: 70%
- Time: 20-25 hours
- Complexity: High
- Pros: Scales infinitely, memory efficient
- Cons: Very complex, many edge cases

**Recommendation: Approach 1 (Loading Scene Pipeline)**
- Best balance of robustness and complexity
- Proven pattern from industry
- Scales to 50+ levels
- 85% confidence it solves the problem
```

---

## Integration with Existing SOP

After completing this step and getting user approval:
1. Proceed to "Create requirements.md" (existing step 1)
2. Continue with rest of create-spec.md SOP
3. Reference approved approach throughout requirements/design

