# SOP: Runtime Analysis

## Purpose

Verify that the proposed design executes correctly at runtime by simulating execution step-by-step and validating lifecycle assumptions.

Architectural correctness is not sufficient - runtime ordering must also be valid.

## When to Use

Run this analysis after design.md is complete, before implementation begins.

Required for features that involve:
- Scene lifecycle (start, stop, shutdown)
- Asset management (load, unload)
- Async operations (promises, events)
- Resource dependencies (textures, animations, objects)

## Process

### Step 1: Identify Critical Execution Flows

Extract all runtime flows from design.md.

Examples:
- Level transition
- Asset loading
- Scene shutdown
- Enemy spawn
- Collision handling

List each flow that involves multiple systems or async operations.

### Step 2: Mechanical Execution Trace

Simulate execution line-by-line for each flow.

Format:
```
1. Event occurs
2. Function A called
3. Function A does X
   3.1. Calls function B
   3.2. Queues async operation
4. Function B executes
   4.1. Accesses resource Y
   4.2. Modifies state Z
5. Async operation completes
   5.1. Callback fires
   5.2. Accesses resource Y
```

Mark async boundaries with `[async]` or `[queued]`.

Verify at each step:
- Does the resource exist when accessed?
- Is the state valid?
- Has anything been destroyed?

### Step 3: Lifecycle Ownership Table

For each resource, define:

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| Texture | AssetLoader | textures.remove() | Manual | Sprites, Animations |
| Sprite | Scene.add | DisplayList.shutdown | Scene | Renderer |
| Text | Scene.add | DisplayList.shutdown | Scene | Renderer |
| CanvasTexture | Text | Text.destroy | Text | TextureManager |
| Animation | anims.create | anims.remove | Global | Sprites |

Check for violations:
- Resource destroyed while still referenced
- Dependent outlives resource
- Wrong system destroys resource

### Step 4: Temporal Coupling Detection

Find operations that assume specific timing.

Dangerous patterns:
```
Operation A
  ↓ [assumes immediate]
Operation B uses result of A
```

Examples:
- `scene.stop()` then immediately access scene objects
- `textures.remove()` then scene shutdown destroys objects using texture
- `load.start()` then immediately verify textures

Mark each as **Temporal Coupling Risk** with explanation.

### Step 5: Async Boundary Analysis

Mark all async operations:
- `scene.start()`, `scene.stop()` - queued, execute later
- `load.start()` - async, fires 'complete' event
- `await promise` - suspends execution
- `time.delayedCall()` - deferred execution
- Event listeners - fire at unpredictable times

For each boundary, verify:
- State assumptions still valid after boundary
- Resources still exist after boundary
- No race conditions with other async operations

### Step 6: Race Condition Detection

Check if two systems can operate simultaneously.

Examples:
- AssetManager unloads textures while SceneManager destroys objects
- Loader finishes while scene is restarting
- Two scenes start simultaneously

List possible races and their consequences.

### Step 7: Output

Create: `features/{feature}/runtime-analysis.md`

Include:
- Execution flows (step-by-step traces)
- Lifecycle ownership table
- Temporal coupling risks
- Async boundary analysis
- Race conditions detected
- Violations found
- Fix recommendations

## Success Criteria

Design passes runtime validation if:
- ✅ No resource destroyed while referenced
- ✅ No async race conditions
- ✅ Lifecycle ownership clearly defined
- ✅ All execution flows trace correctly
- ✅ No temporal coupling violations

If any fail, design must be revised before implementation.

## Example Output

See `features/levelload/runtime-analysis-test.md` for complete example.

Key sections:
```markdown
## Execution Flow: Level Transition

1. Player touches exit
2. scene.start('LoadingScene') [queued]
3. LoadingScene.init()
   3.1. scene.stop('game') [queued]
4. LoadingScene.create()
5. SceneManager.shutdown('game') [async]
   5.1. DisplayList.shutdown()
   5.2. Destroy objects

## Violation Detected

Resource: CanvasTexture
Destroyed: Step 4 (textures.remove)
Still used by: Text (destroyed in step 5.2)

Fix: Wait for shutdown before unloading textures
```

## Common Violations

### Violation 1: Resource destroyed before dependent

```
textures.remove(key)
  ↓
scene.shutdown()
  ↓
Text.destroy() tries to remove CanvasTexture
  ↓
CRASH: TextureManager entry already null
```

**Fix:** Destroy dependents first, then resource.

### Violation 2: Async operation assumes sync completion

```
scene.stop('game')
gameScene.children.removeAll()  ← Assumes stopped
```

**Fix:** Wait for shutdown event before accessing scene.

### Violation 3: Temporal coupling

```
load.start()
verify textures  ← Assumes loaded
```

**Fix:** Wait for 'complete' event before verifying.

### Violation 4: Lifetime mismatch

```
Global animation references level texture
Level unloads texture
Animation still exists
```

**Fix:** Remove animations before unloading textures, or keep textures global.

## Integration with Design Process

```
requirements.md
  ↓
design.md
  ↓
runtime-analysis.md  ← YOU ARE HERE
  ↓
failure-analysis.md
  ↓
tasks.md
```

Runtime analysis must pass before proceeding to failure analysis.
