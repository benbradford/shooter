Instructions for Kiro: Upgrade Design System to Multi-Agent Architecture Validation

We are upgrading the design workflow to prevent runtime failures caused by incorrect execution ordering, lifecycle assumptions, and race conditions.

The new system adds two analysis agents after the design phase:

Architect Agent (existing)
        ↓
Runtime Analysis Agent (new)
        ↓
Failure Analysis Agent (new)
        ↓
Final Design Approval

The goal is to ensure design correctness before implementation.

1. Update Feature Design Workflow

Modify the design pipeline to this:

disambiguate-feature
      ↓
research-approaches
      ↓
create-spec
      ↓
runtime-analysis      ⭐ NEW
      ↓
failure-analysis      ⭐ NEW
      ↓
maintain-consistency
      ↓
final approval

Rule: No feature design is considered complete until both analysis stages pass.

2. New SOP: runtime-analysis.md

Create a new SOP file:

docs/runtime-analysis.md

Contents:

# SOP: Runtime Analysis

Purpose:
Verify that the proposed design executes correctly at runtime.

Architectural correctness is not sufficient; runtime ordering must also be valid.

This SOP simulates execution step-by-step and validates lifecycle assumptions.

---

## Step 1: Identify Critical Execution Flows

Extract all runtime flows from design.md.

Examples:

- Level transition
- Asset loading
- Scene shutdown
- Enemy spawn
- Collision handling

Each flow must be analyzed independently.

---

## Step 2: Perform Mechanical Execution Trace

Simulate execution line-by-line.

Example format:

1. Player touches exit
2. GameScene.transitionLevel() called
3. TransitionController.startTransition()

   3.1 stop("game") called
   3.2 SceneManager queues shutdown
   3.3 LoadingScene loads assets

4. SceneManager.shutdown()

   4.1 DisplayList.shutdown()
   4.2 Destroy Text objects
   4.3 Destroy sprites

5. AssetManager.unloadTextures()

Verify:

- Does each object exist when accessed?
- Are resources destroyed in the correct order?
- Are async operations respected?

---

## Step 3: Lifecycle Ownership Verification

For each resource, define:

| Resource | Created By | Destroyed By | Lifetime |
|---------|------------|--------------|---------|

Example:

Texture
Created by: AssetLoader
Destroyed by: AssetManager
Used by: Sprites, Tilemaps, Text

Verify:

- Resource not destroyed while still referenced.

---

## Step 4: Temporal Coupling Detection

Check for operations that assume specific timing.

Examples of dangerous patterns:

Destroy resource
→ objects referencing resource destroyed later

Unload asset
→ animations still using frames

Stop scene
→ unload textures immediately

These must be flagged as **Temporal Coupling Risks**.

---

## Step 5: Async Boundary Analysis

Mark all async operations:

- loader events
- scene transitions
- promises
- delayed calls

For each boundary verify:

State assumptions are still valid.

Example failure:


stop(scene)
unloadTextures()

BUT scene shutdown occurs later


---

## Step 6: Race Condition Detection

Check if two systems can operate simultaneously.

Examples:

AssetManager unloads textures while SceneManager destroys objects.

Loader finishes while scene is restarting.

List possible races.

---

## Step 7: Runtime Safety Checklist

Design passes runtime validation if:

- No resource destroyed while referenced
- No async race conditions
- Lifecycle ownership clearly defined
- All execution flows trace correctly

---

## Output

Create:

features/{feature}/runtime-analysis.md

Include:

Execution flows
Lifecycle tables
Race condition analysis
Temporal coupling risks
Fix recommendations
3. New SOP: failure-analysis.md

Create file:

docs/failure-analysis.md

Contents:

# SOP: Failure Analysis

Purpose:
Stress-test the design by intentionally trying to break it.

This simulates how real runtime failures occur.

---

## Step 1: Identify Failure Surfaces

List system boundaries:

Scene transitions
Asset loading
Collision systems
AI updates
Event systems

These are the most common failure sources.

---

## Step 2: Edge Case Simulation

Test unusual scenarios:

Scene restart during load
Asset load failure
Duplicate transitions
Slow network
Empty asset list

---

## Step 3: Timing Attacks

Simulate timing issues.

Examples:

stop(scene)
start(scene) immediately

Unload textures during render

Start level twice

Check whether system remains stable.

---

## Step 4: Resource Stress Tests

Simulate:

- hundreds of entities
- rapid level transitions
- repeated asset loads

Verify memory and lifecycle behavior.

---

## Step 5: Invalid State Testing

Test system with unexpected inputs.

Examples:

null level data
missing asset
duplicate texture keys

Verify system fails gracefully.

---

## Step 6: Failure Recovery

Check whether system can recover from errors.

Examples:

asset load failure
scene start failure
partial initialization

Design must define recovery path.

---

## Step 7: Risk Report

Produce:

features/{feature}/failure-analysis.md

Include:

Failure scenarios
Detected risks
Mitigation strategies
Confidence level
4. Mandatory Execution Flow Method

Update design agent instructions with this requirement:

Every design must include a complete execution trace.

The trace must simulate:

1. Trigger event
2. All functions called
3. All async boundaries
4. Object creation
5. Object destruction
6. Resource lifetime

The design must prove that resources are not destroyed before dependents.

Example format:

Flow: Level Transition

1 Player enters exit tile
2 GameScene calls startTransition
3 TransitionScene.stop("game")

   3.1 SceneManager queues shutdown

4 LoadingScene begins asset loading

5 SceneManager.shutdown executes

   5.1 DisplayList.shutdown
   5.2 Destroy Text
   5.3 Destroy sprites

6 AssetManager.unloadUnused

SAFE: all objects destroyed before textures removed
5. Add New Documents to Feature Structure

Update feature structure:

features/{feature}/

requirements.md
design.md
tasks.md
README.md

runtime-analysis.md   ⭐ NEW
failure-analysis.md   ⭐ NEW
scrutiny.md
6. Design Completion Criteria

Update success checklist:

Design is complete when:

✅ Multiple approaches evaluated
✅ Architecture defined
✅ Execution flow verified
✅ Runtime analysis complete
✅ Failure analysis complete
✅ Race conditions resolved
✅ Temporal coupling eliminated
7. Mandatory Design Validation Rule

Before implementation begins:

runtime-analysis.md must report:
- No lifecycle violations

failure-analysis.md must report:
- No critical failure risks

Otherwise design must be revised.

8. Optional: Add Chaos Testing Mode

If a design touches:

scene lifecycle

asset management

physics systems

networking

Failure analysis must include Chaos Testing:

Random scene restarts
Random asset failures
Rapid transitions
Repeated calls
Result

Your design pipeline becomes:

Architecture Design
      ↓
Runtime Simulation
      ↓
Failure Stress Testing
      ↓
Implementation

This dramatically reduces runtime bugs caused by lifecycle issues.

What this specifically prevents

The Phaser crash you encountered would have been detected because runtime-analysis would have traced:

Scene.stop()
↓
textures unloaded
↓
DisplayList.shutdown destroys Text
↓
CanvasTexture tries removeKey
↓
TextureManager already modified

The analysis would flag:

Temporal Coupling Violation
Resource destroyed before dependents
Final Recommendation

After adding these two agents your system becomes very close to professional game-engine architecture review pipelines.

The three roles become:

Architect Agent
Runtime Analyst Agent
Failure/Chaos Agent

Together they dramatically improve design reliability.