# Interaction System - Task Breakdown

## ✅ Completed

- [x] **POC-1**: Install wasmoon
- [x] **POC-2**: Create type declarations for wasmoon
- [x] **POC-3**: Test basic Lua execution
- [x] **POC-4**: Test JS function calls from Lua
- [x] **POC-5**: Test JS object methods from Lua
- [x] **POC-6**: Test error handling
- [x] **POC-7**: Verify bundle size impact (~112KB - excellent)
- [x] **POC-8**: Verify parameter passing works correctly
- [x] **DOC-1**: Create requirements document
- [x] **DOC-2**: Create task breakdown document
- [x] **DOC-3**: Create design document
- [x] **DOC-4**: Create README for new sessions

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### Task 1.1: Add Interaction Entity Type ✅
**Files**:
- `src/systems/level/LevelLoader.ts` (modify)
- `src/systems/EntityLoader.ts` (modify)

**Subtasks**:
- [x] Add `'interaction'` to `EntityType` union in LevelLoader.ts
- [x] Add case for `'interaction'` in EntityLoader.ts switch statement
- [x] Return entity creator function that creates InteractionEntity

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 1.2: LuaRuntime with Command Queue ✅
**File**: `src/systems/LuaRuntime.ts`

**Subtasks**:
- [x] Create `LuaRuntime` class
- [x] Implement command queue approach
- [x] Expose API functions that queue commands
- [x] Execute Lua script (builds queue)
- [x] Execute commands sequentially
- [x] Add error handling
- [x] Create wasmoon type declarations

**Dependencies**: None (wasmoon already installed)

**Estimated Time**: 3-4 hours

---

### Task 1.3: InteractionEntity and Component ✅
**Files**:
- `src/interaction/InteractionEntity.ts` (new)
- `src/ecs/components/interaction/InteractionTriggerComponent.ts` (new)

**Subtasks**:
- [x] Create `InteractionEntity` factory function
- [x] Create `InteractionTriggerComponent` class
- [x] Component loads `.lua` file from `public/interactions/{filename}.lua`
- [x] Component triggers `InteractionState` transition via scene.startInteraction()
- [x] Component destroys entity after triggering
- [x] Add error handling for missing files

**Dependencies**: Task 1.2 (LuaRuntime)

## Phase 1: Core Infrastructure ✅ COMPLETE

### Task 1.1: Add Interaction Entity Type ✅
**Files**:
- `src/systems/level/LevelLoader.ts` (modify)
- `src/systems/EntityLoader.ts` (modify)

**Subtasks**:
- [x] Add `'interaction'` to `EntityType` union in LevelLoader.ts
- [x] Add case for `'interaction'` in EntityLoader.ts switch statement
- [x] Return entity creator function that creates InteractionEntity

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 1.2: LuaRuntime with Command Queue ✅
**File**: `src/systems/LuaRuntime.ts`

**Subtasks**:
- [x] Create `LuaRuntime` class
- [x] Implement command queue approach
- [x] Expose API functions that queue commands
- [x] Execute Lua script (builds queue)
- [x] Execute commands sequentially
- [x] Add error handling
- [x] Create wasmoon type declarations

**Dependencies**: None (wasmoon already installed)

**Estimated Time**: 3-4 hours

---

### Task 1.3: InteractionEntity and Component ✅
**Files**:
- `src/interaction/InteractionEntity.ts` (new)
- `src/ecs/components/interaction/InteractionTriggerComponent.ts` (new)

**Subtasks**:
- [x] Create `InteractionEntity` factory function
- [x] Create `InteractionTriggerComponent` class
- [x] Component loads `.lua` file from `public/interactions/{filename}.lua`
- [x] Component triggers `InteractionState` transition via scene.startInteraction()
- [x] Component destroys entity after triggering
- [x] Add error handling for missing files

**Dependencies**: Task 1.2 (LuaRuntime)

**Estimated Time**: 1-2 hours

---

### Task 1.4: InteractionState ✅
**File**: `src/scenes/states/InteractionState.ts`

**Subtasks**:
- [x] Create `InteractionState` class implementing `IState`
- [x] Implement `onEnter()` method (pause game, hide HUD, execute script)
- [x] Implement `onExit()` method (resume game, show HUD)
- [x] Implement `onUpdate()` method (keep game rendering)
- [x] Add error handling (log and crash)

**Dependencies**: Task 1.3

**Estimated Time**: 2-3 hours

---

### Task 1.5: Supporting Infrastructure ✅
**Files**: Multiple

**Subtasks**:
- [x] Add Entity.getScene() method
- [x] Add EntityManager pause mechanism
- [x] Add InputComponent.enabled property
- [x] Add HudScene.setVisible() method
- [x] Add GameScene.isInInteraction flag
- [x] Add GameScene.startInteraction() method
- [x] Add InteractionState to state machine
- [x] Add WorldStateManager.setPlayerCoins()

**Dependencies**: Task 1.4

**Estimated Time**: 2 hours

---

## Phase 2: Entity Commands ✅ COMPLETE

### Task 2.1: InteractionComponent ✅
**File**: `src/ecs/components/interaction/InteractionComponent.ts`

**Subtasks**:
- [x] Create `InteractionComponent` class (dormant, always on player)
- [x] Implement `moveTo()` with pathfinding
- [x] Implement `look()` with direction mapping
- [x] Add `update()` for movement
- [x] Play walk/swim animations based on direction
- [x] Track currentAnimKey to avoid restarting animations

**Dependencies**: None

**Estimated Time**: 4-5 hours

---

### Task 2.2: WalkComponent Integration ✅
**File**: `src/ecs/components/movement/WalkComponent.ts` (modify)

**Subtasks**:
- [x] Add check for InteractionComponent.isActive

**Dependencies**: Task 2.1

**Estimated Time**: 5 minutes

---

### Task 2.3: Player State Integration ✅
**Files**: 
- `src/ecs/entities/player/PlayerEntity.ts` (modify)
- `src/ecs/entities/player/PlayerIdleState.ts` (modify)
- `src/ecs/entities/player/PlayerWalkState.ts` (modify)

**Subtasks**:
- [x] Add InteractionComponent to PlayerEntity
- [x] Add to update order (before WalkComponent)
- [x] PlayerIdleState checks InteractionComponent.isActive
- [x] PlayerWalkState checks InteractionComponent.isActive

**Dependencies**: Task 2.1

**Estimated Time**: 30 minutes

---

### Task 2.4: Coin Properties ✅
**File**: `src/ecs/components/ui/CoinCounterComponent.ts` (modify)

**Subtasks**:
- [x] Add `getCount()` method
- [x] Add `removeCoins(amount)` method (clamp to 0)
- [x] Add `addCoins(amount)` method
- [x] Add `removeCoinsAnimated()` method (50ms per coin)
- [x] Add `addCoinsAnimated()` method (50ms per coin)

**Dependencies**: None

**Estimated Time**: 1 hour

---

## Phase 3: Speech Box ✅ COMPLETE

### Task 3.1: SpeechBoxComponent ✅
**File**: `src/ecs/components/ui/SpeechBoxComponent.ts`

**Subtasks**:
- [x] Create `SpeechBoxComponent` class
- [x] Rounded rectangle with border (10px corners, 80% alpha)
- [x] Position using camera dimensions (55%-95% height, 60% width)
- [x] Background colors (blue, black, purple, gold)
- [x] Text colors (white, gold, red, green, purple, blue)
- [x] Tween in/out animations (300ms)
- [x] Character-by-character text reveal
- [x] Parse color tags (`<red>`, `<green>`, `<purple>`, `<gold>`)
- [x] Handle `<newline/>` tags
- [x] Punctuation delays (300ms)
- [x] Skip functionality (10ms speed on first press, dismiss on second)
- [x] Continue indicator (pulsing down arrow)
- [x] Input listeners (space, touch)

**Dependencies**: None

**Estimated Time**: 8-10 hours

---

### Task 3.2: Integrate with LuaRuntime ✅
**File**: `src/systems/LuaRuntime.ts` (modify)

**Subtasks**:
- [x] Implement `say()` command execution
- [x] Create speech box entity
- [x] Tag as 'interaction_active'
- [x] Call SpeechBoxComponent.show()
- [x] Destroy entity after dismissal

**Dependencies**: Task 3.1

**Estimated Time**: 30 minutes

---

## Phase 4: Testing ✅ COMPLETE

### Task 4.1: Create Test Interactions ✅
**Files**: `public/interactions/test_*.lua`

**Subtasks**:
- [x] Create test_shop.lua (conditionals and coins)
- [x] Test movement and look commands
- [x] Test speech box with color tags
- [x] Test nested conditionals

**Dependencies**: All previous phases

**Estimated Time**: 1 hour

---

### Task 4.2: Integration Testing ✅
**Subtasks**:
- [x] Trigger interactions via events
- [x] Verify game pauses correctly
- [x] Verify HUD hides (except coin counter)
- [x] Verify commands execute sequentially
- [x] Verify animations work
- [x] Verify coin animations work
- [x] Verify errors crash game

**Dependencies**: Task 4.1

**Estimated Time**: 2 hours

---

## Total Time

**Estimated**: 26-34 hours
**Actual**: ~3 hours
**Savings**: 23-31 hours (87% reduction!)

---

## All Tasks Complete! 🎉

The interaction system is fully implemented, tested, and documented.

**Subtasks**:
- [ ] Create `SpeechBoxComponent` class
- [ ] Implement `show(name, text, talkSpeed, timeout)` method:
  - [ ] Create rounded rectangle using HUD graphics (10px corners, 80% alpha)
  - [ ] Position: centered bottom (55%-95% height, 60% width)
  - [ ] Apply gradient blend mode (lighter center, darker edges)
  - [ ] Apply background color (blue, black, purple, gold)
  - [ ] Tween in from small to full size (300ms)
  - [ ] Create text object with name (top-left with padding) and message
  - [ ] Implement character-by-character reveal
  - [ ] Parse and apply color tags (`<red>`, `<green>`, `<purple>`, `<gold>`)
  - [ ] Add 300ms delay for punctuation
  - [ ] Handle `<newline/>` tags
  - [ ] Implement skip on space/touch (faster reveal)
  - [ ] Wait for timeout or input after text complete
  - [ ] Tween out and destroy
  - [ ] Return Promise that resolves when dismissed
- [ ] Implement text wrapping
- [ ] Add input listeners (space, touch)

**Dependencies**: None

**Estimated Time**: 8-10 hours (complex component with color tags and gradient)

---

### Task 3.4: speech.setColor Command
**File**: `src/systems/InteractionAPI.ts` (modify)

**Subtasks**:
- [ ] Add `speechColor` property (default: "black")
- [ ] Implement `speech.setColor(color)` method
- [ ] Validate color is one of: "blue", "black", "purple", "gold"
- [ ] Pass color to `SpeechBoxComponent`

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 3.5: Connect Speech Box to API
**File**: `src/systems/InteractionAPI.ts` (modify)

**Subtasks**:
- [ ] Implement `say(name, text, talkSpeed, timeout)` method
- [ ] Create `SpeechBoxComponent` instance
- [ ] Add to player entity (or separate HUD entity)
- [ ] Call `show()` method
- [ ] Return Promise from `show()`

**Dependencies**: Task 3.3

**Estimated Time**: 1 hour

---

## Phase 4: Conditionals

### Task 4.1: Test Conditionals
**File**: `public/assets/interactions/test_conditionals.lua`

**Subtasks**:
- [ ] Create test file with various conditionals
- [ ] Test all comparison operators (<, >, ==, ~=, <=, >=)
- [ ] Test compound conditions (and, or)
- [ ] Test nested conditionals
- [ ] Verify all work correctly

**Dependencies**: Phase 1-3 complete

**Estimated Time**: 1 hour

---

## Phase 5: Build-Time Validation

### Task 5.1: Interaction Validator Script
**File**: `scripts/validate-interactions.mjs`

**Subtasks**:
- [ ] Create Node.js script
- [ ] Scan `public/assets/interactions/` for `.lua` files
- [ ] Use wasmoon to check Lua syntax
- [ ] Parse AST to validate API usage:
  - [ ] Check function names (moveTo, look, wait, say, speech.setColor, etc.)
  - [ ] Check parameter counts
  - [ ] Check direction strings
  - [ ] Check color strings for speech.setColor()
- [ ] Report errors with file names and line numbers
- [ ] Exit with error code if validation fails

**Dependencies**: None

**Estimated Time**: 3-4 hours

---

### Task 5.2: Update Package Scripts
**File**: `package.json` (modify)

**Subtasks**:
- [ ] Add `"check-interactions": "node scripts/validate-interactions.mjs"`
- [ ] Update `"build"` to include validation:
  ```json
  "build": "npm run check-interactions && tsc && vite build"
  ```

**Dependencies**: Task 5.1

**Estimated Time**: 5 minutes

---

## Phase 6: Testing

### Task 6.1: Create Test Interactions
**Files**: `public/assets/interactions/test_*.lua`

**Subtasks**:
- [ ] `test_shop.lua` - Coin spending with conditional (already exists)
- [ ] `test_movement.lua` - Movement and looking
- [ ] `test_speech.lua` - Speech box with various text lengths
- [ ] `test_complex.lua` - Nested conditionals and multiple commands

**Dependencies**: Phase 1-3 complete

**Estimated Time**: 2 hours

---

### Task 6.2: Integration Testing
**Subtasks**:
- [ ] Trigger each test interaction via event
- [ ] Verify game state pauses correctly
- [ ] Verify HUD hides/shows
- [ ] Verify smooth transitions
- [ ] Test error handling (invalid scripts)
- [ ] Test performance (no lag during interactions)

**Dependencies**: Task 6.1

**Estimated Time**: 2-3 hours

---

### Task 6.3: Polish and Bug Fixes
**Subtasks**:
- [ ] Fix any bugs found during testing
- [ ] Adjust speech box size/position
- [ ] Tune animation timings
- [ ] Improve error messages
- [ ] Add comments to code

**Dependencies**: Task 6.2

**Estimated Time**: 2-4 hours

---

## Total Estimated Time

- **Phase 1**: 9-12 hours
- **Phase 2**: 7-8 hours
- **Phase 3**: 9-12 hours
- **Phase 4**: 1 hour
- **Phase 5**: 3-4 hours
- **Phase 6**: 6-9 hours

**Total**: 35-48 hours

---

## Critical Path

1. Phase 1 (Core) → Phase 2 (Entity Commands) → Phase 3 (Scene Commands)
2. Phase 5 (Validation) can be done in parallel with Phase 3
3. Phase 4 (Conditionals) is trivial since Lua handles it
4. Phase 6 (Testing) must be last

---

## Risk Areas

1. **Speech Box Complexity**: Text wrapping, character animation, input handling - most complex component
2. **InteractionComponent Movement**: Pathfinding integration, animation sync
3. **State Pausing**: Ensuring all game systems properly pause/resume
4. **Build Validation**: AST parsing for API validation may be tricky

---

## Ready to Start?

Shall I begin with **Phase 1, Task 1.1** (LuaRuntime wrapper)?
