# SOP: Analyze Runtime Execution

## Purpose

Perform mechanical execution simulation to verify design correctness.

## Input

- `features/{feature}/design.md`

## Output

- `features/{feature}/runtime-analysis.md`

## Process

### Step 1: Identify Critical Execution Flows

Extract all runtime flows from design.md that involve:
- Scene lifecycle (start, stop, shutdown)
- Asset management (load, unload)
- Object creation/destruction
- Async operations
- Event systems

List each flow by name.

### Step 2: Mechanical Execution Trace

For each flow, simulate execution line-by-line:

```
1. Event occurs
2. Function A called
3. Function A does X
   3.1. Calls function B [ASYNC if applicable]
   3.2. Queues operation
4. Function B executes
   4.1. Accesses resource Y
   4.2. Modifies state Z
5. Async operation completes
   5.1. Callback fires
   5.2. Accesses resource Y
```

Mark async boundaries with `[ASYNC]`, `[QUEUED]`, or `[EVENT]`.

At each step, verify:
- Does the resource exist when accessed?
- Is the state valid?
- Has anything been destroyed?

### Step 3: Lifecycle Ownership Table

For each resource in the flow, create table:

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

Find operations that assume specific timing:

**Pattern:**
```
Operation A
  ↓ [assumes immediate]
Operation B uses result of A
```

**Examples:**
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

Check if two systems can operate simultaneously:

**Examples:**
- AssetManager unloads textures while SceneManager destroys objects
- Loader finishes while scene is restarting
- Two scenes start simultaneously

List possible races and their consequences.

### Step 7: Phaser-Specific Checks

#### Scene Lifecycle
```
scene.stop()
  ↓ [ASYNC - queued by SceneManager]
SceneManager.shutdown()
  ↓
Systems.shutdown()
  ↓
DisplayList.shutdown()
  ↓
Destroy all objects
```

**Violation:** Any operation between stop() and shutdown completion that assumes objects are destroyed.

#### Texture Lifecycle
```
Texture created
  ↓
Objects reference texture
  ↓
Scene shutdown
  ↓
Objects destroyed
  ↓
Objects remove texture references
  ↓
NOW safe to textures.remove()
```

**Violation:** Removing texture before objects finish destroying.

#### Animation Lifecycle
```
anims.create() - GLOBAL
  ↓
Animation → Frames → Texture
  ↓
If texture unloaded → crash
```

**Violation:** Unloading texture used by animation without removing animation first.

### Step 8: Generate Report

Create `features/{feature}/runtime-analysis.md`:

```markdown
# Runtime Analysis: {Feature}

## Execution Flows Analyzed

1. Flow name
2. Flow name

## Flow 1: {Name}

### Execution Trace

1. Step
2. Step
   2.1 Substep [ASYNC]
3. Step

### Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|

### Temporal Coupling Risks

- Risk 1: Description
- Risk 2: Description

### Async Boundaries

- Boundary 1: Description
- Boundary 2: Description

### Race Conditions

- Race 1: Description

### Violations Detected

#### ❌ Violation 1: {Type}

**Location:** design.md section

**Problem:** Description

**Why it fails:** Explanation

**Fix:** Solution

## Summary

- ✅ No resource destroyed while referenced
- ❌ Async race condition detected
- ✅ Lifecycle ownership clearly defined
- ✅ All execution flows trace correctly

**Overall: FAIL**

**Required revisions:**
1. Fix async race condition in Flow 1
2. Add shutdown event wait before texture unload
```

## Success Criteria

- ✅ No resource destroyed while referenced
- ✅ No async race conditions
- ✅ Lifecycle ownership clearly defined
- ✅ All execution flows trace correctly
- ✅ No temporal coupling violations

If ANY fails, report FAIL and list required revisions.
