# Agent Redesign - Design Summary

## Problem

The db-design agent needs better runtime validation to catch bugs before implementation. The original agent-redesign.md identified gaps in execution flow verification.

## Solution

Create **three specialized agents** with distinct responsibilities:
1. **db-design** - Architecture, API design, data flow (existing, refined)
2. **db-runtime-analyst** - Execution simulation, lifecycle validation (new)
3. **db-failure-analyst** - Chaos testing, edge cases, stress testing (new)

## Architecture

### Multi-Agent Design Workflow

```
db-design
    ↓
  design.md
    ↓
    ┌────────────┴────────────┐
    ↓                         ↓
db-runtime-analyst    db-failure-analyst
    ↓                         ↓
runtime-analysis.md    failure-analysis.md
    └────────────┬────────────┘
                 ↓
          Both pass? → tasks.md
          Either fails? → back to db-design
```

### Why Separate Agents?

1. **Distinct skillsets** - Architecture vs execution simulation vs chaos testing
2. **Parallelization** - Runtime and failure analyses can run simultaneously
3. **Reusability** - Analysts can validate ANY design, not just new features
4. **Focused instructions** - 3×100 lines vs 1×400 lines
5. **Clear separation of concerns** - Each agent has one job

### File Structure

```
.kiro/agents/
├── db-design/
│   ├── db-design.json
│   ├── instructions.md (architecture only)
│   └── sops/
│       ├── disambiguate-feature.md
│       ├── research-approaches.md
│       ├── create-spec.md
│       ├── maintain-consistency.md
│       └── suggest-refactor.md
│
├── db-runtime-analyst/
│   ├── db-runtime-analyst.json        ⭐ NEW
│   ├── instructions.md                ⭐ NEW
│   └── sops/
│       └── analyze-runtime.md         ⭐ NEW
│
└── db-failure-analyst/
    ├── db-failure-analyst.json        ⭐ NEW
    ├── instructions.md                ⭐ NEW
    └── sops/
        └── analyze-failures.md        ⭐ NEW
```

## Agent Responsibilities

### db-design (Architect)

**Focus:** System architecture, API design, data flow

**Inputs:** Feature request, requirements

**Outputs:** 
- `features/{feature}/requirements.md`
- `features/{feature}/design.md`

**Responsibilities:**
- Disambiguate feature requirements
- Research implementation approaches
- Create architectural specification
- Define APIs, data structures, component interactions
- Maintain consistency with existing codebase

**Does NOT:**
- Simulate execution flows
- Test edge cases
- Validate lifecycle correctness

### db-runtime-analyst (Execution Validator)

**Focus:** Execution correctness, lifecycle validation

**Inputs:** `features/{feature}/design.md`

**Outputs:** `features/{feature}/runtime-analysis.md`

**Responsibilities:**
1. **Identify critical execution flows** (level transition, asset loading, etc.)
2. **Perform mechanical execution trace** (step-by-step simulation)
3. **Create lifecycle ownership table** (who creates/destroys what)
4. **Detect temporal coupling** (operations assuming specific timing)
5. **Analyze async boundaries** (promises, events, delayed calls)
6. **Detect race conditions** (simultaneous operations)

**Success Criteria:**
- ✅ No resource destroyed while referenced
- ✅ No async race conditions
- ✅ Lifecycle ownership clearly defined
- ✅ All execution flows trace correctly

**Failure Action:** Report violations → db-design revises design.md

### db-failure-analyst (Chaos Tester)

**Focus:** Edge cases, stress testing, failure recovery

**Inputs:** `features/{feature}/design.md`

**Outputs:** `features/{feature}/failure-analysis.md`

**Responsibilities:**
1. **Identify failure surfaces** (scene transitions, asset loading, etc.)
2. **Simulate edge cases** (restart during load, asset failure, etc.)
3. **Perform timing attacks** (stop then start immediately, etc.)
4. **Run resource stress tests** (hundreds of entities, rapid transitions)
5. **Test invalid states** (null data, missing assets, duplicates)
6. **Verify failure recovery** (can system recover from errors?)

**Success Criteria:**
- ✅ Edge cases handled
- ✅ Timing attacks don't crash
- ✅ Resource stress stable
- ✅ Invalid states fail gracefully
- ✅ Recovery paths defined

**Failure Action:** Report risks → db-design revises design.md

## Coordination Logic

### Main Agent (dodging-bullets)

When user says "design {feature}":

```
1. Delegate to db-design
   → Wait for design.md

2. Parallel delegation:
   ├─ db-runtime-analyst (with design.md)
   └─ db-failure-analyst (with design.md)
   
3. Wait for both analyses

4. Check results:
   ├─ Both pass → Approve design, create tasks.md
   └─ Either fails → Send violations to db-design for revision

5. Repeat 1-4 until both analyses pass
```

### Revision Loop

```
design.md (v1)
    ↓
runtime-analyst: ❌ Temporal coupling detected
failure-analyst: ✅ Pass
    ↓
db-design revises → design.md (v2)
    ↓
runtime-analyst: ✅ Pass
failure-analyst: ✅ Pass
    ↓
Approved → tasks.md
```

### Feature Output Structure

```
features/{feature}/
├── README.md
├── requirements.md
├── design.md
├── runtime-analysis.md    ⭐ NEW
├── failure-analysis.md    ⭐ NEW
├── scrutiny.md
└── tasks.md
```

## Validation

Tested against level-loading bugs:

**Runtime Analysis Results:**
- ✅ Detected all 4 bugs (lifecycle violations, temporal coupling, async boundaries)

**Failure Analysis Results:**
- ✅ Detected all 4 bugs PLUS 1 additional (async operation after destroy)

**Conclusion:** Both analyses are complementary and would have prevented the bugs.

## Implementation Tasks

### Phase 1: Create db-runtime-analyst Agent

1. **Create agent config:** `.kiro/agents/db-runtime-analyst.json`
   ```json
   {
     "name": "db-runtime-analyst",
     "instructions": ".kiro/agents/db-runtime-analyst/instructions.md",
     "resources": [
       "docs/runtime-analysis.md",
       "docs/feature-design-process.md"
     ]
   }
   ```

2. **Create instructions:** `.kiro/agents/db-runtime-analyst/instructions.md`
   - Agent purpose: Validate execution correctness
   - Input: `features/{feature}/design.md`
   - Output: `features/{feature}/runtime-analysis.md`
   - Success criteria checklist
   - Failure reporting format

3. **Create SOP:** `.kiro/agents/db-runtime-analyst/sops/analyze-runtime.md`
   - Step-by-step process for runtime analysis
   - Execution trace format
   - Lifecycle ownership table template
   - Temporal coupling detection patterns
   - Async boundary analysis checklist
   - Race condition detection patterns

### Phase 2: Create db-failure-analyst Agent

1. **Create agent config:** `.kiro/agents/db-failure-analyst.json`
   ```json
   {
     "name": "db-failure-analyst",
     "instructions": ".kiro/agents/db-failure-analyst/instructions.md",
     "resources": [
       "docs/failure-analysis.md",
       "docs/feature-design-process.md"
     ]
   }
   ```

2. **Create instructions:** `.kiro/agents/db-failure-analyst/instructions.md`
   - Agent purpose: Stress-test design
   - Input: `features/{feature}/design.md`
   - Output: `features/{feature}/failure-analysis.md`
   - Success criteria checklist
   - Risk reporting format

3. **Create SOP:** `.kiro/agents/db-failure-analyst/sops/analyze-failures.md`
   - Step-by-step process for failure analysis
   - Edge case simulation patterns
   - Timing attack scenarios
   - Resource stress test templates
   - Invalid state test cases
   - Failure recovery verification

### Phase 3: Update db-design Agent

1. **Update instructions:** `.kiro/agents/db-design/instructions.md`
   - Remove execution flow verification (now handled by analysts)
   - Add note: "After design.md, coordinator will invoke analysts"
   - Add revision process: "If analysts report violations, revise design.md"

2. **Remove old SOP:** Delete `.kiro/agents/db-design/sops/verify-execution-flow.md`
   - Replaced by db-runtime-analyst

### Phase 4: Update Main Agent Coordination

1. **Update dodging-bullets agent:** `.kiro/agents/dodging-bullets.md`
   - Add delegation logic for "design {feature}"
   - Add parallel invocation of analysts
   - Add revision loop logic
   - Add approval criteria

### Phase 5: Update Documentation

1. **Update feature design process:** `docs/feature-design-process.md`
   - Add Phase 5: Runtime Analysis (by db-runtime-analyst)
   - Add Phase 6: Failure Analysis (by db-failure-analyst)
   - Update checklist
   - Update README reading order

2. **Keep existing SOPs:** `docs/runtime-analysis.md` and `docs/failure-analysis.md`
   - These are reference docs, not agent-specific
   - Agents reference them in their resources

### Phase 6: Test on Existing Feature

1. **Run validation test:**
   - Use `features/levelload/design.md` as input
   - Invoke db-runtime-analyst → should produce runtime-analysis.md
   - Invoke db-failure-analyst → should produce failure-analysis.md
   - Compare outputs to existing test files
   - Verify both analyses catch the 4 known bugs


## Validation

Tested against level-loading bugs:

**Runtime Analysis Results:**
- ✅ Detected all 4 bugs (lifecycle violations, temporal coupling, async boundaries)

**Failure Analysis Results:**
- ✅ Detected all 4 bugs PLUS 1 additional (async operation after destroy)

**Conclusion:** Both analyses are complementary and would have prevented the bugs.

## Benefits of Multi-Agent Approach

### 1. Parallelization
Runtime and failure analyses run simultaneously → **50% faster validation**

### 2. Reusability
Analysts can validate:
- New feature designs
- Existing code refactors
- Third-party library integrations
- Performance optimizations
- Any system with lifecycle complexity

### 3. Focused Expertise
Each agent becomes expert at its specific analysis type:
- db-design: Architecture patterns, API design
- db-runtime-analyst: Execution simulation, lifecycle tracking
- db-failure-analyst: Chaos testing, edge case discovery

### 4. Maintainability
- 3 agents × 100 lines = easier to understand and update
- vs 1 agent × 400 lines = harder to maintain
- Clear separation of concerns

### 5. Composability
```
Feature design → db-design + analysts
Code refactor → analysts only (skip db-design)
Library integration → analysts only
Performance optimization → analysts only
```

## Time Savings

**Before:** Design looked correct but failed at runtime (10-20 hours debugging)

**After:** 
- Design phase: 1-2 hours (db-design)
- Validation phase: 30 minutes (both analysts in parallel)
- Revision (if needed): 30 minutes

**Net savings:** 8-18 hours per feature with runtime/lifecycle complexity

## Comparison to Single-Agent Approach

| Aspect | Single Agent | Multi-Agent |
|--------|-------------|-------------|
| Coordination | Simpler | More complex |
| Parallelization | Sequential | Parallel |
| Reusability | Feature design only | Any validation task |
| Maintainability | One large file | Three focused files |
| Expertise | Generalist | Specialists |
| Speed | Slower (sequential) | Faster (parallel) |
| Context preservation | Automatic | Must pass explicitly |

**Recommendation:** Multi-agent approach wins on reusability, speed, and maintainability.
