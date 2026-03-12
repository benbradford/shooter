# Specialized Agents System - Design

## Architecture Overview

```
User
  ↓
Main Agent (dodging-bullets)
  ↓ (delegates via use_subagent)
  ├─→ db-asset-management (sprite sheets, optimization)
  ├─→ db-enemy-implementation (new enemies, AI)
  └─→ db-testing (write tests, debug tests)
```

## Agent Structure

### Main Agent (dodging-bullets)

**Location:** `.kiro/agents/dodging-bullets/`

**Role:** Orchestrator that:
- Handles general development tasks
- Recognizes when to delegate
- Loads full project context
- Summarizes results from specialized agents

**Delegation triggers:**
- "update {enemy} spritesheet" → db-asset-management
- "optimize assets" → db-asset-management
- "add new enemy {name}" → db-enemy-implementation
- "write test for {feature}" → db-testing

**Context:** All docs (current behavior)

### Specialized Agents

**Location:** `.kiro/agents/db-{specialty}/`

**Structure:**
```
db-asset-management/
├── instructions.md       # Agent capabilities, context, SOPs
└── sops/
    ├── update-spritesheet.md
    ├── optimize-assets.md
    └── add-texture.md
```

**instructions.md format:**
```markdown
# Asset Management Agent

## Purpose
Handle all asset-related tasks for Dodging Bullets project.

## Expertise
- Sprite sheet generation and layout
- Image optimization and resizing
- Asset registration in code
- Alignment of misaligned sprites

## Context Files
- docs/updating-enemy-spritesheets.md
- docs/asset-optimization.md
- docs/aligning-misaligned-sprites.md
- docs/animated-cell-textures.md

## Available SOPs
1. update-spritesheet - Update enemy sprite sheet with new animations
2. optimize-assets - Reduce asset file sizes
3. add-texture - Add new texture to game

## Invocation Examples
- "Update thrower spritesheet"
- "Optimize all assets over 1MB"
- "Add new texture for door"
```

## SOP Structure

### SOP Format

```markdown
# SOP: {Task Name}

## Purpose
Brief description of what this accomplishes

## Prerequisites
- Required files/assets must exist
- Required tools installed

## Steps

### 1. {Step Name}
**Action:** What to do
**Verification:** How to verify it worked
**Common issues:** Known problems and solutions

### 2. {Step Name}
...

## Final Verification
- [ ] Build passes
- [ ] Lint passes
- [ ] Manual test confirms functionality

## Rollback
If something goes wrong, how to undo changes
```

### Example: update-spritesheet.md

```markdown
# SOP: Update Enemy Spritesheet

## Purpose
Update an enemy's sprite sheet with new animation frames while maintaining correct frame indices and direction mappings.

## Prerequisites
- New animation frames in `public/assets/{enemy}/anims/animations/`
- Frames organized in directories by animation name and direction
- ImageMagick installed (for sprite sheet generation)

## Steps

### 1. Verify Frame Dimensions
**Action:** Check frame size matches AssetRegistry
**Command:** `sips -g pixelWidth -g pixelHeight public/assets/{enemy}/anims/rotations/south.png`
**Verification:** Dimensions match `frameWidth` and `frameHeight` in `src/assets/AssetRegistry.ts`
**Common issues:** Mismatch causes sprite sheet to be incorrectly sliced

### 2. Check Directory Order
**Action:** List animation directories to confirm alphabetical order
**Command:** `ls public/assets/{enemy}/anims/animations/`
**Verification:** Directories are alphabetically sorted (not game direction order)
**Common issues:** Assuming game order leads to wrong frame indices

### 3. Generate Sprite Sheet
**Action:** Run generation script
**Command:** `node scripts/generate-{enemy}-spritesheet.mjs`
**Verification:** Script completes without errors, sprite sheet created
**Common issues:** Missing directories, wrong frame counts

### 4. Update Animation File
**Action:** Update `{Enemy}Animations.ts` with correct frame indices
**Details:** 
- Use alphabetical directory order for DIR_TO_INDEX mapping
- Calculate frame ranges based on animation frame counts
- Ensure helper function returns correct animation keys
**Verification:** All animations have correct start/end frames
**Common issues:** Off-by-one errors in frame ranges

### 5. Verify Integration
**Action:** Ensure animations created in entity factory (not GameScene)
**Verification:** `create{Enemy}Animations(scene)` called in entity factory
**Common issues:** Creating in GameScene causes duplication

## Final Verification
- [ ] `npm run build` passes
- [ ] `npx eslint src --ext .ts` passes
- [ ] Load game and verify all animations play correctly
- [ ] Test idle, walk, attack, hit, death animations
- [ ] Check all 8 directions

## Rollback
If sprite sheet is broken:
1. Restore previous sprite sheet from git
2. Revert changes to `{Enemy}Animations.ts`
3. Run build to verify
```

## Delegation Flow

### Pattern Recognition

Main agent scans user input for delegation triggers:

**Design triggers:**
- "design {feature}"
- "I want {feature}"
- "spec for {feature}"
- "how should I implement {feature}"

**Asset Management triggers:**
- "update {enemy} spritesheet"
- "optimize assets"
- "add texture {name}"
- "align sprites"
- "resize {asset}"

**Level Editor triggers:**
- "add editor mode for {feature}"
- "add {entity} to editor"
- "fix editor {issue}"
- "editor for {feature}"

**Enemy Implementation triggers:**
- "add enemy {name}"
- "add new enemy"
- "implement {enemy}"
- "create enemy that {behavior}"

**Testing triggers:**
- "write test for {feature}"
- "test {feature}"
- "debug test {name}"
- "create test level"

### Delegation Code Pattern

```typescript
// In main agent's logic
if (userInput.includes("update") && userInput.includes("spritesheet")) {
  const enemyName = extractEnemyName(userInput);
  
  return use_subagent({
    command: "InvokeSubagents",
    content: {
      subagents: [{
        agent_name: "db-asset-management",
        query: `Update ${enemyName} spritesheet following the update-spritesheet SOP`,
        relevant_context: `Enemy name: ${enemyName}, Source: public/assets/${enemyName}/anims/`
      }]
    }
  });
}
```

## Context Management

### Design Agent Context

**Files to load:**
- `docs/feature-design-process.md` (539 lines)
- `docs/ecs-architecture.md` (194 lines)
- `docs/coding-standards.md` (131 lines)
- `docs/grid-and-collision.md` (225 lines)
- `docs/collision-system.md` (167 lines)
- Existing feature specs in `features/` (variable)

**Total:** ~1,256 lines + feature specs

**Why more context?**
- Needs to understand full architecture to suggest good designs
- Must know existing patterns to maintain consistency
- Requires coding standards to enforce quality

### Asset Management Agent Context

**Files to load:**
- `docs/updating-enemy-spritesheets.md` (150 lines)
- `docs/asset-optimization.md` (100 lines)
- `docs/aligning-misaligned-sprites.md` (120 lines)
- `docs/animated-cell-textures.md` (80 lines)
- `src/assets/AssetRegistry.ts` (code reference)
- `src/assets/AssetLoader.ts` (code reference)

**Total:** ~450 lines + code references

### Enemy Implementation Agent Context

**Files to load:**
- `docs/adding-enemies.md` (60 lines)
- `docs/ecs-architecture.md` (194 lines)
- `docs/pathfinding.md` (218 lines)
- `docs/spawner-entities.md` (96 lines)
- Example enemy: `src/ecs/entities/skeleton/` (code reference)

**Total:** ~568 lines + code references

### Testing Agent Context

**Files to load:**
- `docs/testing.md` (166 lines)
- `test/interactions/player.js` (code reference)
- Example test: `test/tests/ammo/test-ammo-system.js` (code reference)

**Total:** ~166 lines + code references

### Level Editor Agent Context

**Files to load:**
- `docs/adding-editor-functionality.md` (510 lines)
- `docs/level-editor.md` (155 lines)
- `docs/entity-creation-system.md` (226 lines)
- Example editor state: `src/editor/TriggerEditorState.ts` (code reference)

**Total:** ~891 lines + code references

## SOP Execution

### Agent Behavior

1. **Load SOP** - Read the specified SOP markdown
2. **Execute steps** - Follow each step in order
3. **Verify** - Check acceptance criteria after each step
4. **Report issues** - If step fails, ask clarifying question
5. **Final verification** - Run build/lint, manual test
6. **Report back** - Summarize what was done

### Step Execution Pattern

For each step:
1. Read action description
2. Execute commands or code changes
3. Check verification criteria
4. If verification fails:
   - Check "Common issues" section
   - Try suggested solutions
   - If still failing, ask user for help
5. Move to next step

### Error Recovery

**If step fails:**
1. Check SOP's "Common issues" section
2. Try suggested solution
3. If no solution, ask user: "Step X failed: {error}. The SOP suggests {solution}. Should I try this or do you want to handle it?"

**If SOP is outdated:**
1. Agent notices step doesn't match current code
2. Reports: "SOP step X references {old pattern} but code now uses {new pattern}. Should I update the SOP?"
3. User approves, agent updates SOP

## Communication Protocol

### Main Agent → Specialized Agent

```json
{
  "agent_name": "db-asset-management",
  "query": "Update thrower spritesheet following update-spritesheet SOP",
  "relevant_context": "Enemy: thrower, Source: public/assets/thrower/anims/"
}
```

### Specialized Agent → Main Agent

```markdown
## Task Complete: Update Thrower Spritesheet

**Steps completed:**
1. ✓ Verified frame dimensions (56x56)
2. ✓ Checked directory order (alphabetical)
3. ✓ Generated sprite sheet (672x672, 12x12 grid)
4. ✓ Updated ThrowerAnimations.ts with frame indices
5. ✓ Verified integration in ThrowerEntity.ts

**Files modified:**
- public/assets/thrower/thrower_spritesheet.png
- src/thrower/ThrowerAnimations.ts

**Verification:**
- Build: ✓ Passed
- Lint: ✓ Passed
- Manual test: ✓ All animations play correctly

**Issues encountered:** None
```

## Benefits

### For User
- **Faster execution** - Specialized agents know exactly what to do
- **Consistent quality** - SOPs ensure patterns are followed
- **Less explanation** - Just say "update spritesheet", agent knows the rest
- **Parallel work** - Multiple tasks can happen simultaneously (future)

### For Main Agent
- **Reduced context** - Doesn't need to load all asset docs for every task
- **Clear delegation** - Knows when to hand off
- **Better focus** - Can focus on orchestration, not details

### For Specialized Agents
- **Minimal context** - Only loads what's needed
- **Deep expertise** - Knows one domain very well
- **Reusable** - Can be invoked for similar tasks repeatedly
- **Improvable** - SOPs get better over time as issues are discovered

## Implementation Strategy

### Phase 1: Asset Management Agent (Pilot)
1. Create agent structure
2. Write 1-2 SOPs (update-spritesheet, optimize-assets)
3. Test with real tasks
4. Refine based on results

### Phase 2: Evaluate and Expand
1. Assess pilot success
2. Identify improvements
3. Add 1-2 more agents if valuable
4. Update main agent delegation logic

### Phase 3: Maintenance
1. Update SOPs as code evolves
2. Add new SOPs for new patterns
3. Retire SOPs that are no longer needed

## Success Metrics

**Pilot success criteria:**
- Asset agent can update sprite sheet without clarifying questions
- SOP is clear enough to follow
- Results are correct (build passes, animations work)
- Faster than main agent doing the same task
- User satisfaction with delegation

**Long-term success:**
- 80%+ of repetitive tasks delegated successfully
- SOPs stay up-to-date
- Specialized agents produce consistent quality
- User prefers delegation over manual explanation
