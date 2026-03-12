# Agent Delegation Rules

## Overview

The Dodging Bullets project uses specialized agents for different tasks. This document defines when to use each agent.

## Agent Roster

### 1. dodging-bullets (Main Agent)
**Purpose**: General development, questions, debugging, quick fixes

**Use for:**
- Answering questions about the codebase
- Explaining architecture
- Debugging issues
- Quick code changes (not from task files)
- Documentation updates
- General guidance

### 2. db-design (Design Specialist)
**Purpose**: Feature design and specification

**Use for:**
- "design {feature}"
- "flesh out the design"
- "create a spec for {feature}"
- "plan out {feature}"

### 3. db-implementor (Implementation Specialist)
**Purpose**: Task execution with automated testing

**Use for:**
- "implement task X.Y from features/{feature}/tasks.md"
- "implement phase X from features/{feature}/tasks.md"
- "implement all tasks from features/{feature}/tasks.md"

### 4. db-asset-management (Asset Specialist)
**Purpose**: Sprite sheets, asset optimization, image processing

**Use for:**
- "update {enemy} spritesheet"
- "optimize assets"
- "align sprites"

### 5. db-level-editor (Editor Specialist)
**Purpose**: Level editor features and fixes

**Use for:**
- "add editor mode for {feature}"
- "add {entity} to editor"
- "fix editor {issue}"

## Delegation Rules for dodging-bullets Agent

### IMMEDIATELY Delegate to db-design

```
User says ANY of:
- "design {feature}"
- "flesh out the design"
- "create a spec"
- "plan out {feature}"
- "how should I implement {feature}" (if complex/new)

→ use_subagent({ agent_name: "db-design", ... })
```

### IMMEDIATELY Delegate to db-implementor

```
User says ANY of:
- "implement task X.Y from features/{feature}/tasks.md"
- "implement phase X from features/{feature}/tasks.md"
- "implement all tasks from features/{feature}/tasks.md"

→ use_subagent({ agent_name: "db-implementor", ... })
```

### IMMEDIATELY Delegate to db-asset-management

```
User says ANY of:
- "update {enemy} spritesheet"
- "optimize assets"
- "align sprites"
- "resize {asset}"

→ use_subagent({ agent_name: "db-asset-management", ... })
```

### IMMEDIATELY Delegate to db-level-editor

```
User says ANY of:
- "add editor mode for {feature}"
- "add {entity} to editor"
- "fix editor {issue}"

→ use_subagent({ agent_name: "db-level-editor", ... })
```

### Handle Directly (No Delegation)

```
User says:
- "how does X work?"
- "explain Y"
- "add X to Y" (direct request, not task-based)
- "implement task X.Y directly" (user override)
- "quick fix: {change}"
- "debug {issue}"

→ Handle yourself
```

## User Override

Users can bypass delegation with explicit keywords:

```
"implement task 1.1 directly" → dodging-bullets handles it
"quick fix: add npc to EntityType" → dodging-bullets handles it
```

**When user overrides:**
- Skip automated testing
- Skip pattern enforcement
- User takes responsibility
- Faster but less thorough

## Decision Tree

```
User request
  ↓
Contains "design" or "flesh out"?
  ↓ YES → db-design
  ↓ NO
Contains "implement task/phase" from tasks.md?
  ↓ YES → Check for "directly" override
    ↓ YES → dodging-bullets
    ↓ NO → db-implementor
  ↓ NO
Contains "update spritesheet" or "optimize assets"?
  ↓ YES → db-asset-management
  ↓ NO
Contains "add editor mode" or "fix editor"?
  ↓ YES → db-level-editor
  ↓ NO
→ dodging-bullets (general question/task)
```

## Examples

| User Request | Agent | Reason |
|--------------|-------|--------|
| "design the NPC system" | db-design | Design work |
| "implement task 1.1 from features/npc/tasks.md" | db-implementor | Task execution |
| "implement task 1.1 directly" | dodging-bullets | User override |
| "add npc to EntityType" | dodging-bullets | Direct request (not task-based) |
| "how does EntityLoader work?" | dodging-bullets | Question |
| "update thrower spritesheet" | db-asset-management | Asset work |
| "add NPC to editor" | db-level-editor | Editor work |
| "implement all tasks from features/npc/tasks.md" | db-implementor | Batch execution |
| "quick fix: export NPCComponent" | dodging-bullets | Quick fix |
| "debug why NPC isn't rendering" | dodging-bullets | Debugging |

## Key Principles

1. **Trigger phrases are explicit** - "implement task", "design", "update spritesheet"
2. **Task-based = delegate** - If referencing tasks.md, use db-implementor
3. **Direct requests = handle** - If not task-based, use dodging-bullets
4. **User can override** - "directly" or "quick fix" bypasses delegation
5. **When in doubt** - Delegate (better to over-delegate than under-delegate)

## Benefits of Clear Rules

✅ No ambiguity - Agent knows exactly when to delegate
✅ Consistent behavior - Same request always goes to same agent
✅ User control - Override available when needed
✅ Predictable - User knows what to expect
✅ Testable - Can verify delegation works correctly

## Testing Delegation

To verify delegation works:

```bash
# Test 1: Design delegation
User: "design the shield system"
Expected: Delegates to db-design

# Test 2: Implementation delegation
User: "implement task 1.1 from features/npc/tasks.md"
Expected: Delegates to db-implementor

# Test 3: Direct handling
User: "add npc to EntityType"
Expected: dodging-bullets handles directly

# Test 4: User override
User: "implement task 1.1 directly"
Expected: dodging-bullets handles directly
```
