# NPC System - Task Breakdown

## Phase 1: Core NPC Entity

### Task 1.1: Add NPC Entity Type ✅
**Files**:
- `src/systems/level/LevelLoader.ts` (modify)
- `src/systems/EntityLoader.ts` (modify)

**Subtasks**:
- [x] Add `'npc'` to `EntityType` union in LevelLoader.ts
- [x] Add case for `'npc'` in EntityLoader.ts switch statement
- [x] Return entity creator function that creates NPCEntity

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 1.2: Create NPCAnimations.ts
**File**: `src/ecs/entities/npc/NPCAnimations.ts`

**Subtasks**:
- [x] Create `createNPCAnimations(scene, spritesheet)` function
- [x] Detect frame count from texture
- [x] If 1 frame: Create static animation (frameRate: 1, repeat: 0)
- [x] If >1 frames: Create 8 directional animations using DIR_TO_INDEX
- [x] Create `getNPCAnimKey(spritesheet, direction)` helper
- [x] Make idempotent (check if animation exists)

**Dependencies**: None

**Estimated Time**: 30 minutes
**Actual Time**: 5 minutes

---

### Task 1.3: Create NPCIdleComponent
**File**: `src/ecs/components/npc/NPCIdleComponent.ts`

**Subtasks**:
- [x] Create component class with direction and spritesheet props
- [x] Implement update() with hasInitialized flag
- [x] Call createNPCAnimations() on first update
- [x] Add AnimationComponent if needed
- [x] Play initial animation using AnimationSystem
- [x] Implement setDirection(direction) method
- [x] Update animation when direction changes

**Dependencies**: Task 1.2

**Estimated Time**: 30 minutes
**Actual Time**: 5 minutes

---

### Task 1.4: Create NPCEntity Factory
**File**: `src/ecs/entities/npc/NPCEntity.ts`

**Subtasks**:
- [x] Create `createNPCEntity()` function
- [x] Add TransformComponent (use grid.cellSize)
- [x] Add SpriteComponent (spritesheet from assets)
- [x] Add NPCIdleComponent (direction, assets)
- [x] Add NPCInteractionComponent (interactions, col, row)
- [x] Set update order: Transform → Sprite → Idle → Interaction
- [x] Export types: NPCInteraction, FlagCondition

**Dependencies**: Task 1.3

**Estimated Time**: 30 minutes
**Actual Time**: 10 minutes

---

### Task 1.5: Add NPC Assets to AssetRegistry
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [x] Add npc1 to ASSET_GROUPS
- [x] Define spritesheet, frameWidth, frameHeight
- [x] Add any other test NPCs

**Dependencies**: None

**Estimated Time**: 10 minutes
**Actual Time**: 2 minutes

---

### Task 1.6: Update AssetLoader for NPCs
**File**: `src/assets/AssetLoader.ts`

**Subtasks**:
- [x] Update getRequiredAssets() to detect NPC entities
- [x] Extract assets from entity.data.assets
- [x] Add to required assets list

**Dependencies**: Task 1.5

**Estimated Time**: 15 minutes
**Actual Time**: 5 minutes

---

## Phase 2: Interaction System Integration

### Task 2.1: Create NPCInteractionComponent
**File**: `src/ecs/components/npc/NPCInteractionComponent.ts`

**Subtasks**:
- [x] Create component class with interactions, defaultCol, defaultRow
- [x] Implement getActiveInteraction():
  - [ ] Iterate interactions in priority order
  - [ ] Check whenFlagSet conditions using WorldStateManager
  - [ ] Return first valid interaction
  - [ ] Use position override if specified
  - [ ] Warn if multiple valid (once per NPC)
  - [ ] Warn if no valid (once per NPC)
- [x] Implement isPlayerInRange(playerEntity, grid):
  - [ ] Get active interaction position
  - [ ] Calculate NPC center position using grid.cellSize
  - [ ] Get player collision box center
  - [ ] Calculate distance
  - [ ] Return true if ≤ 100 pixels
- [x] Add warning flags to prevent duplicate logs

**Dependencies**: Task 1.4

**Estimated Time**: 1.5 hours
**Actual Time**: 0 minutes (already implemented)

---

### Task 2.2: Create NPCManager with Caching ✅
**File**: `src/systems/NPCManager.ts`

**Subtasks**:
- [x] Create singleton class with scene reference
- [x] Add cache fields: cachedClosestNPC, lastPlayerCol, lastPlayerRow
- [x] Implement getInstance(scene?)
- [x] Implement getClosestInteractableNPC(playerEntity, grid):
  - [x] Get player grid position
  - [x] Return cached result if player in same cell
  - [x] Update cache tracking when player moves
  - [x] Query all NPC entities
  - [x] Filter to those with valid interactions
  - [x] Filter to those in range
  - [x] Return closest by distance
  - [x] Cache result
  - [x] Return null if none

**Dependencies**: Task 2.1

**Estimated Time**: 45 minutes

---

### Task 2.3: Initialize NPCManager in GameScene ✅
**File**: `src/scenes/GameScene.ts`

**Subtasks**:
- [x] Import NPCManager
- [x] Call NPCManager.getInstance(this) in create()

**Dependencies**: Task 2.2

**Estimated Time**: 5 minutes

---

## Phase 3: UI Integration

### Task 3.1: Create Lips Icon Asset
**File**: `public/assets/ui/lips_icon.png`

**Subtasks**:
- [x] Create or obtain lips icon image
- [x] Size to match punch_icon.png
- [x] Save to public/assets/ui/

**Dependencies**: None

**Estimated Time**: 15 minutes
**Actual Time**: 5 minutes

---

### Task 3.2: Add Lips Icon to AssetRegistry
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [x] Add lips_icon to UI_ASSETS

**Dependencies**: Task 3.1

**Estimated Time**: 5 minutes
**Actual Time**: 2 minutes

---

### Task 3.3: Update AttackButtonComponent
**File**: `src/ecs/components/ui/AttackButtonComponent.ts`

**Subtasks**:
- [x] Import NPCManager
- [x] Add currentIcon property ('punch' | 'lips')
- [x] In update():
  - [ ] Get player entity
  - [ ] Get grid from scene
  - [ ] Query NPCManager.getClosestInteractableNPC(player, grid)
  - [ ] Determine newIcon based on result
  - [ ] If changed, update texture and currentIcon

**Dependencies**: Task 2.2, Task 3.2

**Estimated Time**: 30 minutes
**Actual Time**: 10 minutes

---

### Task 3.4: Update InputComponent
**File**: `src/ecs/components/input/InputComponent.ts`

**Subtasks**:
- [x] Import NPCManager, EventManager
- [x] In handleAttack():
  - [ ] Get grid from scene
  - [ ] Query NPCManager.getClosestInteractableNPC(entity, grid)
  - [ ] If NPC found:
    - [ ] Get activeInteraction
    - [ ] Raise event with interaction.name
  - [ ] Else:
    - [ ] Existing punch logic

**Dependencies**: Task 2.2

**Estimated Time**: 20 minutes
**Actual Time**: 15 minutes

---

## Phase 4: Interaction Behavior

### Task 4.1: Add NPC Look Command to LuaRuntime
**File**: `src/systems/LuaRuntime.ts`

**Subtasks**:
- [x] Add 'npcLook' to Command type union
- [x] Add npc object to Lua global with look(direction) method
- [x] Queue 'npcLook' command with npcId and direction
- [x] In executeCommand(), handle 'npcLook' type:
  - [ ] Find NPC entity by ID from state data
  - [ ] Get NPCIdleComponent
  - [ ] Call setDirection(direction)

**Dependencies**: Task 1.3

**Estimated Time**: 30 minutes
**Actual Time**: 15 minutes

---

### Task 4.2: Pass NPC ID to InteractionState
**Files**:
- `src/ecs/components/interaction/InteractionTriggerComponent.ts` (modify)
- `src/scenes/GameScene.ts` (modify)
- `src/scenes/states/InteractionState.ts` (modify)

**Subtasks**:
- [x] InteractionTriggerComponent: Pass entity.id to scene.startInteraction()
- [x] GameScene.startInteraction(): Accept optional npcId parameter
- [x] InteractionState: Add npcId to state data type
- [x] Pass npcId to LuaRuntime

**Dependencies**: Task 4.1

**Estimated Time**: 20 minutes
**Actual Time**: 15 minutes

---

### Task 4.3: Expose dirFromDelta to Lua
**File**: `src/systems/LuaRuntime.ts` (modify)

**Subtasks**:
- [x] Import dirFromDelta from Direction constants
- [x] Expose calculateDirection(fromCol, fromRow, toCol, toRow) to Lua
- [x] Calculate dx, dy from col/row differences
- [x] Call dirFromDelta(dx, dy)
- [x] Return Direction enum value

**Dependencies**: None

**Estimated Time**: 15 minutes
**Actual Time**: 5 minutes

---

## Phase 5: Editor Integration

### Task 5.1: Create NPCEditorState
**File**: `src/editor/NPCEditorState.ts`

**Subtasks**:
- [x] Create state class implementing IState
- [x] Add selectedNPC and currentDirection fields
- [x] Implement onEnter() - show NPC palette
- [x] Implement placeNPC(col, row) - create NPC entity
- [x] Implement cycleDirection() - rotate through 8 directions
- [x] Implement deleteNPC() - remove selected NPC
- [x] Add visual direction indicator
- [x] Handle D key for direction cycling
- [x] Handle Delete key for deletion

**Dependencies**: Task 1.4

**Estimated Time**: 2 hours
**Actual Time**: 20min

---

### Task 5.2: Create Interaction Configuration UI
**File**: `src/editor/InteractionConfigDialog.ts`

**Subtasks**:
- [x] Create dialog UI component
- [x] Add/remove interaction buttons
- [x] Interaction name input field
- [x] Flag condition configuration:
  - [ ] Flag name input
  - [ ] Condition dropdown (eq, neq, gt, lt, gte, lte)
  - [ ] Value input
- [x] Position override inputs (col, row)
- [x] Reorder interactions (priority)
- [x] Save to NPCInteractionComponent
- [x] Cancel/confirm buttons

**Dependencies**: Task 5.1

**Estimated Time**: 2.5 hours
**Actual Time**: 15min

---

### Task 5.3: Add NPC Button to EditorScene
**File**: `src/editor/EditorScene.ts`

**Subtasks**:
- [x] Add NPC mode button to editor UI
- [x] Position with other mode buttons
- [x] Transition to NPCEditorState on click
- [x] Add I key handler for interaction config (when NPC selected)

**Dependencies**: Task 5.1

**Estimated Time**: 30 minutes
**Actual Time**: 5min

---

### Task 5.4: Update Level Export for NPCs
**File**: `src/editor/EditorScene.ts` (modify extractEntities)

**Subtasks**:
- [x] Extract NPC entities from entityManager
- [x] Get NPCIdleComponent for direction
- [x] Get NPCInteractionComponent for interactions
- [x] Format as level JSON
- [x] Include all interaction data (whenFlagSet, position)

**Dependencies**: Task 5.2

**Estimated Time**: 45 minutes
**Actual Time**: 10min

---

## Phase 6: Testing and Polish

### Task 6.1: Create Test NPC
**Files**:
- `public/assets/npc/test_npc/test_npc_spritesheet.png`
- Level JSON with test NPC

**Subtasks**:
- [ ] Create or use existing sprite sheet
- [ ] Add to AssetRegistry
- [ ] Add NPC to test level
- [ ] Define interactions with flag conditions

**Dependencies**: All previous phases

**Estimated Time**: 30 minutes

---

### Task 6.2: Create Test Interaction Scripts
**Files**: `public/interactions/test_npc_*.lua`

**Subtasks**:
- [ ] Create default interaction script
- [ ] Create conditional interaction script
- [ ] Test player.look() and npc.look()
- [ ] Test calculateDirection() helper
- [ ] Test position overrides

**Dependencies**: Task 6.1

**Estimated Time**: 30 minutes

---

### Task 6.3: Manual Testing
**Subtasks**:
- [ ] Test NPC spawning at correct position
- [ ] Test idle animation (static and looping)
- [ ] Test direction changes with setDirection()
- [ ] Test lips icon appears in range
- [ ] Test lips icon disappears out of range
- [ ] Test caching (only recalculates on cell change)
- [ ] Test interaction triggers on space
- [ ] Test interaction triggers on attack button
- [ ] Test punch works when no NPC in range
- [ ] Test multiple NPCs (closest selected)
- [ ] Test flag conditions
- [ ] Test position overrides
- [ ] Test facing each other
- [ ] Test no valid interactions warning
- [ ] Test multiple valid interactions warning
- [ ] Test editor placement
- [ ] Test editor direction cycling
- [ ] Test editor interaction configuration

**Dependencies**: Task 6.2

**Estimated Time**: 1.5 hours

---

### Task 6.4: Fix Bugs and Polish
**Subtasks**:
- [ ] Fix any issues found in testing
- [ ] Adjust range if needed
- [ ] Adjust icon switching behavior
- [ ] Adjust caching behavior if needed
- [ ] Clean up console logs
- [ ] Update documentation

**Dependencies**: Task 6.3

**Estimated Time**: 1 hour

---

## Total Estimated Time

**Phase 1**: 2.5 hours
**Phase 2**: 2.5 hours
**Phase 3**: 1.25 hours
**Phase 4**: 1.25 hours
**Phase 5**: 5.75 hours
**Phase 6**: 3.5 hours

**Total**: 16.75 hours

## Critical Path

1. Phase 1 must complete before Phase 2
2. Phase 2 must complete before Phase 3
3. Phase 4 can be done in parallel with Phase 3
4. Phase 5 requires Phases 1-4 complete
5. Phase 6 requires all previous phases

## Risk Areas

- **Animation system**: Ensure NPCAnimations.ts follows skeleton/thrower pattern exactly
- **Caching**: Verify cache invalidation works correctly
- **Range calculation**: May need adjustment based on feel
- **Icon switching**: Ensure no flicker or lag
- **Flag conditions**: Complex logic, test thoroughly
- **Position overrides**: Ensure range calculation uses correct position
- **Editor UI**: Interaction configuration dialog is complex
- **Direction cycling**: Ensure all 8 directions work correctly
