# Delegation Rules - Summary

## The Problem You Identified

**"Will we have the same problem with db-implementor that we had with db-design?"**

Yes, we would have - without clear delegation rules.

## The Solution

### Clear Trigger Phrase

**"implement task X.Y from features/{feature}/tasks.md"**

This phrase ALWAYS triggers delegation to db-implementor, no analysis needed.

## When to Use Each Agent

### Use db-implementor When:
✅ User references a task file: "implement task 1.1 from features/npc/tasks.md"
✅ User wants batch execution: "implement phase 1 from features/npc/tasks.md"
✅ User wants full feature: "implement all tasks from features/npc/tasks.md"

### Use dodging-bullets When:
✅ Direct request (no task reference): "add npc to EntityType"
✅ Questions: "how does EntityLoader work?"
✅ Debugging: "why isn't NPC rendering?"
✅ Quick fixes: "quick fix: export NPCComponent"
✅ User override: "implement task 1.1 directly"

## The Key Distinction

**Task-based = db-implementor**
- References tasks.md
- Follows structured workflow
- Gets automated testing

**Direct request = dodging-bullets**
- No task reference
- Quick and simple
- No automated testing

## Why This Works

1. **Unambiguous** - Task reference is clear trigger
2. **Consistent** - Same request always goes to same agent
3. **User control** - Override with "directly" keyword
4. **No analysis needed** - Agent doesn't decide complexity
5. **Predictable** - User knows what to expect

## Example Scenarios

| User Says | Agent | Why |
|-----------|-------|-----|
| "implement task 1.1 from features/npc/tasks.md" | db-implementor | Task reference |
| "add npc to EntityType" | dodging-bullets | Direct request |
| "implement task 1.1 directly" | dodging-bullets | User override |
| "implement phase 1 from features/npc/tasks.md" | db-implementor | Task reference |
| "quick fix: add npc case to EntityLoader" | dodging-bullets | Quick fix |

## Testing the Rules

To verify delegation works correctly:

```bash
# Test 1: Task delegation
User: "implement task 1.1 from features/npc/tasks.md"
Expected: Delegates to db-implementor ✓

# Test 2: Direct handling
User: "add npc to EntityType"
Expected: dodging-bullets handles ✓

# Test 3: User override
User: "implement task 1.1 directly"
Expected: dodging-bullets handles ✓

# Test 4: Phase delegation
User: "implement phase 1 from features/npc/tasks.md"
Expected: Delegates to db-implementor ✓
```

## Benefits

✅ **No confusion** - Clear trigger phrases
✅ **No missed delegations** - Task reference always delegates
✅ **Flexibility** - User can override when needed
✅ **Consistency** - Predictable behavior
✅ **Efficiency** - Right agent for the job

## Implementation Status

- ✅ Delegation rules defined
- ✅ Agent instructions updated
- ✅ Quick reference created
- ✅ db-implementor spec complete
- ⏳ db-implementor agent to be built (16 hours)

## Answer to Your Question

**"Have we really defined when to use db-implementor vs dodging-bullets?"**

**YES.** The rule is simple:

**Task reference in request = db-implementor**
**No task reference = dodging-bullets**

This eliminates the ambiguity problem you identified.
