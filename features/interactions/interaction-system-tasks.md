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

## Phase 1: Core Infrastructure

### Task 1.1: Add Interaction Entity Type
**Files**:
- `src/systems/level/LevelLoader.ts` (modify)
- `src/systems/EntityLoader.ts` (modify)

**Subtasks**:
- [ ] Add `'interaction'` to `EntityType` union in LevelLoader.ts
- [ ] Add case for `'interaction'` in EntityLoader.ts switch statement
- [ ] Return entity creator function that creates InteractionEntity

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 1.2: LuaRuntime Wrapper
**File**: `src/systems/LuaRuntime.ts`

**Subtasks**:
- [ ] Create `LuaRuntime` class
- [ ] Implement `loadScript(content: string)` method
- [ ] Implement `exposeAPI(api: object)` method
- [ ] Implement `execute()` method (returns Promise)
- [ ] Implement `cleanup()` method
- [ ] Add error handling (pcall wrapper)
- [ ] Add unit tests (if time permits)

**Dependencies**: None (wasmoon already installed)

**Estimated Time**: 1-2 hours

---

### Task 1.2: InteractionAPI
**File**: `src/systems/InteractionAPI.ts`

**Subtasks**:
- [ ] Create `InteractionAPI` class
- [ ] Implement stub methods for all commands:
  - [ ] `moveTo(col, row, speed)` - returns Promise
  - [ ] `look(direction)` - returns Promise
  - [ ] `wait(timeMs)` - returns Promise
  - [ ] `say(name, text, talkSpeed, timeout)` - returns Promise
  - [ ] `setSpeechPosition(x, y)` - synchronous
- [ ] Create player object structure:
  ```typescript
  {
    moveTo: (col, row, speed) => Promise<void>,
    look: (direction) => Promise<void>,
    coins: {
      get: () => number,
      spend: (amount) => void,
      obtain: (amount) => void
    }
  }
  ```
- [ ] Add command queue/blocking mechanism

**Dependencies**: None

**Estimated Time**: 2-3 hours

---

### Task 1.3: InteractionEntity and Component
**Files**:
- `src/interaction/InteractionEntity.ts` (new)
- `src/ecs/components/interaction/InteractionTriggerComponent.ts` (new)

**Subtasks**:
- [ ] Create `InteractionEntity` factory function
- [ ] Create `InteractionTriggerComponent` class
- [ ] Component loads `.lua` file from `public/assets/interactions/{filename}.lua`
- [ ] Component triggers `InteractionState` transition
- [ ] Component destroys entity after triggering
- [ ] Add error handling for missing files

**Dependencies**: Task 1.2 (LuaRuntime)

**Estimated Time**: 1-2 hours

---

### Task 1.4: InteractionState
**File**: `src/scenes/states/InteractionState.ts`

**Subtasks**:
- [ ] Create `InteractionState` class implementing `IState`
- [ ] Implement `onEnter(interactionName)` method:
  - [ ] Disable player `InputComponent`
  - [ ] Hide HUD (call HudScene methods)
  - [ ] Pause health regeneration
  - [ ] Pause enemy state machines
  - [ ] Pause projectile updates
  - [ ] Pause timers (ammo, cooldowns)
  - [ ] Load and execute Lua script
- [ ] Implement `onExit()` method:
  - [ ] Re-enable player input
  - [ ] Show HUD
  - [ ] Resume health regeneration
  - [ ] Resume enemies
  - [ ] Resume projectiles
  - [ ] Resume timers
- [ ] Implement `update(delta)` method (minimal - Lua handles execution)
- [ ] Add error handling (log and crash)

**Dependencies**: Task 1.3 (InteractionEntity)

**Estimated Time**: 3-4 hours

---

### Task 1.5: Integrate with EntityLoader
**File**: `src/scenes/GameScene.ts` (modify)

**Subtasks**:
- [ ] Add `InteractionEventManager` instance
- [ ] Initialize in `create()` method
- [ ] Pass to `InGameState` constructor
- [ ] Add test key binding (e.g., I key) to trigger test interaction

**Dependencies**: Task 1.3, Task 1.4

**Estimated Time**: 30 minutes

---

### Task 1.6: Update StateMachine
**File**: `src/scenes/states/InGameState.ts` (modify)

**Subtasks**:
- [ ] Add `InteractionState` to state machine
- [ ] Add method to transition to interaction state
- [ ] Pass `InteractionEventManager` to states

**Dependencies**: Task 1.4

**Estimated Time**: 30 minutes

---

## Phase 2: Entity Commands

### Task 2.1: InteractionComponent
**File**: `src/ecs/components/interaction/InteractionComponent.ts`

**Subtasks**:
- [ ] Create `InteractionComponent` class
- [ ] Implement `moveTo(col, row, speedPxPerSec)` method:
  - [ ] Use `Pathfinder` to find path
  - [ ] Throw error if no path found
  - [ ] Move node-by-node
  - [ ] Play walk animation based on direction
  - [ ] Return Promise that resolves when complete
- [ ] Implement `look(direction)` method:
  - [ ] Map direction string to `Direction` enum
  - [ ] Set idle animation frame
  - [ ] Return Promise (resolves immediately)
- [ ] Add `update(delta)` method for movement
- [ ] Add cleanup in `onDestroy()`

**Dependencies**: None (uses existing Pathfinder)

**Estimated Time**: 4-5 hours

---

### Task 2.2: WalkComponent Integration
**File**: `src/ecs/components/movement/WalkComponent.ts` (modify)

**Subtasks**:
- [ ] Add check at start of `update()`:
  ```typescript
  if (this.entity.get(InteractionComponent)) return;
  ```

**Dependencies**: Task 2.1

**Estimated Time**: 5 minutes

---

### Task 2.3: Connect InteractionComponent to API
**File**: `src/systems/InteractionAPI.ts` (modify)

**Subtasks**:
- [ ] Store reference to player entity
- [ ] Implement `moveTo()` to call `InteractionComponent.moveTo()`
- [ ] Implement `look()` to call `InteractionComponent.look()`
- [ ] Add/remove `InteractionComponent` dynamically as needed

**Dependencies**: Task 2.1

**Estimated Time**: 1 hour

---

### Task 2.4: Coin Properties
**File**: `src/ecs/components/ui/CoinCounterComponent.ts` (modify)

**Subtasks**:
- [ ] Add `getCount()` method (if not exists)
- [ ] Add `removeCoins(amount)` method (clamp to 0)
- [ ] Add `addCoins(amount)` method
- [ ] Ensure visual counter updates

**Dependencies**: None

**Estimated Time**: 30 minutes

---

### Task 2.5: Connect Coins to API
**File**: `src/systems/InteractionAPI.ts` (modify)

**Subtasks**:
- [ ] Get `CoinCounterComponent` from player entity
- [ ] Implement `coins.get()` → `CoinCounterComponent.getCount()`
- [ ] Implement `coins.spend(x)` → `CoinCounterComponent.removeCoins(x)`
- [ ] Implement `coins.obtain(x)` → `CoinCounterComponent.addCoins(x)`

**Dependencies**: Task 2.4

**Estimated Time**: 30 minutes

---

## Phase 3: Scene Commands

### Task 3.1: Wait Command
**File**: `src/systems/InteractionAPI.ts` (modify)

**Subtasks**:
- [ ] Implement `wait(timeMs)` method
- [ ] Return Promise that resolves after delay
- [ ] Use `setTimeout` or Phaser timer

**Dependencies**: None

**Estimated Time**: 15 minutes

---

### Task 3.2: Speech Box Asset
**File**: N/A (using HUD graphics, no asset needed)

**Subtasks**:
- [ ] ~~Create or find speech box image~~ (Not needed - using graphics)
- [ ] ~~Add to asset registry~~ (Not needed)
- [ ] ~~Preload in GameScene~~ (Not needed)

**Dependencies**: None

**Estimated Time**: 0 minutes (no asset needed)

---

### Task 3.3: SpeechBoxComponent
**File**: `src/ecs/components/ui/SpeechBoxComponent.ts`

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
