# SOP: Create Feature Specification

## Purpose

Create complete feature specification with requirements, design, and task breakdown following the feature design process.

## 🚨 CRITICAL RULE: Document Consistency 🚨

**ANY change to tasks.md MUST trigger updates to requirements.md, design.md, and scrutiny.md.**

**Why:** The documents form a complete specification. If tasks change, the requirements/design/scrutiny are now out of sync and incomplete.

**When this applies:**
- Adding new tasks (e.g., Phase 0 refactors)
- Removing tasks (scope reduction)
- Changing task approach (different implementation)
- Splitting/merging tasks
- Reordering phases

**What to do:**
1. Update tasks.md with changes
2. **IMMEDIATELY update requirements.md** - Add/remove/modify requirements
3. **IMMEDIATELY update design.md** - Add/remove/modify design sections
4. **IMMEDIATELY update scrutiny.md** - Add/remove/modify questions
5. Verify all documents are consistent

**Don't:**
- Update only tasks.md and stop
- Assume other documents are "close enough"
- Wait for user to ask about other documents

**Remember:** If you change the WHAT (tasks), you must update the WHY (requirements), HOW (design), and GAPS (scrutiny).

## Prerequisites

- Feature has been disambiguated (all questions answered)
- Technical POCs completed (if needed)
- User has approved approach

## Steps

### 0. Research and Evaluate Approaches (NEW - CRITICAL)

**Action:** Before writing any specs, research and evaluate multiple architectural approaches

**Process:**

1. **Research Industry Patterns**
   - How do similar games solve this problem? (Zelda, Hollow Knight, Hades, etc.)
   - What are the proven, battle-tested patterns?
   - What do game engines (Unity, Unreal, Godot) recommend?
   - What patterns exist in web game development?

2. **Generate 3-5 Approaches**
   - At least one "conservative" approach (minimal changes)
   - At least one "radical" approach (major refactor)
   - At least one "industry standard" approach (proven pattern)
   - Be bold - don't shy away from complex solutions if they're right

3. **For Each Approach, Document:**
   - **How it works** (1-2 paragraph summary)
   - **Pros** (3-5 specific benefits)
   - **Cons** (3-5 specific drawbacks)
   - **Confidence level** (0-100%) - Will this actually work?
   - **Time estimate** (hours/days/weeks)
   - **Complexity** (Low/Medium/High)
   - **Scalability** (How well does it handle growth?)
   - **Robustness** (How bulletproof is it?)

4. **Compare and Contrast**
   - Create comparison table
   - Identify trade-offs
   - Consider user's priorities (speed vs robustness vs scalability)
   - Be honest about risks

5. **Make Bold Recommendation**
   - Don't hedge - pick the best approach
   - Explain WHY it's the best choice
   - Acknowledge trade-offs
   - Provide confidence level
   - If user wants robustness over speed, recommend the robust solution (even if complex)

**Output:** Create `approaches.md` in feature directory with:
```markdown
# {Feature} - Architectural Approaches

## Industry Research
How similar games/engines solve this

## Approach 1: {Name}
**Type:** Conservative/Radical/Industry Standard
**Confidence:** X%
**Time:** Y hours
**Complexity:** Low/Medium/High

### How It Works
...

### Pros
- Benefit 1
- Benefit 2

### Cons
- Drawback 1
- Drawback 2

### Scalability
...

### Robustness
...

## Approach 2: {Name}
...

## Comparison Table
| Approach | Confidence | Time | Complexity | Scalability | Robustness |
|----------|-----------|------|------------|-------------|------------|
| ...      | ...       | ...  | ...        | ...         | ...        |

## Recommendation
**Choose Approach X because:**
- Reason 1
- Reason 2
- Reason 3

**Trade-offs accepted:**
- Trade-off 1
- Trade-off 2

**Confidence:** X%
```

**Verification:**
- [ ] Researched industry patterns
- [ ] Generated 3+ approaches
- [ ] Documented pros/cons for each
- [ ] Provided confidence levels
- [ ] Made bold recommendation
- [ ] **Analyzed existing code for refactor needs** ⭐
- [ ] **Proposed prerequisite refactors (if any)** ⭐
- [ ] User approved approach

**Common issues:** 
- Only presenting one approach (not enough exploration)
- Being too conservative (not bold enough)
- Hedging on recommendation (pick one!)
- Low confidence without explaining why
- **Assuming existing code is perfect (challenge it!)** ⭐

---

### 0.5. Analyze Existing Code for Refactor Needs ⭐ NEW

**Action:** Review existing code that the feature will integrate with

**Critical mindset:** Existing code is NOT perfect. If it has problems that would make the feature brittle, say so boldly.

**Process:**

1. **Identify Integration Points**
   - What existing files/components will this feature touch?
   - What systems will it depend on?
   - What patterns will it need to follow?

2. **Analyze Code Quality**
   - Does it follow SOLID principles?
   - Are there code smells?
   - Is it brittle or robust?
   - Are there known bugs?

3. **Identify Problems**
   - What would make implementing the feature harder?
   - What constraints are artificial (bad design)?
   - What would we need to work around?
   - What technical debt exists?

4. **Estimate Impact**
   - How much harder does bad code make the feature?
   - Would feature be 2x simpler with refactor?
   - Would feature be more robust with refactor?

5. **Propose Refactors**
   - What should be fixed first?
   - How long would refactor take?
   - How much simpler does feature become?

**For each refactor, document:**
```markdown
### Prerequisite Refactor: {Name}

**Current Problem:**
What's wrong with existing code (be specific)

**Why It Matters:**
How it affects the new feature

**Proposed Solution:**
What to refactor and how

**Time Estimate:** X hours

**Benefit:**
- Feature becomes Y% simpler
- Eliminates Z workarounds
- Fixes existing bug/smell

**Confidence:** X% this is the right call

**Recommendation:** Do this BEFORE implementing feature
```

**Output:** Add "Prerequisite Refactors" section to approaches.md (or separate refactors.md if many)

**Verification:**
- [ ] Analyzed all integration points
- [ ] Identified code smells and violations
- [ ] Proposed refactors with clear reasoning
- [ ] Estimated refactor time honestly
- [ ] Explained benefits quantitatively
- [ ] Made bold recommendation (refactor vs work around)

**Common issues:**
- Being timid about criticizing existing code
- Assuming existing patterns are correct
- Not analyzing integration points deeply enough
- Proposing workarounds instead of fixes

---

### 1. Create requirements.md

**Action:** Define WHAT the system does (not HOW)

**Structure:**
```markdown
# {Feature} System Requirements

## Overview
Brief description

## POC Results (if applicable)
What was validated

## Phase 1: Core Infrastructure
### 1.1 Component/System Name
**Purpose**: What it does
**API**: Public interface
**Acceptance Criteria**: How to verify

## Phase 2: Feature X
...

## Files to Create
List of new files

## Files to Modify
List of changes
```

**Content guidelines:**
- Be specific with code examples for APIs
- Define interfaces and types
- Clear acceptance criteria per component
- No implementation details (focus on WHAT)

**Verification:** 
- [ ] All APIs defined
- [ ] Acceptance criteria clear
- [ ] No HOW, only WHAT

**Common issues:** Including implementation details - keep focused on interface

---

### 2. Create design.md

**Action:** Define HOW the system works

**Structure:**
```markdown
# {Feature} System Design

## Architecture Overview
Component diagram or description

## Data Flow
Step-by-step with examples

## Component Design
### Component Name
**Purpose**: ...
**Key Methods**: ...
**Implementation approach**: ...

## State Management
How state changes

## Error Handling
How errors are handled

## Performance Considerations
Bundle size, execution speed

## Testing Strategy
How to verify
```

**Content guidelines:**
- Show data flow with examples
- Include implementation patterns
- Explain design decisions (WHY)
- Cover edge cases

**Verification:**
- [ ] Architecture clear
- [ ] Data flow documented
- [ ] Implementation patterns shown
- [ ] Design decisions explained

**Common issues:** Being too vague - include concrete examples

---

### 3. Scrutinize for Ambiguities

**Action:** Take fresh look and find ALL gaps

**Questions to ask:**
- Could I implement this without asking questions?
- Are all parameters and types defined?
- Are all error conditions handled?
- Are all integration points specified?
- Are all state transitions clear?

**For each component:**
- How is it created?
- When is it destroyed?
- What are its dependencies?
- How does it integrate?
- What happens on error?

**For each API:**
- Exact parameters and types?
- Return values?
- Error conditions?
- Edge cases?

**Verification:**
- [ ] No ambiguous behavior
- [ ] All types defined
- [ ] All error conditions specified
- [ ] All integration points clear

**Common issues:** Assuming things are "obvious" - make everything explicit

---

### 4. Create tasks.md

**Action:** Break design into implementable tasks with estimates

**Structure:**
```markdown
# {Feature} System - Task Breakdown

## Phase 1: {Phase Name}

### Task 1.1: {Task Name}
**File**: path/to/file.ts

**Subtasks**:
- [ ] Specific action 1
- [ ] Specific action 2

**Dependencies**: Task X.Y

**Estimated Time**: X hours

---

## Total Estimated Time
Sum of all phases

## Critical Path
Which tasks block others

## Risk Areas
Complex/uncertain tasks
```

**Task guidelines:**
- One task = one file or one logical change
- Subtasks are concrete actions
- Dependencies explicit
- Time estimates realistic (pad by 50%)

**Verification:**
- [ ] All tasks have estimates
- [ ] Dependencies identified
- [ ] Critical path clear
- [ ] Risk areas noted

**Common issues:** Tasks too large - break into smaller pieces

---

### 5. Create README.md

**Action:** Create entry point for future Kiro sessions

**Structure:**
```markdown
# {Feature} Implementation Guide

## For New Kiro Sessions

### Quick Start
What to say to Kiro

### What's Already Done
Checklist

### Key Documents (Read in Order)
1. README (this file)
2. requirements.md
3. design.md
4. tasks.md

### Critical Design Decisions
Summary of key points

### Success Criteria
How to know it's done
```

**Verification:**
- [ ] Clear entry point
- [ ] Reading order specified
- [ ] Key decisions summarized

---

### 6. Check for Refactor Needs

**Action:** Identify if feature needs architectural changes

**Red flags:**
- Feature doesn't fit existing component model
- Requires duplicating logic across multiple places
- Needs global state or singletons (beyond existing ones)
- Conflicts with existing patterns
- Would create tight coupling

**If refactor needed:**
1. Document current architecture limitation
2. Propose refactor approach
3. Estimate refactor time
4. Compare to hack approach
5. Recommend refactor with reasoning

**Verification:**
- [ ] Architectural fit assessed
- [ ] Refactor needs identified (if any)
- [ ] Trade-offs documented

**Common issues:** Accepting hacks to avoid refactors - be honest about technical debt

---

### Step 9: Maintain Document Consistency 🚨 CRITICAL

**Action:** Ensure all documents remain consistent after any changes

**When this applies:**
- Added/removed tasks
- Changed task approach
- Added prerequisite refactors
- Reordered phases
- Any scope change

**Process:**
1. Identify what changed in tasks.md
2. Update requirements.md to match (add/remove requirements)
3. Update design.md to match (add/remove design sections)
4. Update scrutiny.md to match (add/remove questions)
5. Cross-check all documents for consistency

**See:** `maintain-consistency.md` SOP for detailed process

**Verification:**
- [ ] Every task has corresponding requirement
- [ ] Every task has design section
- [ ] Every task has scrutiny questions
- [ ] No orphaned content
- [ ] Phase numbers consistent
- [ ] Time estimates consistent

**Common mistake:** Updating only tasks.md and stopping. **Don't do this.**

---

## Final Verification

- [ ] requirements.md complete (WHAT)
- [ ] design.md complete (HOW)
- [ ] scrutiny.md complete (GAPS)
- [ ] tasks.md complete (breakdown)
- [ ] README.md complete (entry point)
- [ ] **All documents are consistent** ⭐ (if tasks changed, requirements/design/scrutiny updated)
- [ ] All ambiguities resolved
- [ ] Refactor needs identified
- [ ] User has approved spec

## Output

Create all files in `features/{feature-name}/`:
- `requirements.md`
- `design.md`
- `tasks.md`
- `README.md`

Report to main agent:
```markdown
## Feature Spec Complete: {Feature Name}

**Location:** features/{feature-name}/

**Documents created:**
- requirements.md - 4 components, 12 acceptance criteria
- design.md - Architecture, data flow, patterns
- tasks.md - 8 tasks, 12-16 hour estimate

**Key decisions:**
1. Decision 1
2. Decision 2

**Refactor recommendations:**
- [If any] Refactor X needed because Y

**Ready for implementation:** Yes/No
**Estimated time:** X-Y hours
```

## Common Issues

**Incomplete requirements:**
- Symptom: Implementation gets stuck with questions
- Solution: More scrutiny in step 3

**Vague design:**
- Symptom: Multiple valid interpretations
- Solution: Add concrete examples in design.md

**Missing refactor:**
- Symptom: Feature gets hacked in, creates technical debt
- Solution: Be more critical in step 6, suggest refactors

**Unrealistic estimates:**
- Symptom: Implementation takes 3x longer than estimated
- Solution: Pad estimates by 50%, account for testing/debugging
