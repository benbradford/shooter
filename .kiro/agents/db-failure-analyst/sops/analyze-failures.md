# SOP: Analyze Failure Scenarios

## Purpose

Stress-test design by simulating edge cases, timing attacks, and chaos scenarios.

## Input

- `features/{feature}/design.md`

## Output

- `features/{feature}/failure-analysis.md`

## Process

### Step 1: Identify Failure Surfaces

List system boundaries where failures commonly occur:
- Scene transitions
- Asset loading/unloading
- Object creation/destruction
- Event systems
- User input handling
- Network operations (if applicable)

These are your attack targets.

### Step 2: Edge Case Simulation

Test boundary conditions:

**Empty Data:**
- No entities in level
- No textures specified
- Empty arrays
- Null/undefined values

**Maximum Data:**
- 1000 entities
- 100 textures
- Deeply nested structures
- Very long strings

**Invalid Data:**
- Missing required fields
- Wrong types
- Duplicate IDs
- Circular references

For each, determine:
- Does design handle it?
- What happens?
- Is there error handling?

### Step 3: Timing Attacks

Simulate rapid/simultaneous operations:

**Rapid Repeated Calls:**
- Spam transition key 10 times
- Create 100 entities in 1 frame
- Fire 1000 bullets instantly

**Simultaneous Operations:**
- Two transitions at once
- Load and unload simultaneously
- Start and stop scene together

**Interrupt Operations:**
- Stop during load
- Destroy during creation
- Unload during render

**Reverse Order:**
- Unload before load completes
- Destroy before create completes
- Stop before start completes

For each, determine:
- Does design prevent it?
- What breaks?
- Is there a lock/guard?

### Step 4: Resource Stress Tests

Push system limits:

**Entity Stress:**
- 100 enemies
- 1000 bullets
- 10,000 particles

**Memory Stress:**
- 50 level transitions in a row
- Load 100 textures
- Create 1000 sprites

**Cycle Stress:**
- Rapid spawn/destroy cycles
- Rapid load/unload cycles
- Rapid start/stop cycles

For each, determine:
- Does design scale?
- Memory leaks?
- Performance degradation?

### Step 5: Invalid State Testing

Test error handling:

**Missing Resources:**
- Texture doesn't exist
- Level file not found
- Asset load failure

**Corrupted Data:**
- Invalid JSON
- Wrong schema
- Malformed values

**Conflicting States:**
- Scene both active and stopped
- Texture both loaded and unloaded
- Entity both alive and destroyed

For each, determine:
- Does design detect it?
- Error message or crash?
- Recovery path?

### Step 6: Failure Recovery

Test resilience:

**Partial Failures:**
- 1 of 10 assets fails to load
- 1 of 10 entities fails to spawn
- 1 of 10 textures corrupted

**Complete Failures:**
- All assets fail to load
- Scene fails to start
- Renderer fails to initialize

For each, determine:
- Does design recover?
- Fallback behavior?
- User feedback?

### Step 7: Phaser-Specific Attacks

#### Scene Lifecycle Attacks
```
Attack: scene.stop() then scene.start() immediately
Attack: scene.start() twice
Attack: scene.stop() twice
Attack: scene.destroy() then scene.start()
```

#### Texture Attacks
```
Attack: textures.remove() while sprite rendering
Attack: Unload texture used by animation
Attack: Remove texture twice
Attack: Load texture with duplicate key
```

#### Animation Attacks
```
Attack: Play animation with missing frames
Attack: Unload texture used by animation
Attack: Create animation with duplicate key
Attack: Play animation on destroyed sprite
```

#### Object Attacks
```
Attack: destroy() twice
Attack: Destroy parent before children
Attack: Access destroyed object
Attack: Modify destroyed object
```

### Step 8: Generate Report

Create `features/{feature}/failure-analysis.md`:

```markdown
# Failure Analysis: {Feature}

## Attack Scenarios Tested

1. Scenario name (Risk: LEVEL)
2. Scenario name (Risk: LEVEL)

## Scenario 1: {Name}

### Attack

[Description of what you tried to break]

### Expected Behavior

[What should happen]

### Actual Behavior

[What the design allows]

### Risk Level

CRITICAL | HIGH | MEDIUM | LOW

### Mitigation

[How to fix with code example]

## Scenario 2: {Name}

...

## Summary

- ✅ Edge cases handled gracefully
- ❌ Timing attack detected (rapid transitions)
- ✅ Resource stress stable
- ❌ Invalid state crashes (missing asset)
- ✅ Recovery paths defined

**Overall: FAIL**

**Risk Summary:**
- Critical: 0
- High: 2
- Medium: 1
- Low: 0

**Required revisions:**
1. Add transition lock for rapid calls
2. Add error handling for missing assets
3. Add validation for invalid states
```

## Risk Assessment

**CRITICAL:**
- Causes crash
- Easy to trigger (user action)
- No recovery
- Data loss possible

**HIGH:**
- Causes crash or incorrect behavior
- Moderate difficulty to trigger
- Partial recovery
- No data loss

**MEDIUM:**
- Causes incorrect behavior
- Hard to trigger
- Graceful degradation
- No crash

**LOW:**
- Edge case
- Very hard to trigger
- Minimal impact
- Handled gracefully

## Success Criteria

- ✅ Edge cases handled gracefully
- ✅ Timing attacks don't crash
- ✅ Resource stress stable
- ✅ Invalid states fail gracefully
- ✅ Recovery paths defined

If ANY critical risk OR 3+ high risks, report FAIL.

## Attack Creativity

Be creative with attacks:
- Combine multiple attacks (rapid transitions + missing assets)
- Worst-case scenarios (everything fails at once)
- User behavior (spam keys, click rapidly)
- System limits (max memory, max entities)
- Race conditions (two systems fighting)

The goal is to find weaknesses the designer didn't consider.
