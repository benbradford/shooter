# Agent Quick Reference

## When to Use Which Agent

| You Want To... | Say This | Agent |
|----------------|----------|-------|
| Design a new feature | "design the {feature} system" | db-design |
| Implement a task | "implement task 1.1 from features/npc/tasks.md" | db-implementor |
| Implement a phase | "implement phase 1 from features/npc/tasks.md" | db-implementor |
| Implement all tasks | "implement all tasks from features/npc/tasks.md" | db-implementor |
| Quick code change | "add npc to EntityType" | dodging-bullets |
| Update sprite sheet | "update thrower spritesheet" | db-asset-management |
| Add editor feature | "add NPC to editor" | db-level-editor |
| Ask a question | "how does the grid system work?" | dodging-bullets |
| Debug an issue | "why isn't NPC rendering?" | dodging-bullets |

## Trigger Phrases

### db-design
- "design"
- "flesh out the design"
- "create a spec"
- "plan out"

### db-implementor ⭐ NEW
- "implement task X.Y from"
- "implement phase X from"
- "implement all tasks from"

### db-asset-management
- "update {enemy} spritesheet"
- "optimize assets"
- "align sprites"

### db-level-editor
- "add editor mode"
- "add {entity} to editor"
- "fix editor"

## User Overrides

Skip delegation with:
- "implement task X.Y **directly**" → dodging-bullets (no testing)
- "**quick fix**: add X to Y" → dodging-bullets (no testing)

## What Each Agent Does

### db-design
✓ Asks clarifying questions
✓ Creates POCs
✓ Writes requirements, design, tasks
✓ Identifies ambiguities

### db-implementor ⭐
✓ Executes tasks from specs
✓ Generates tests automatically
✓ Enforces patterns
✓ Runs browser tests
✓ Takes screenshots
✓ Builds regression suite
✓ Marks tasks complete

### db-asset-management
✓ Generates sprite sheets
✓ Optimizes images
✓ Aligns frames

### db-level-editor
✓ Creates editor states
✓ Adds entities to editor
✓ Fixes editor bugs

## Example Session

```
User: "design the NPC system"
→ db-design creates specs (2 hours)

User: "implement all tasks from features/npc/tasks.md"
→ db-implementor executes 18 tasks (16 hours)
→ Generates 18 tests
→ Creates regression suite
→ 100% coverage

Result: Complete feature in 18 hours (vs 30-45 hours manual)
```

## Quick Decision

**Does your request reference a task file?**
- YES → db-implementor
- NO → dodging-bullets (unless design/asset/editor work)
