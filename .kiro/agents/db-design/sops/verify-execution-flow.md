# SOP: Verify Execution Flow

## Purpose

Catch backwards logic, timing issues, and race conditions by tracing actual code execution step-by-step.

## When to Use

**MANDATORY before finalizing any design** that involves:
- Asynchronous operations
- State initialization
- Resource loading
- Multi-step processes
- Event-driven logic

## Process

### 1. Identify Critical Paths

List all important execution sequences:
- User triggers action → system responds
- System loads data → processes → displays
- Event fires → listeners respond
- Error occurs → system recovers

### 2. Trace Each Path Line-by-Line

For each critical path, write out EXACT execution:

```
Scenario: Load Level Assets

1. User clicks exit portal
2. LevelExitComponent.onEvent('exit_to_level2') called
3. Line 1: Get target level name
4. Line 2: Call LoadingScene.init({ targetLevel: 'level2' })
5. LoadingScene.init() executes
   5.1. Store targetLevel
   5.2. Launch LoadingScene
6. LoadingScene.create() executes
   6.1. Create UI elements
   6.2. Call loadLevel() [async]
7. loadLevel() executes
   7.1. Fetch level JSON
   7.2. Parse JSON
   7.3. Call AssetLoadCoordinator.loadLevelAssets()
8. AssetLoadCoordinator.loadLevelAssets() executes
   8.1. Get required assets from manifest
   8.2. For each asset: call loadAsset()
9. loadAsset('grass1') executes
   9.1. Check if textures.exists('grass1') → FALSE (not loaded yet)
   9.2. Queue load for 'grass1'
10. loadAsset('tree1') executes
    10.1. Check if textures.exists('tree1') → FALSE
    10.2. Queue load for 'tree1'
... (repeat for all assets)
11. All loads queued
12. Phaser loader starts loading
13. Assets load asynchronously
14. Loader fires 'complete' event
15. AssetLoadCoordinator receives 'complete'
16. Verify all textures
    16.1. verifyTexture('grass1') → TRUE (now loaded)
    16.2. verifyTexture('tree1') → TRUE
... (all pass)
17. Return success
18. LoadingScene starts GameScene
```

### 3. Verify Timing at Each Step

For each line, ask:

**State Questions:**
- What state exists at this point?
- Has X been initialized yet?
- Is Y ready to use?
- Could Z be null here?

**Timing Questions:**
- Does this happen before or after the thing it depends on?
- Am I checking for something that doesn't exist yet?
- Am I using data that hasn't been loaded yet?
- Is this synchronous or async?

**Error Questions:**
- What if this step fails?
- What if this returns null?
- What if this times out?
- What if this is called twice?

### 4. Identify Backwards Logic

**Red flags to look for:**

❌ **Verify before create**
```
if (thing.isValid()) return;  // Checking before creating
createThing();
```

❌ **Check state before initialize**
```
if (system.isReady()) return;  // Checking before initializing
system.initialize();
```

❌ **Validate before load**
```
if (data.isComplete()) return;  // Checking before loading
loadData();
```

❌ **Use before ready**
```
const result = system.getData();  // Using before initialization
system.initialize();
```

✅ **Correct order:**
```
createThing();
if (!thing.isValid()) error();  // Verify AFTER create

system.initialize();
if (!system.isReady()) error();  // Check AFTER initialize

loadData();
if (!data.isComplete()) error();  // Validate AFTER load
```

### 5. Document in Scrutiny

Add section to scrutiny.md:

```markdown
## Execution Flow Verification

### Critical Path 1: {Scenario}

**Step-by-step execution:**
1. ...
2. ...

**Timing verification:**
- [ ] All state exists when accessed
- [ ] No backwards logic
- [ ] Async handled correctly
- [ ] Errors handled
- [ ] No race conditions

**Identified issues:**
- None / Issue description

### Critical Path 2: {Scenario}
...
```

### 6. Test Mental Model

**Simulate execution in your head:**
- Start from user action
- Follow each function call
- Track what state exists at each point
- Note when async operations happen
- Verify error handling

**If you can't trace it clearly, the design has problems.**

## Example: levelload Bug

### What Scrutiny Missed

**Original scrutiny asked:**
> Q1: Should verification happen immediately after 'complete' or wait for GPU upload?

**What it SHOULD have asked:**
> Q1: Where in the execution flow does verification happen?
> - Before loading? (checking if already loaded)
> - After loading? (checking if load succeeded)
> - Both? (different purposes)

**Execution flow trace would have revealed:**

```
loadAsset('grass1'):
  Line 1: if (verifyTexture('grass1')) return;
    → textures.exists('grass1') → FALSE
    → Log error: "Texture 'grass1' does not exist"  ← BACKWARDS LOGIC
    → Return false
  Line 2: Queue load
```

**The trace shows:** We're logging errors for textures that SHOULD NOT exist yet.

### How to Prevent

**In scrutiny, add:**

```markdown
## Execution Flow: loadAsset()

**Scenario:** Loading grass1 texture for first time

1. loadAsset('grass1') called
2. Line 1: verifyTexture('grass1')
   - textures.exists('grass1') → FALSE (not loaded yet)
   - ⚠️ ISSUE: Why are we verifying before loading?
   - ⚠️ ISSUE: This will log error for every new texture
3. Line 2: Queue load

**Timing verification:**
- ❌ Verifying before loading (backwards logic)
- ❌ Will log false errors

**Recommendation:** Remove verification from loadAsset(). Only verify AFTER loading completes.
```

## Success Criteria

Execution flow verification is complete when:
- [ ] All critical paths traced line-by-line
- [ ] Timing verified at each step
- [ ] No backwards logic found
- [ ] Async operations handled correctly
- [ ] Error cases covered
- [ ] Race conditions identified
- [ ] Mental model tested
- [ ] Issues documented in scrutiny.md

**If you find issues during tracing, STOP and fix the design before continuing.**
