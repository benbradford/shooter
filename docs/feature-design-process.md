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

## The Solution: Structured Design Process

Follow these phases to create a complete, implementable design.

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

### Process
1. **Identify risky/unknown technologies**
   - Example: "Can we use Lua in browser?"
   
2. **Create minimal POC**
   - Install package
   - Test core functionality
   - Test integration with existing code
   - Measure bundle size impact
   
3. **Test edge cases**
   - Example: "Can Lua await JS promises?"
   - Example: "Do parameters pass correctly?"
   
4. **Document results**
   - What works
   - What doesn't work
   - Workarounds needed
   - Bundle size impact

### Output
- Validated technical approach
- Known limitations
- Workarounds identified
- POC code (temporary, will be removed)

### Example: Interaction System POC

**Tests performed**:
1. Basic Lua execution ✓
2. JS function calls from Lua ✓
3. JS object methods from Lua ✓
4. Parameter passing ✓
5. Async/await support ✗ (doesn't work)
6. Command queue approach ✓ (workaround)

**Outcome**: Wasmoon works with command queue approach

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

## Phase 5: Scrutiny & Clarification

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

## Phase 6: Task Breakdown

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

## Phase 7: Implementation Clarifications Document

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

## Phase 8: README for Future Sessions

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
5. tasks.md

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

## Phase 9: During Implementation

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

## Phase 10: Post-Implementation

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
- [ ] **Scrutiny performed** - All ambiguities identified and resolved
- [ ] **Tasks broken down** - Concrete, estimable tasks
- [ ] **Clarifications captured** - All decisions in one document
- [ ] **README created** - Future sessions know where to start
- [ ] **User approval** - All questions answered, design approved

**If any checkbox is unchecked, DO NOT START IMPLEMENTATION.**

---

## Anti-Patterns to Avoid

### ❌ Starting Implementation Too Early
**Problem**: Design has gaps, implementation gets stuck
**Solution**: Complete all phases first

### ❌ Assuming Instead of Asking
**Problem**: Wrong assumptions lead to rework
**Solution**: Ask ALL questions, even "obvious" ones

### ❌ Skipping Scrutiny
**Problem**: Hidden ambiguities discovered during implementation
**Solution**: Take fresh look, find ALL gaps before starting

### ❌ Incomplete Documentation
**Problem**: Future sessions can't understand design
**Solution**: Document everything, include code examples

### ❌ No POC for Risky Tech
**Problem**: Discover limitations mid-implementation
**Solution**: POC first, validate approach

---

## Example: Interaction System

### What We Did Right ✓

1. **Started with POC** - Tested fengari, fengari-web, wasmoon
2. **Asked clarifying questions** - 12+ rounds of questions
3. **Validated assumptions** - Tested async behavior, parameter passing
4. **Scrutinized design** - Found 10 critical gaps
5. **Resolved all ambiguities** - Every question answered
6. **Created 4 documents** - Requirements, design, tasks, clarifications
7. **Organized properly** - All in `features/interactions/` directory

### Timeline
- Initial request → POC → Requirements → Design → Scrutiny → Clarifications → Ready
- **Time spent on design**: ~2 hours
- **Time saved during implementation**: Estimated 10-20 hours (no confusion, no rework)

### Result
- ✅ Zero ambiguities
- ✅ Complete specifications
- ✅ Ready for any Kiro session to implement
- ✅ Estimated 26-34 hours to implement (clear path)
- ✅ **Actually implemented in 3 hours** (87% time savings!)
- ✅ Tasks marked complete in `interaction-system-tasks-COMPLETE.md`

---

## Template: Starting a New Feature

**User says**: "I want feature X"

**Kiro responds**:
> "Let me create a complete design following our feature design process. I'll:
> 1. Ask clarifying questions about the feature
> 2. Identify technical unknowns and create POCs
> 3. Write requirements document
> 4. Write design document  
> 5. Scrutinize for ambiguities
> 6. Create task breakdown
> 7. Write implementation clarifications
> 8. Create README for future sessions
>
> This will take 1-3 hours but will save 10-20 hours during implementation. Ready to start?"

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

---

## Conclusion

**Invest time in design to save time in implementation.**

A complete design takes 1-3 hours but prevents:
- Confusion during implementation
- Constant back-and-forth
- Rework due to wrong assumptions
- Discovering limitations mid-implementation
- Incomplete or buggy features

**The interaction system design took ~2 hours and will save an estimated 10-20 hours during implementation.**
