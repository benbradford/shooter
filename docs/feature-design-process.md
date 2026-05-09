# Feature Design Process - SOP

## Purpose

This document defines the process for going from a rough feature idea to a complete, unambiguous design that any Kiro session can implement without confusion.

## The Problem

Initial feature requests are often:
- Vague or incomplete
- Missing critical details
- Have hidden assumptions
- Lack technical specifications
- Unclear about edge cases

**Result**: Implementation gets stuck, requires constant clarification, wastes time.

---

## Phase 1: Initial Capture

### Input
- Rough feature description (can be informal)
- Example: "I want cutscenes with Lua scripts"

### Process
1. **Read the feature request** in `features/{feature-name}.md`
2. **Ask clarifying questions** about:
   - Core functionality
   - User experience
   - Technical approach
   - Integration points
3. **Identify unknowns** that need POC/research

### Output
- Basic understanding of what's needed
- List of technical unknowns
- Initial questions answered

---

## Phase 2: Technical POC

### Purpose
Validate technical approach before committing to design.

### When to Use POC

**Always POC when:**
- Using a new library/dependency for the first time
- Uncertain about browser API compatibility
- Performance/bundle size is a concern
- Integration pattern is unproven
- Technical approach has multiple unknowns

**Skip POC when:**
- Using well-established patterns from the codebase
- Extending existing systems with known behavior
- Technical approach is proven and documented

### Agent: db-poc

The **db-poc agent** handles all POC creation:
- Creates minimal test code (focus on answering specific questions)
- Tests specific technical questions
- Measures bundle size impact
- Documents findings
- Provides clear recommendations

**Invoked by:** db-design agent when technical unknowns are identified

### Process

1. **db-design identifies risky/unknown technologies**
   - Example: "Can we use Lua in browser?"
   - Outputs list of technical questions
   
2. **db-poc creates minimal tests**
   - Install package
   - Test core functionality
   - Test integration with existing code
   - Measure bundle size impact
   
3. **db-poc tests edge cases**
   - Example: "Can Lua await JS promises?"
   - Example: "Do parameters pass correctly?"
   
4. **db-poc documents results**
   - What works
   - What doesn't work
   - Workarounds needed
   - Bundle size impact

### Output
- `features/{feature}/poc-results.md` - Findings document
- `src/poc/{feature}/` - Test code (temporary, will be removed)
- Clear recommendation: PROCEED / REVISE / ABANDON

### Feedback Loop

**If POC succeeds:**
- db-design proceeds to Phase 3 (requirements)

**If POC fails:**
- Findings sent back to db-design Phase 1
- db-design revises approach with new constraints
- May trigger new POC with alternative approach

### Example: Interaction System POC

**Questions:**
1. Can wasmoon execute Lua in browser?
2. Can Lua call JS functions?
3. Can Lua await JS promises?
4. What's the bundle size impact?

**Tests performed:**
1. Basic Lua execution ✓
2. JS function calls from Lua ✓
3. JS object methods from Lua ✓
4. Parameter passing ✓
5. Async/await support ✗ (doesn't work)
6. Command queue approach ✓ (workaround)

**Bundle size:** +180kb

**Outcome:** Wasmoon works with command queue approach

**Recommendation:** PROCEED with command queue pattern

---

## Phase 3: Requirements Document

### Purpose
Define WHAT the system does (not HOW).

### Structure
```markdown
# {Feature} System Requirements

## Overview
Brief description

## POC Results
What was validated

## Phase 1: Core Infrastructure
### 1.1 Component/System Name
**Purpose**: What it does
**API**: Public interface
**Acceptance Criteria**: How to verify it works

## Phase 2: Feature X
...

## Files to Create
List of new files

## Files to Modify
List of changes to existing files
```

### Content Guidelines
- **Be specific**: Include code examples
- **Define interfaces**: Show exact API signatures
- **Acceptance criteria**: Clear, testable conditions
- **No implementation details**: Focus on WHAT, not HOW

### Output
- Complete functional specification
- All APIs defined
- Acceptance criteria for each component
- File structure

---

## Phase 4: Design Document

### Purpose
Define HOW the system works (architecture, data flow, implementation approach).

### Structure
```markdown
# {Feature} System Design

## Architecture Overview
Component diagram

## Data Flow
Step-by-step flow with code examples

## Component Design
### Component Name
**Purpose**: ...
**Key Methods**: ...
**Implementation**: Code examples

## State Management
How state changes

## Error Handling
How errors are handled

## Performance Considerations
Bundle size, execution speed

## Testing Strategy
How to verify it works
```

### Content Guidelines
- **Show data flow**: Diagrams and step-by-step
- **Include code examples**: Real implementation patterns
- **Explain decisions**: Why this approach?
- **Cover edge cases**: What happens when...?

### Output
- Complete architecture
- Implementation patterns
- Code examples
- Design decisions documented

---

## Phase 5: Runtime Analysis ⭐ NEW

### Purpose
Verify that the proposed design executes correctly at runtime by simulating execution step-by-step.

### Process
See `docs/runtime-analysis.md` for complete SOP.

**Key steps:**
1. Identify critical execution flows
2. Perform mechanical execution trace
3. Create lifecycle ownership table
4. Detect temporal coupling
5. Analyze async boundaries
6. Detect race conditions

### Output
- `features/{feature}/runtime-analysis.md`
- Execution traces
- Lifecycle ownership table
- Violations detected
- Fix recommendations

### Success Criteria
- ✅ No resource destroyed while referenced
- ✅ No async race conditions
- ✅ Lifecycle ownership clearly defined
- ✅ All execution flows trace correctly

**If any fail, design must be revised.**

---

## Phase 6: Failure Analysis ⭐ NEW

### Purpose
Stress-test the design by intentionally trying to break it.

### Process
See `docs/failure-analysis.md` for complete SOP.

**Key steps:**
1. Identify failure surfaces
2. Simulate edge cases
3. Perform timing attacks
4. Run resource stress tests
5. Test invalid states
6. Verify failure recovery

### Output
- `features/{feature}/failure-analysis.md`
- Failure scenarios
- Detected risks
- Mitigation strategies
- Confidence level

### Success Criteria
- ✅ Edge cases handled
- ✅ Timing attacks don't crash
- ✅ Resource stress stable
- ✅ Invalid states fail gracefully
- ✅ Recovery paths defined

**If any fail, design must be revised.**

---

## Phase 7: Scrutiny & Clarification

### Purpose
Find ALL ambiguities before implementation starts.

### Process
1. **Take a fresh look** at requirements and design
2. **Ask yourself**: "Could I implement this without asking questions?"
3. **Identify gaps**:
   - Missing specifications
   - Unclear behavior
   - Edge cases not covered
   - Integration points not defined
   - Error handling not specified
4. **List ALL questions** (don't hold back)
5. **Get answers** from user
6. **Update documents** with clarifications

### Critical Questions to Ask

**For each component:**
- How is it created?
- When is it destroyed?
- What are its dependencies?
- How does it integrate with existing systems?
- What happens on error?

**For each API:**
- Exact parameters and types?
- Return values?
- Error conditions?
- Edge cases?

**For each state:**
- How do we enter?
- How do we exit?
- What's paused?
- What continues?

**For each interaction:**
- How do components communicate?
- What's the data flow?
- What's the lifecycle?

### Output
- List of ALL ambiguities found
- Questions for user
- Updated documents after answers

### Example: Interaction System Scrutiny

**Questions asked**:
1. How does InteractionTriggerComponent trigger state? (Answer: Call scene.startInteraction())
2. How do we pause game? (Answer: EntityManager checks scene.isInInteraction flag)
3. When is InteractionComponent added? (Answer: Always present, dormant until activated)
4. How to render multi-color text? (Answer: Multiple text objects side-by-side)
5. How to implement gradient? (Answer: Border instead, simpler)
6. Does wasmoon await promises? (Answer: No, use command queue)
... (10 total critical questions)

**Outcome**: All ambiguities resolved, implementation can proceed smoothly

---

## Phase 8: Task Breakdown

### Purpose
Break design into implementable tasks with time estimates.

### Structure
```markdown
# {Feature} System - Task Breakdown

## ✅ Completed
- [x] POC tasks
- [x] Documentation tasks

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

### Content Guidelines
- **One task = one file or one logical change**
- **Subtasks are concrete actions**
- **Dependencies are explicit**
- **Time estimates are realistic**
- **Include code examples** for complex tasks

### Output
- Complete task list
- Time estimates
- Dependency graph
- Risk areas identified

---

## Phase 9: Implementation Clarifications Document

### Purpose
Capture all design decisions and patterns in one place for quick reference.

### Structure
```markdown
# {Feature} - Implementation Clarifications

## Critical Design Decisions (Finalized)
### 1. Decision Name ✓
- **What**: Brief description
- **Why**: Reasoning
- **How**: Implementation approach

## API Summary
Quick reference of all APIs

## Implementation Order
Phases with time estimates

## Key Patterns to Follow
Code patterns with examples

## Testing Strategy
How to verify

## Success Criteria
Checklist of completion
```

### Content Guidelines
- **Concise**: One-page reference
- **Actionable**: Code patterns, not theory
- **Complete**: All decisions in one place
- **Clear**: No ambiguity

### Output
- Quick reference guide
- All decisions in one place
- Patterns and examples
- Success checklist

---

## Phase 10: README for Future Sessions

### Purpose
Guide future Kiro sessions to read documents in the right order.

### Structure
```markdown
# {Feature} Implementation Guide

## For New Kiro Sessions

### Quick Start
What to say to Kiro

### What's Already Done
Checklist of completed work

### Key Documents (Read in Order)
1. README (this file)
2. implementation-clarifications.md ⭐
3. requirements.md
4. design.md
5. runtime-analysis.md ⭐
6. failure-analysis.md ⭐
7. tasks.md

### Critical Design Decisions
Summary of key points

### Example Usage
Code examples

### Success Criteria
How to know it's done
```

### Output
- Entry point for future sessions
- Reading order specified
- Key points summarized

---

## Phase 11: During Implementation

### Mark Tasks Complete

**As you complete each task**, update the tasks document:

```markdown
### Task 1.1: Add Interaction Entity Type ✅
**Subtasks**:
- [x] Add `'interaction'` to `EntityType` union
- [x] Add case in EntityLoader
- [x] Create entity factory
```

**Why this matters**:
- Shows progress clearly
- Helps resume if interrupted
- Documents what's actually done
- Validates against original plan

**When to mark complete**:
- After task builds successfully
- After task passes lint
- After manual testing confirms it works

---

## Phase 12: Post-Implementation

### Create Completion Summary

After all tasks complete, create `{feature}-tasks-COMPLETE.md`:
- Mark all tasks as done
- Document actual vs estimated time
- List all files created/modified
- Note any deviations from plan
- Capture lessons learned

**Example**: `features/interactions/interaction-system-tasks-COMPLETE.md`

---

## Checklist: Is Design Complete?

Before starting implementation, verify:

- [ ] **POC completed** - Technical approach validated
- [ ] **Requirements written** - All APIs defined with acceptance criteria
- [ ] **Design documented** - Architecture and data flow clear
- [ ] **Runtime analysis performed** - Execution flows verified ⭐
- [ ] **Failure analysis performed** - Edge cases and stress tests passed ⭐
- [ ] **Scrutiny performed** - All ambiguities identified and resolved
- [ ] **Tasks broken down** - Concrete, estimable tasks
- [ ] **Clarifications captured** - All decisions in one document
- [ ] **README created** - Future sessions know where to start
- [ ] **User approval** - All questions answered, design approved

**If any checkbox is unchecked, DO NOT START IMPLEMENTATION.**

---

## Anti-Patterns to Avoid

- ❌ **Starting implementation too early** — Complete all phases first
- ❌ **Assuming instead of asking** — Ask ALL questions, even "obvious" ones
- ❌ **Skipping scrutiny** — Take fresh look, find ALL gaps before starting
- ❌ **Incomplete documentation** — Document everything, include code examples
- ❌ **No POC for risky tech** — POC first, validate approach

---

## Example: Interaction System

Design took ~2 hours. Implementation took 3 hours (vs 26-34 hour estimate — 87% time savings). Key: POC validated wasmoon, 12+ rounds of clarifying questions, 10 critical gaps found during scrutiny.

---

## Template: Starting a New Feature

**User says**: "I want feature X"

**Kiro responds**:
> "Let me create a complete design following our feature design process. I'll:
> 1. Delegate to db-design for clarifying questions
> 2. Delegate to db-poc if technical unknowns exist
> 3. db-design writes requirements and design documents
> 4. Delegate to db-runtime-analyst and db-failure-analyst for validation
> 5. Iterate until both analyses pass
> 6. Create task breakdown and implementation guide
>
> This will take 1-3 hours but will save 10-20 hours during implementation. Ready to start?"

**Workflow:**
```
User: "I want feature X"
  ↓
Kiro delegates to db-design
  ↓
db-design Phase 1: Clarifying questions
  ↓
Technical unknowns? 
  ↓ YES                    ↓ NO
Kiro delegates to db-poc   Skip to Phase 3
  ↓
POC results?
  ↓ PROCEED              ↓ REVISE
Phase 3: Requirements    Back to Phase 1
  ↓
Phase 4: Design
  ↓
Kiro delegates to analysts (parallel)
  ↓
Both pass?
  ↓ YES              ↓ NO
Phase 8: Tasks       Revise design
```

---

## Success Metrics

A design is complete when:
- ✅ Any developer can implement without asking questions
- ✅ All edge cases are specified
- ✅ All error conditions are handled
- ✅ All integration points are defined
- ✅ Time estimate is realistic
- ✅ POCs validate risky assumptions
- ✅ User has approved all decisions
