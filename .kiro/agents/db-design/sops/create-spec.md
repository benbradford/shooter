# SOP: Create Feature Specification

## Purpose

Create complete feature specification with requirements, design, and task breakdown following the feature design process.

## Prerequisites

- Feature has been disambiguated (all questions answered)
- Technical POCs completed (if needed)
- User has approved approach

## Steps

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

## Final Verification

- [ ] requirements.md complete (WHAT)
- [ ] design.md complete (HOW)
- [ ] tasks.md complete (breakdown)
- [ ] README.md complete (entry point)
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
