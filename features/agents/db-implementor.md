# db-implementor Agent Specification

## Purpose

Specialized implementation agent that executes tasks from feature specs with automated testing, pattern enforcement, and visual verification.

## Core Value Proposition

**"Every task gets a test, automatically, with zero overhead."**

Solves the "neglected tests" problem by making test creation automatic and enforced.

## Responsibilities

### 1. Task Execution
- Read task from `features/{feature}/tasks.md`
- Read relevant sections from `design.md` and `requirements.md`
- Implement with minimal code following patterns
- Run build + lint
- Self-correct if errors found

### 2. Automated Test Generation
- Generate test from template based on task type
- Create minimal test level if needed
- Run test in browser (Puppeteer)
- Take screenshot for visual verification
- Add to regression suite

### 3. Pattern Enforcement
- Check props pattern (no defaults)
- Check for magic numbers
- Check for redundant comments
- Check update order (if component)
- Check readonly properties
- Flag violations before marking complete

### 4. Progress Tracking
- Mark task complete in tasks.md
- Update README.md progress checklist
- Report completion with summary

## Implementation Loop

```
For each task:
1. Read task description and subtasks from tasks.md
2. Read relevant design.md sections
3. Search codebase for similar patterns
4. Implement code (minimal)
5. Run pattern enforcement checks
6. Build + lint (must pass)
7. Generate test from template
8. Run test in browser
9. Take screenshot
10. Verify against acceptance criteria
11. Add to regression suite
12. Mark task complete
13. Report with screenshot and summary
```

## Test Generation System

### Test Templates by Task Type

**Component Creation:**
```javascript
// Template: test-{component-name}.js
const testComponentExists = test(
  {
    given: '{Entity} with {Component}',
    when: 'Entity is queried',
    then: 'Component exists'
  },
  async (page) => {
    const exists = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const entity = scene.entityManager.getFirst('{entityType}');
      return entity && entity.get(window.{ComponentType}) !== undefined;
    });
    return exists === true;
  }
);
```

**Range Detection:**
```javascript
const testRangeDetection = test(
  {
    given: 'Player {range}px from {entity}',
    when: 'Range is checked',
    then: 'Detection returns {expected}'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper({col}, {row}));
    const inRange = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const manager = window.{Manager}.getInstance();
      const player = scene.entityManager.getFirst('player');
      return manager.isInRange(player);
    });
    return inRange === {expected};
  }
);
```

**Animation Playback:**
```javascript
const testAnimationPlays = test(
  {
    given: '{Entity} with {animation} animation',
    when: '1 second passes',
    then: 'Animation is playing'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isPlaying = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const entity = scene.entityManager.getFirst('{entityType}');
      const anim = entity.get(window.AnimationComponent);
      return anim && anim.isPlaying;
    });
    return isPlaying === true;
  }
);
```

**UI State Change:**
```javascript
const testUIStateChange = test(
  {
    given: '{Initial state}',
    when: '{Action performed}',
    then: '{UI element} shows {expected state}'
  },
  async (page) => {
    // Perform action
    await page.evaluate(() => {action});
    
    // Check UI state
    const state = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'hud');
      const entity = scene.entityManager.getFirst('{entityType}');
      const component = entity.get(window.{ComponentType});
      return component.{stateProperty};
    });
    return state === {expected};
  }
);
```

**Manager Query:**
```javascript
const testManagerQuery = test(
  {
    given: '{Entities in specific state}',
    when: 'Manager is queried',
    then: 'Returns {expected result}'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const manager = window.{Manager}.getInstance();
      return manager.{queryMethod}({params});
    });
    return result === {expected};
  }
);
```

### Template Selection Logic

```
Task type detection:
- "Create {X}Component" → Component creation template
- "Add {X} detection" → Range detection template
- "Update {X}Component" → UI state change template
- "Create {X}Manager" → Manager query template
- "Add {X} animation" → Animation playback template
```

### Test Level Generation

**Minimal test levels per task:**

```json
// test/levels/test-{feature}-{task}.json
{
  "width": 20,
  "height": 20,
  "playerStart": { "x": 5, "y": 5 },
  "entities": [
    // Only entities needed for this specific task
  ],
  "cells": [
    // Only cells needed for this specific task
  ]
}
```

**Agent determines what's needed:**
- Task 1.3 (NPCIdleComponent) → NPC entity at (11, 11)
- Task 2.1 (NPCInteractionComponent) → NPC + interaction script
- Task 3.3 (AttackButtonComponent) → NPC in range of player

## Pattern Enforcement Checks

### Automated Checks (Run Before Marking Complete)

```javascript
// Check 1: Props pattern
function checkPropsPattern(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for default values in constructor
  const hasDefaults = /constructor\([^)]*=[^)]*\)/.test(content);
  if (hasDefaults) {
    return { pass: false, message: "Constructor has default values" };
  }
  
  // Check for props interface
  const hasPropsInterface = /interface \w+Props/.test(content);
  if (!hasPropsInterface && /implements Component/.test(content)) {
    return { pass: false, message: "Component missing props interface" };
  }
  
  return { pass: true };
}

// Check 2: Magic numbers
function checkMagicNumbers(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find numeric literals not in const declarations
  const magicNumbers = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const ')) continue; // Skip const declarations
    
    const numbers = line.match(/\b\d+(\.\d+)?\b/g);
    if (numbers) {
      magicNumbers.push({ line: i + 1, numbers });
    }
  }
  
  if (magicNumbers.length > 0) {
    return { 
      pass: false, 
      message: `Magic numbers found: ${JSON.stringify(magicNumbers)}` 
    };
  }
  
  return { pass: true };
}

// Check 3: Update order
function checkUpdateOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // If file creates entity with components
  if (/entity\.add\(/.test(content)) {
    // Check if setUpdateOrder is called
    if (!/setUpdateOrder/.test(content)) {
      return { pass: false, message: "Entity created but no update order set" };
    }
  }
  
  return { pass: true };
}
```

### Enforcement Report

```
Pattern Enforcement Results:

✅ Props pattern followed
✅ No magic numbers
✅ Update order set
✅ Readonly properties used
⚠️ 2 comments could be removed (lines 45, 67)
❌ Non-null assertion used (line 89)

Fix required issues before marking complete.
```

## Self-Verification Checklist

```markdown
After implementing each task:

Code Quality:
- [ ] Uses props pattern (no defaults)
- [ ] No magic numbers (all constants named with units)
- [ ] No redundant comments
- [ ] Readonly properties where applicable
- [ ] No non-null assertions
- [ ] No useless constructors
- [ ] Follows existing patterns

Integration:
- [ ] Component in update order (if applicable)
- [ ] Dependencies satisfied
- [ ] Compatible with next task
- [ ] Exports added to index.ts (if applicable)

Verification:
- [ ] Build passes
- [ ] Lint passes
- [ ] Test generated
- [ ] Test passes
- [ ] Screenshot taken
- [ ] Visual verification complete

Documentation:
- [ ] Task marked complete in tasks.md
- [ ] README.md progress updated
- [ ] Added to regression suite
```

## Reporting Format

```markdown
✅ Task 1.3: Create NPCIdleComponent

**Implementation:**
- Created: src/ecs/components/npc/NPCIdleComponent.ts
- Modified: src/ecs/index.ts (added export)

**Pattern Enforcement:**
✅ Props pattern followed
✅ No magic numbers
✅ Readonly properties used
✅ Follows SkeletonIdleComponent pattern

**Build & Lint:**
✅ Build passed (0 errors)
✅ Lint passed (0 warnings)

**Testing:**
✅ Generated: test/tests/npc/test-npc-idle.js
✅ Created: public/levels/test/test-npc-idle.json
✅ Test passed (2/2 assertions)
📸 Screenshot: test/screenshots/npc-idle-result.png

**Visual Verification:**
✅ NPC renders at (11, 11)
✅ Idle animation playing
✅ Facing south direction

**Regression Suite:**
✅ Added to test/regression/test-npc-regression.js

**Time:** 12 minutes (8 min implementation + 4 min testing)

**Next:** Task 1.4 ready (dependencies satisfied)
```

## Integration with Existing Agents

```
User: "design the NPC system"
  ↓
db-design agent
  ↓ creates
requirements.md, design.md, tasks.md, README.md
  ↓
User: "implement the NPC system"
  ↓
db-implementor agent
  ↓ executes
Task 1.1 → Task 1.2 → Task 1.3 → ... → Task 6.4
  ↓ for each task
Implement → Test → Verify → Mark complete
  ↓ result
Complete feature with 100% test coverage
```

## Success Metrics

**After implementing NPC system with db-implementor:**
- ✅ 16 tasks completed
- ✅ 16 tests generated
- ✅ 16 screenshots taken
- ✅ 100% test coverage
- ✅ 0 manual test writing
- ✅ Regression suite has 16 new tests
- ✅ All patterns enforced
- ✅ All tasks marked complete
- ✅ README.md updated

**Time comparison:**
- Manual: 16.75 hours implementation + 4-8 hours testing = **20-25 hours**
- With db-implementor: 16.75 hours (testing is automatic) = **16.75 hours**
- **Savings: 3-8 hours per feature**

---

Ready to create the agent? I can draft the complete agent instructions file.
