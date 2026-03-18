# Pet System - Task Breakdown

## Phase 0: Prerequisite Refactor — Remove Slide (1 hour)

### Task 0.1: Remove SlideAbilityComponent from Player
**Files**:
- `src/ecs/entities/player/PlayerEntity.ts`
- `src/ecs/entities/player/PlayerIdleState.ts`
- `src/ecs/entities/player/PlayerWalkState.ts`
- `src/ecs/entities/player/PlayerStateHelpers.ts`
- `src/ecs/components/input/InputComponent.ts`

**Subtasks**:
- [ ] Remove `SlideAbilityComponent` import and `entity.add(new SlideAbilityComponent(scene))` from PlayerEntity.ts
- [ ] Remove slide animations (`slide_start_*`, `slide_end_*`) from player animation map
- [ ] Remove `SlideAbilityComponent` from `setUpdateOrder()`
- [ ] In `PlayerStateHelpers.ts`: Remove `handleSlideInput()`, add `handlePetAbilityInput()` that calls `PetAbilityComponent.tryAbility()`
- [ ] In `PlayerIdleState.ts` and `PlayerWalkState.ts`: Replace `handleSlideInput` with `handlePetAbilityInput`
- [ ] In `InputComponent.ts`: Replace `isSlidePressed()` with `isPetActionPressed()` (same H key)
- [ ] In `WalkComponent.ts`: Remove the `SlideAbilityComponent` check in `update()`

**Dependencies**: None
**Estimated Time**: 1 hour

---

## Phase 1: Core Pet Entity & Animations (2.5 hours)

### Task 1.1: Create PetConfig Registry
**File**: `src/ecs/entities/pet/PetConfig.ts`

**Subtasks**:
- [ ] Define `PetConfig` type
- [ ] Define `PetSpritesheetMetadata` type (matches JSON structure)
- [ ] Create `PET_REGISTRY` constant with rock and dog configs
- [ ] Create `DIR_8_TO_4` and `DIR_8_TO_8` direction mapping constants
- [ ] Export `ALL_DIRECTIONS` array (all Direction enum values except None)

**Dependencies**: None
**Estimated Time**: 20 minutes

---

### Task 1.2: Create PetAnimations.ts
**File**: `src/ecs/entities/pet/PetAnimations.ts`

**Subtasks**:
- [ ] Create `rangeToFrameStrings(start, end)` helper — returns `['4', '5', '6', '7']` etc.
- [ ] Create `createPetAnimationMap(metadata, config)` — builds `Map<string, Animation>` with keys `idle_${Direction}` and `walk_${Direction}`
- [ ] Use `DIR_8_TO_4` or `DIR_8_TO_8` based on `config.directions`
- [ ] Idle animations: `'repeat'` style, 0.125 seconds per frame
- [ ] Walk animations: `'repeat'` style, 0.1 seconds per frame

**Dependencies**: Task 1.1
**Estimated Time**: 30 minutes

---

### Task 1.3: Create PetFollowComponent
**File**: `src/ecs/components/pet/PetFollowComponent.ts`

**Subtasks**:
- [ ] Create component with `grid`, `playerEntity`, `config` constructor params
- [ ] Implement `update(delta)`:
  - [ ] Skip if `isHidden`
  - [ ] Calculate distance to player
  - [ ] Set `isTooFar` flag if > 150px
  - [ ] If within 30px: stop, play idle, face player
  - [ ] Otherwise: pathfind toward player at 300 px/sec
- [ ] Implement `recalculatePath()` using `Pathfinder`
- [ ] Implement `moveAlongPath()` with waypoint following
- [ ] Implement `moveToward()` with direction-based walk animation
- [ ] Expose `getIsTooFar()`, `getIsHidden()`, `setHidden()`

**Dependencies**: Task 1.1
**Estimated Time**: 1 hour

---

### Task 1.4: Create PetEntity Factory
**File**: `src/ecs/entities/pet/PetEntity.ts`

**Subtasks**:
- [ ] Create `createPetEntity(scene, grid, playerEntity, config, metadata, startX, startY)` function
- [ ] Add TransformComponent, SpriteComponent (depth = `Depth.player - 1`), AnimationComponent, PetFollowComponent
- [ ] Set update order: Transform → Sprite → PetFollowComponent → Animation
- [ ] Tag entity with `'pet'`

**Dependencies**: Tasks 1.2, 1.3
**Estimated Time**: 20 minutes

---

### Task 1.5: Add Pet Assets to AssetRegistry
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [ ] Add `pets` asset group with rock_spritesheet and dog_spritesheet
- [ ] Include frameWidth/frameHeight for each

**Dependencies**: None
**Estimated Time**: 10 minutes

---

### Task 1.6: Preload Pet Assets
**File**: `src/assets/AssetLoader.ts`

**Subtasks**:
- [ ] Add `pets` to always-loaded asset groups (small enough to be core)

**Dependencies**: Task 1.5
**Estimated Time**: 10 minutes

---

## Phase 2: PetManager & GameScene Integration (1.5 hours)

### Task 2.1: Create PetManager
**File**: `src/systems/PetManager.ts`

**Subtasks**:
- [ ] Singleton with `getInstance()`
- [ ] `refreshCollectedPets()` — reads WorldState flags
- [ ] `getSelectedPetId()` — reads `pet_selected` flag, falls back to first collected
- [ ] `getCollectedPets()` — returns collected pet IDs
- [ ] `initialize(scene, grid, playerEntity)` — refresh + spawn if selected
- [ ] `spawnPet(scene, grid, playerEntity, petId)` — fetch metadata, create entity, add to entityManager
- [ ] `despawnPet()` — destroy active pet entity
- [ ] `selectNext()` / `selectPrevious()` — cycle through collected pets, despawn old, spawn new with tween
- [ ] `hidePet(scene)` — tween pet up + fade out, set hidden
- [ ] `showPet(scene, playerEntity)` — tween pet down from above, clear hidden
- [ ] `isActive()` — has pet and not swapping/hidden
- [ ] Cache metadata JSON after first fetch

**Dependencies**: Tasks 1.4, 1.5
**Estimated Time**: 1 hour

---

### Task 2.2: Integrate PetManager into GameScene
**File**: `src/scenes/GameScene.ts`

**Subtasks**:
- [ ] Import PetManager
- [ ] After player entity creation in `initializeScene()`, call `PetManager.getInstance().initialize(this, this.grid, playerEntity)`
- [ ] Pet entity is added to entityManager by PetManager, so it updates automatically

**Dependencies**: Task 2.1
**Estimated Time**: 15 minutes

---

### Task 2.3: Add PetAbilityComponent to Player
**Files**:
- `src/ecs/components/pet/PetAbilityComponent.ts`
- `src/ecs/entities/player/PlayerEntity.ts`

**Subtasks**:
- [ ] Create `PetAbilityComponent` with cooldown tracking
- [ ] `tryAbility()` — check PetManager.isActive(), check not too far/hidden, apply cooldown, console.log
- [ ] `canUseAbility()`, `getCooldownRatio()`
- [ ] Add to PlayerEntity factory in place of SlideAbilityComponent
- [ ] Add to update order where SlideAbilityComponent was

**Dependencies**: Task 0.1, Task 2.1
**Estimated Time**: 30 minutes

---

## Phase 3: HUD — Pet Carousel & Action Button (2 hours)

### Task 3.1: Create PetCarouselComponent
**File**: `src/ecs/components/ui/PetCarouselComponent.ts`

**Subtasks**:
- [x] Create component that manages pet icon sprites in a circular layout
- [x] `init()` — create icon sprites for each collected pet, position in circle
- [x] Only the selected pet's icon is visible (alpha=1, on screen); others alpha=0
- [x] Create left/right arrow sprites at top of screen
- [x] Arrow touch handlers call `PetManager.selectNext()` / `selectPrevious()`
- [x] `update()` — sync icon visibility with PetManager state
- [x] Tween icons when cycling (200ms rotation animation)
- [x] `onDestroy()` — clean up sprites

**Dependencies**: Task 2.1
**Estimated Time**: 1 hour
**Actual Time**: 25min

---

### Task 3.2: Create PetActionButtonComponent
**File**: `src/ecs/components/ui/PetActionButtonComponent.ts`

**Subtasks**:
- [ ] Create component showing pet ability icon
- [ ] Position near attack button area (or where slide icon was)
- [ ] Show icon matching selected pet
- [ ] Cooldown overlay: reduce alpha during cooldown
- [ ] Fade out when pet too far (>150px) or in water or no pet
- [ ] Touch triggers `PetAbilityComponent.tryAbility()` on player entity
- [ ] `setVisible()` for HUD toggle support
- [ ] `onDestroy()` — clean up sprites

**Dependencies**: Task 2.3
**Estimated Time**: 45 minutes

---

### Task 3.3: Add Pet HUD Components to JoystickEntity
**File**: `src/ecs/entities/hud/JoystickEntity.ts`

**Subtasks**:
- [x] Import and add `PetCarouselComponent`
- [x] Import and add `PetActionButtonComponent`
- [x] Add both to update order
- [x] Call `init()` on both

**Dependencies**: Tasks 3.1, 3.2
**Estimated Time**: 15 minutes
**Actual Time**: 5min

---

### Task 3.4: Update HudScene for Pet Visibility
**File**: `src/scenes/HudScene.ts`

**Subtasks**:
- [x] In `setVisible()`, also toggle PetCarouselComponent and PetActionButtonComponent visibility

**Dependencies**: Task 3.3
**Estimated Time**: 10 minutes
**Actual Time**: 5min

---

## Phase 4: Water Interaction (30 minutes)

### Task 4.1: Hide Pet When Player Enters Water
**Files**:
- `src/ecs/entities/player/PlayerWalkState.ts`
- `src/ecs/entities/player/PlayerIdleState.ts`

**Subtasks**:
- [ ] Track `wasInWater` state in both player states
- [ ] When player enters water (`WaterEffectComponent.getIsInWater()` transitions to true): call `PetManager.getInstance().hidePet(scene)`
- [ ] When player exits water: call `PetManager.getInstance().showPet(scene, entity)`
- [ ] Alternatively, handle this in PetManager.update() by checking player's water state each frame — cleaner separation

**Dependencies**: Task 2.1
**Estimated Time**: 30 minutes

---

## Phase 5: Testing & Polish (1.5 hours)

### Task 5.1: Manual Testing
**Subtasks**:
- [ ] Set `pet_rock_collected: "true"` and `pet_dog_collected: "true"` in WorldState
- [ ] Verify pet spawns and follows player
- [ ] Verify pet stops within 30px and plays idle
- [ ] Verify pet plays walk animation while following
- [ ] Verify 4-direction mapping for rock
- [ ] Verify 8-direction mapping for dog
- [ ] Verify pet icon fades when >150px away
- [ ] Verify pet hides when player enters water
- [ ] Verify pet reappears when player exits water
- [ ] Verify carousel cycling works
- [ ] Verify H key triggers pet ability with cooldown
- [ ] Verify pet persists across level transitions
- [ ] Verify build and lint pass

**Dependencies**: All previous phases
**Estimated Time**: 1.5 hours

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 0: Remove Slide | 1 hour |
| Phase 1: Core Pet Entity | 2.5 hours |
| Phase 2: PetManager & Integration | 1.5 hours |
| Phase 3: HUD Components | 2 hours |
| Phase 4: Water Interaction | 30 minutes |
| Phase 5: Testing | 1.5 hours |
| **Total** | **9 hours** |

## Critical Path

1. Phase 0 (remove slide) → Phase 2.3 (add PetAbilityComponent)
2. Phase 1 (core entity) → Phase 2 (PetManager) → Phase 3 (HUD)
3. Phase 4 (water) depends on Phase 2

Phase 0 and Phase 1 can be done in parallel.

## Risk Areas

- **Metadata JSON loading**: Async fetch during entity creation. Mitigate by caching and loading during asset preload phase.
- **Direction mapping for 4-dir pets**: Diagonal directions mapped to nearest cardinal. May look slightly off — test and adjust mapping if needed.
- **Carousel layout**: Positioning icons off-screen in a circle requires careful math. Start simple (2 pets) and extend.
- **Water detection timing**: Need to detect water entry/exit transitions, not just current state. Track previous frame's water state.
