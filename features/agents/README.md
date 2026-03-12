# Agent Ecosystem - Dodging Bullets

## Agent Roster

### 1. dodging-bullets (Main Agent)
**Role**: General development, questions, debugging, quick fixes
**Invoked by**: Default (always active)
**Delegates to**: db-design, db-implementor, db-asset-management, db-level-editor

### 2. db-design (Design Specialist)
**Role**: Feature design and specification
**Invoked by**: "design {feature}", "flesh out the design", "create a spec"
**Output**: requirements.md, design.md, tasks.md, README.md

### 3. db-implementor (Implementation Specialist) ⭐ NEW
**Role**: Task execution with automated testing
**Invoked by**: "implement task X.Y from features/{feature}/tasks.md"
**Output**: Code + tests + screenshots + regression suite

### 4. db-asset-management (Asset Specialist)
**Role**: Sprite sheets, asset optimization
**Invoked by**: "update {enemy} spritesheet", "optimize assets"
**Output**: Sprite sheets, optimized assets

### 5. db-level-editor (Editor Specialist)
**Role**: Level editor features
**Invoked by**: "add editor mode", "add {entity} to editor"
**Output**: Editor states, UI components

## Workflow Example

### Complete Feature Implementation

```
Step 1: Design
User: "design the NPC system"
→ db-design agent
→ Creates: requirements.md, design.md, tasks.md, README.md

Step 2: Implementation
User: "implement all tasks from features/npc/tasks.md"
→ db-implementor agent
→ Executes all 18 tasks
→ Generates 18 tests
→ Creates regression suite
→ Takes 18 screenshots
→ Marks all complete

Step 3: Asset Creation (if needed)
User: "update npc spritesheet"
→ db-asset-management agent
→ Generates sprite sheet

Step 4: Editor Integration (if needed)
User: "add NPC to editor"
→ db-level-editor agent
→ Creates editor state

Result: Complete feature with 100% test coverage in 16-20 hours
```

## Delegation Rules

### dodging-bullets Agent

**Always delegate when user says:**
- "design {feature}" → db-design
- "implement task X.Y from features/{feature}/tasks.md" → db-implementor
- "update {enemy} spritesheet" → db-asset-management
- "add editor mode" → db-level-editor

**Handle directly when user says:**
- "how does X work?" (questions)
- "explain Y" (explanations)
- "add X to Y" (direct requests, not task-based)
- "implement task X.Y directly" (user override)
- "quick fix: {change}" (quick fixes)
- "debug {issue}" (debugging)

## Agent Specializations

### db-design
- Asks clarifying questions
- Creates POCs for risky tech
- Writes complete specifications
- Identifies all ambiguities
- Creates task breakdowns

### db-implementor ⭐
- Executes tasks from specs
- Generates tests automatically
- Enforces coding patterns
- Runs browser tests
- Takes screenshots
- Builds regression suite
- Self-corrects errors

### db-asset-management
- Generates sprite sheets
- Optimizes images
- Aligns misaligned frames
- Resizes assets
- Updates AssetRegistry

### db-level-editor
- Creates editor states
- Adds entities to editor
- Fixes editor bugs
- Updates editor UI

## Value Proposition

### Without Specialized Agents
- Design: 10-20 hours (with confusion)
- Implementation: 20-25 hours (with testing)
- Total: 30-45 hours per feature

### With Specialized Agents
- Design: 2-3 hours (db-design)
- Implementation: 16-20 hours (db-implementor with auto-testing)
- Total: 18-23 hours per feature

**Savings: 12-22 hours per feature (40-50% reduction)**

## Testing Benefits (db-implementor)

### Manual Testing (Current)
- Tests rarely written (high overhead)
- Coverage gaps accumulate
- Visual bugs caught late
- No regression testing

### Automated Testing (With db-implementor)
- Tests always generated (zero overhead)
- 100% coverage guaranteed
- Visual bugs caught immediately
- Regression suite grows automatically

**Result: 5-11 hours saved per feature on testing alone**

## Files

- `.agents/summary/index.md` - Main agent summary (updated with delegation rules)
- `.agents/db-implementor.md` - db-implementor agent instructions
- `features/agents/delegation-rules.md` - Complete delegation rules
- `features/agents/db-implementor/` - db-implementor feature spec

## Next Steps

1. ✅ Delegation rules defined
2. ✅ db-implementor spec created
3. ⏳ Implement db-implementor agent (16 hours)
4. ⏳ Test on NPC system
5. ⏳ Deploy for all features
