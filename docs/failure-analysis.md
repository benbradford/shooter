# SOP: Failure Analysis

## Purpose

Stress-test the design by intentionally trying to break it. This simulates how real runtime failures occur.

## When to Use

Run after runtime-analysis.md passes. Required for all features involving scene lifecycle, assets, or async operations.

## Process

### Step 1: Identify Failure Surfaces

List system boundaries:
- Scene transitions
- Asset loading
- Collision systems
- AI updates
- Event systems

These are the most common failure sources.

### Step 2: Edge Case Simulation

Test unusual scenarios:
- Scene restart during load
- Asset load failure
- Duplicate transitions
- Slow network
- Empty asset list

### Step 3: Timing Attacks

Simulate timing issues.

Examples:
- `stop(scene)` then `start(scene)` immediately
- Unload textures during render
- Start level twice

Check whether system remains stable.

### Step 4: Resource Stress Tests

Simulate:
- Hundreds of entities
- Rapid level transitions
- Repeated asset loads

Verify memory and lifecycle behavior.

### Step 5: Invalid State Testing

Test system with unexpected inputs.

Examples:
- Null level data
- Missing asset
- Duplicate texture keys

Verify system fails gracefully.

### Step 6: Failure Recovery

Check whether system can recover from errors.

Examples:
- Asset load failure
- Scene start failure
- Partial initialization

Design must define recovery path.

### Step 7: Risk Report

Produce: `features/{feature}/failure-analysis.md`

Include:
- Failure scenarios
- Detected risks
- Mitigation strategies
- Confidence level

## Success Criteria

Design passes failure validation if:
- ✅ Edge cases handled
- ✅ Timing attacks don't crash
- ✅ Resource stress stable
- ✅ Invalid states fail gracefully
- ✅ Recovery paths defined

## Example Output

See `features/levelload/failure-analysis-test.md` for complete example.

## Common Failure Patterns

### Pattern 1: Rapid transitions

```
Exit level A
Exit level B (before A completes)
→ Double destroy
```

### Pattern 2: Async after destroy

```
Scene.loadLevel() [async]
Scene.restart()
loadLevel() continues with destroyed scene
→ Null reference
```

### Pattern 3: Resource race

```
Unload texture
Sprite still rendering
→ Missing texture crash
```

## Integration with Design Process

```
requirements.md
  ↓
design.md
  ↓
runtime-analysis.md
  ↓
failure-analysis.md  ← YOU ARE HERE
  ↓
tasks.md
```

Both analyses must pass before implementation.
