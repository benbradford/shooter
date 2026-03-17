# Dog Bark Ability - Task Breakdown

## Phase 1: Core Bark Ability (2 hours)

### Task 1.1: Add bark animations to PetAnimations.ts
**File**: `src/ecs/entities/pet/PetAnimations.ts`

**Subtasks**:
- [x] After idle/walk animation creation, check for `metadata.animations['bark']`
- [x] Create `bark_${dir}` animations with 'once' style, 0.1s per frame

**Dependencies**: None
**Estimated Time**: 10 minutes
**Actual Time**: 5min

---

### Task 1.2: Add isBarking flag to PetFollowComponent
**File**: `src/ecs/components/pet/PetFollowComponent.ts`

**Subtasks**:
- [x] Add `private isBarking = false`
- [x] In `update()`, return early if `this.isBarking`
- [x] Add `setBarking(barking: boolean)` and `getIsBarking()` methods

**Dependencies**: None
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

### Task 1.3: Create DogBarkAbility component
**File**: `src/ecs/components/pet/DogBarkAbility.ts`

**Subtasks**:
- [x] Create component with `idle | approaching | barking` state machine
- [x] `getNearestEnemyInRange()`: query entities with 'enemy' tag, exclude bugbase IDs, exclude destroyed/dying, within 400px of dog
- [x] `activate(target)`: set state to approaching, set PetFollowComponent.isBarking = true
- [x] `updateApproaching(delta)`: move toward target (direct movement at 300px/sec), abort if target destroyed, transition to barking when within 100px
- [x] `updateBarking(delta)`: play bark animation, apply fear on first frame, return to idle after 600ms
- [x] `applyFearToNearbyEnemies()`: find all enemies within 600px, add FearComponent, enter fear state, flash white, create bark wave
- [x] `createBarkWave()`: expanding circle Graphics effect

**Dependencies**: Task 1.1, Task 1.2
**Estimated Time**: 1.5 hours
**Actual Time**: 15min

---

### Task 1.4: Add DogBarkAbility to PetEntity
**File**: `src/ecs/entities/pet/PetEntity.ts`

**Subtasks**:
- [x] Import DogBarkAbility
- [x] If `config.id === 'dog'`, add DogBarkAbility component
- [x] Add to update order before AnimationComponent

**Dependencies**: Task 1.3
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

### Task 1.5: Route dog ability in PetAbilityComponent
**File**: `src/ecs/components/pet/PetAbilityComponent.ts`

**Subtasks**:
- [x] Import DogBarkAbility
- [x] In `tryAbility()`, if dog selected: get DogBarkAbility from pet entity, check isActive and getNearestEnemyInRange, call activate
- [x] In `canUseAbility()`, if dog selected: also check DogBarkAbility.getNearestEnemyInRange() is non-null

**Dependencies**: Task 1.3
**Estimated Time**: 15 minutes
**Actual Time**: 5min

---

## Phase 2: Fear State (1.5 hours)

### Task 2.1: Create EnemyFearState
**File**: `src/ecs/entities/common/EnemyFearState.ts`

**Subtasks**:
- [x] Create shared IState class
- [x] Constructor takes: entity, grid, baseSpeedPxPerSec, animPrefix, optional onFlee callback
- [x] `onEnter()`: read FearComponent for source position, calculate flee angle with ±15° jitter, play walk animation
- [x] `onUpdate(delta)`: move entity away from source at speed * 1.2 via transform (GridCollisionComponent handles walls)
- [x] Handle both Phaser anim (animPrefix) and frame-based (onFlee callback) enemies

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 10min

---

### Task 2.2: Create FearComponent
**File**: `src/ecs/components/combat/FearComponent.ts`

**Subtasks**:
- [x] Store sourceX, sourceY, durationMs, returnState, scene
- [x] Create fear icon sprite above entity on construction
- [x] Scale tween 0 → 1.2 → 1.0 over 200ms
- [x] `update(delta)`: increment elapsed, jitter icon ±1px, call endFear when expired
- [x] `resetTimer()`: reset elapsed to 0
- [x] `endFear()`: fade out icon over 300ms, transition state machine to returnState, remove self from entity
- [x] `onDestroy()`: destroy fear icon sprite

**Dependencies**: Task 2.1
**Estimated Time**: 45 minutes
**Actual Time**: 10min

---

### Task 2.3: Add fear state to skeleton
**File**: `src/ecs/entities/skeleton/SkeletonEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear: new EnemyFearState(entity, grid, config.speedPxPerSec, 'skeleton_walk_')` to state machine

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

### Task 2.4: Add fear state to bug
**File**: `src/ecs/entities/bug/BugEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear` state with frame-based onFlee callback (using BugChaseState's getDirectionFrame pattern)

**Dependencies**: Task 2.1
**Estimated Time**: 10 minutes
**Actual Time**: 5min

---

### Task 2.5: Add fear state to puma
**File**: `src/ecs/entities/puma/PumaEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear: new EnemyFearState(entity, grid, config.pxPerSecond, 'puma_running_')` to state machine

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

### Task 2.6: Add fear state to thrower
**File**: `src/ecs/entities/thrower/ThrowerEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear: new EnemyFearState(entity, grid, config.speedPxPerSec, 'thrower_running_')` to state machine

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

### Task 2.7: Add fear state to stalking_robot
**File**: `src/ecs/entities/robot/StalkingRobotEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear` state with frame-based onFlee callback (robot uses custom frame logic)

**Dependencies**: Task 2.1
**Estimated Time**: 10 minutes
**Actual Time**: 5min

---

### Task 2.8: Add fear state to bulletDude
**File**: `src/ecs/entities/bulletdude/BulletDudeEntity.ts`

**Subtasks**:
- [x] Import EnemyFearState
- [x] Add `fear: new EnemyFearState(entity, grid, 100, 'bulletdude_walk_')` to state machine

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes
**Actual Time**: 3min

---

## Phase 3: HUD & Assets (30 minutes)

### Task 3.1: Register bark_icon and fear_icon assets
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [x] Add `bark_icon` pointing to `public/assets/pets/dog/dog/bark_icon.png`
- [x] Add `fear_icon` pointing to `public/assets/pets/dog/dog/fear_icon.png`
- [x] Add both to core/always-loaded asset group

**Dependencies**: None
**Estimated Time**: 5 minutes
**Actual Time**: 2min

---

### Task 3.2: Update PetActionButtonComponent for bark icon
**File**: `src/ecs/components/ui/PetActionButtonComponent.ts`

**Subtasks**:
- [x] When dog is selected, set sprite texture to `bark_icon`
- [x] Check DogBarkAbility.getNearestEnemyInRange() for icon visibility
- [x] Alpha 0.2 when no enemy in range or on cooldown

**Dependencies**: Task 1.3, Task 3.1
**Estimated Time**: 20 minutes
**Actual Time**: 5min

---

### Task 3.3: Expose DogBarkAbility to window
**File**: `src/main.ts`

**Subtasks**:
- [x] Add `(window as any).DogBarkAbility = DogBarkAbility` for HUD access

**Dependencies**: Task 1.3
**Estimated Time**: 2 minutes
**Actual Time**: 1min

---

## Phase 4: Testing (1 hour)

### Task 4.1: Manual testing
**Subtasks**:
- [ ] Dog walks toward enemy and barks
- [ ] Bark animation plays correctly in all 8 directions
- [ ] Enemies flee for 4 seconds
- [ ] Fear icon appears/disappears smoothly
- [ ] Bark wave ring visible
- [ ] White flash on feared enemies
- [ ] BugBase immune
- [ ] Cooldown works (3 seconds)
- [ ] Icon hidden when no enemy in range
- [ ] Dog resumes following after bark
- [ ] Target dies mid-approach → dog aborts
- [ ] Build and lint pass

**Dependencies**: All previous phases
**Estimated Time**: 1 hour

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Core Bark Ability | 2 hours |
| Phase 2: Fear State | 1.5 hours |
| Phase 3: HUD & Assets | 30 minutes |
| Phase 4: Testing | 1 hour |
| **Total** | **5 hours** |

## Critical Path

1. Task 1.1 + 1.2 (parallel) → Task 1.3 → Task 1.4 + 1.5 (parallel)
2. Task 2.1 → Task 2.2 → Tasks 2.3-2.8 (parallel)
3. Task 3.1 → Task 3.2

Phase 1 and Phase 2 can be done in parallel (Task 2.1 doesn't depend on Phase 1).

## Risk Areas

- **Bug/Robot frame-based animation**: These enemies don't use Phaser's `sprite.play()`. The onFlee callback approach handles this but needs careful testing.
- **BulletDude StateMachine generic type**: BulletDude uses `StateMachine<void | { hitDirX, hitDirY }>`. Adding fear state needs to be compatible with this type.
- **FearComponent self-removal**: Removing a component from an entity during update needs to be safe. Should defer removal to end of frame or next frame.
