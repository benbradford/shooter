# Specialized Agents System - Requirements

## Overview

Create specialized sub-agents with focused expertise and SOPs for repetitive tasks in the Dodging Bullets project. Each agent has minimal context (only what it needs) and follows documented procedures for consistent, high-quality output.

## Current Problems

1. **Context overload** - Main agent loads all docs, increasing hallucination risk
2. **No specialization** - Same agent handles design, assets, enemies, tests, docs, editor
3. **Inconsistent patterns** - No enforced SOPs for repetitive tasks
4. **Manual delegation** - User must explain full context each time
5. **Knowledge scattered** - Best practices not captured in reusable SOPs
6. **Features get hacked in** - No dedicated design phase, leads to technical debt

## Goals

1. **Focused expertise** - Each agent knows one domain deeply
2. **Minimal context** - Only load relevant docs per agent
3. **Reusable SOPs** - Document procedures for common tasks
4. **Consistent quality** - SOPs ensure patterns are followed
5. **Easy invocation** - Simple commands trigger complex workflows
6. **Design-first approach** - Features go through proper design before implementation

## Proposed Agents

### Agent 1: Design Agent (db-design)

**Purpose:** Take feature requests from rough idea to implementation-ready spec

**Context:**
- `docs/feature-design-process.md`
- `docs/ecs-architecture.md`
- `docs/coding-standards.md`
- All architecture docs
- Existing feature specs in `features/`

**SOPs:**
1. Disambiguate feature request
2. Create requirements document
3. Create design document
4. Scrutinize for ambiguities
5. Suggest refactors

**Key capabilities:**
- Asks probing questions to uncover hidden requirements
- Identifies architectural implications
- Suggests refactors over hacks
- Creates complete, unambiguous specs
- Not afraid to say "this needs a bigger change"
- Understands ECS patterns and when to use them
- Spots when feature doesn't fit current architecture

**Example invocation:**
```
User: "I want enemies to have shields"
Main agent: Delegates to design agent
Design agent: 
  - "Should shields block all damage or partial?"
  - "Do shields regenerate?"
  - "Can player have shields too?"
  - Creates ShieldComponent spec
  - Suggests: "This needs DamageComponent refactor to support absorption"
```

### Agent 2: Asset Management Agent (db-asset-management)

**Purpose:** Handle all asset-related tasks (sprite sheets, optimization, registration)

**Context:**
- `docs/updating-enemy-spritesheets.md`
- `docs/asset-optimization.md`
- `docs/aligning-misaligned-sprites.md`
- `docs/animated-cell-textures.md`

**SOPs:**
1. Update enemy spritesheet
2. Optimize assets
3. Add new texture
4. Align misaligned sprites

**Example invocation:**
```
User: "Update thrower spritesheet"
Main agent: Delegates to asset agent with SOP "update-spritesheet"
Asset agent: Follows SOP, completes task, reports back
```

### Agent 3: Level Editor Agent (db-level-editor)

**Purpose:** Implement new editor modes and functionality

**Context:**
- `docs/adding-editor-functionality.md`
- `docs/level-editor.md`
- `docs/entity-creation-system.md`

**SOPs:**
1. Add new editor mode
2. Add entity to editor
3. Fix editor bug

**Example invocation:**
```
User: "Add editor mode for placing decorations"
Main agent: Delegates to editor agent with SOP "add-editor-mode"
Editor agent: Creates state, adds button, integrates with EditorScene
```

### Agent 4: Enemy Implementation Agent (db-enemy-implementation)

**Purpose:** Implement new enemies end-to-end

**Context:**
- `docs/adding-enemies.md`
- `docs/ecs-architecture.md`
- `docs/pathfinding.md`

**SOPs:**
1. Add new enemy type
2. Update enemy AI
3. Add enemy to editor

**Example invocation:**
```
User: "Add archer enemy that shoots arrows"
Main agent: Delegates to enemy agent with SOP "add-enemy"
Enemy agent: Creates components, states, factory, editor integration
```

### Agent 5: Testing Agent (db-testing)

**Purpose:** Write and debug automated tests

**Context:**
- `docs/testing.md`

**SOPs:**
1. Write new test
2. Debug failing test
3. Create test level

**Example invocation:**
```
User: "Test the new archer enemy"
Main agent: Delegates to testing agent with SOP "write-test"
Testing agent: Creates test level, writes test, verifies it passes
```

### Agent 6: Documentation Agent (db-documentation)

**Purpose:** Keep docs lean, accurate, and up-to-date

**Context:**
- `docs/README.md` (documentation principles)
- All docs (for auditing)

**SOPs:**
1. Audit docs
2. Update docs for feature
3. Condense verbose doc

**Example invocation:**
```
User: "Update docs for archer enemy"
Main agent: Delegates to doc agent with SOP "update-docs"
Doc agent: Updates relevant docs, keeps them lean
```

## Requirements

### R1: Agent Definition Structure

**Purpose:** Define what each agent knows and can do

**Structure:**
```
.kiro/agents/db-{specialty}/
├── instructions.md       # Agent capabilities, context, SOPs
└── sops/
    ├── sop1.md
    └── sop2.md
```

**instructions.md format:**
- Agent purpose and expertise
- Context files to load
- Available SOPs with descriptions
- Delegation trigger keywords
- Example invocations

**Acceptance Criteria:**
- Clear agent purpose
- Minimal context (only what's needed)
- List of SOPs with descriptions
- Example invocations

### R2: SOP Format

**Purpose:** Document step-by-step procedures for common tasks

**Structure:**
```markdown
# SOP: {Task Name}

## Purpose
What this accomplishes

## Prerequisites
Required files/assets/tools

## Steps

### 1. {Step Name}
**Action:** What to do
**Verification:** How to verify
**Common issues:** Known problems

### 2. {Step Name}
...

## Final Verification
- [ ] Build passes
- [ ] Lint passes
- [ ] Manual test

## Rollback
How to undo if needed
```

**Detail level:** Hybrid
- Detailed for error-prone steps (frame size verification, directory order)
- High-level for obvious steps (run build, test in game)

**Acceptance Criteria:**
- Clear, actionable steps
- Verification per step
- Common issues documented
- Rollback procedure

### R3: Main Agent Delegation Logic

**Purpose:** Main agent recognizes when to delegate

**Delegation mode:** Implicit (auto-delegates based on keywords)

**Triggers:**
- "design {feature}" → db-design
- "update {enemy} spritesheet" → db-asset-management
- "optimize assets" → db-asset-management
- "add editor mode" → db-level-editor
- "add {entity} to editor" → db-level-editor
- "add enemy {name}" → db-enemy-implementation
- "write test for {feature}" → db-testing
- "update docs" → db-documentation

**Process:**
1. Main agent scans user input for triggers
2. Identifies appropriate specialized agent
3. Uses `use_subagent` tool with agent_name and query
4. Specialized agent executes
5. Main agent receives results
6. Main agent summarizes for user

**Acceptance Criteria:**
- Main agent correctly identifies 90%+ of delegation opportunities
- Provides sufficient context to specialized agent
- Specialized agent completes task
- Results clearly reported

### R4: Error Handling

**Mode:** Specialized agent asks clarifying questions

**Process:**
1. Agent encounters ambiguity or error
2. Agent asks user directly: "Step X needs clarification: {question}"
3. User responds
4. Agent continues with answer

**Acceptance Criteria:**
- Agent stops when stuck (doesn't guess)
- Questions are specific and actionable
- Agent resumes correctly after answer

### R5: Execution Mode

**Mode:** Sequential only (no parallel execution)

**Reason:** Avoid file conflicts and complexity

**Future:** Can add parallel execution if needed

### R6: Agent Memory

**Mode:** Session memory only

**Behavior:**
- Agent remembers what it did within current chat session
- Can reference previous work: "Update the archer enemy I just created"
- Memory cleared when session ends

**Acceptance Criteria:**
- Agent can reference entities/files from earlier in session
- Memory doesn't persist across sessions
- No state files needed

## Priority Order

**Start with (in order):**
1. **Design Agent** - Most valuable, prevents technical debt
2. **Asset Management Agent** - Repetitive, well-defined
3. **Level Editor Agent** - Complex, error-prone

**Future expansion:**
4. Enemy Implementation Agent
5. Testing Agent
6. Documentation Agent

## Success Criteria

1. Design agent can take rough idea and create complete spec
2. Design agent asks probing questions to uncover requirements
3. Design agent suggests refactors when appropriate
4. Asset agent can update sprite sheet without help
5. Editor agent can add new editor mode following patterns
6. SOPs are clear enough for any Kiro session to follow
7. Context per agent < 1,000 lines (except design agent)
8. Faster execution than main agent for specialized tasks

## Files to Create

**Phase 1 (Design Agent):**
- `.kiro/agents/db-design/instructions.md`
- `.kiro/agents/db-design/sops/disambiguate-feature.md`
- `.kiro/agents/db-design/sops/create-spec.md`
- `.kiro/agents/db-design/sops/suggest-refactor.md`

**Phase 2 (Asset Management Agent):**
- `.kiro/agents/db-asset-management/instructions.md`
- `.kiro/agents/db-asset-management/sops/update-spritesheet.md`
- `.kiro/agents/db-asset-management/sops/optimize-assets.md`

**Phase 3 (Level Editor Agent):**
- `.kiro/agents/db-level-editor/instructions.md`
- `.kiro/agents/db-level-editor/sops/add-editor-mode.md`
- `.kiro/agents/db-level-editor/sops/add-entity-to-editor.md`

**Main Agent Updates:**
- `.kiro/agents/dodging-bullets/instructions.md` - Add delegation section

## Files to Modify

- None (this is additive)
