# Interaction System Requirements

## Overview
A Lua-based scripting system for cutscenes and interactive events in the game.

## Wasmoon POC Results ✓

**Status**: SUCCESSFUL - Wasmoon with command queue approach is perfect

**Key Discovery**: Wasmoon cannot await JavaScript Promises directly. **Solution**: Commands queue during Lua execution, then execute sequentially in JavaScript.

**Tests Completed**:
- ✓ Basic Lua execution works
- ✓ JS functions can be called from Lua
- ✓ JS objects with methods work (coins.get(), coins.spend())
- ✓ Parameters pass correctly
- ✓ **Conditionals work correctly** (if/then/else evaluates during Lua phase)
- ✓ **Nested conditionals work** (multiple levels of branching)
- ✓ **Command queue approach works** (Lua builds queue instantly, JS executes sequentially)
- ✓ **State modifications work** (coins.spend() during Lua phase affects later conditionals)
- ✓ Error handling works
- ✓ Bundle size: +112KB

**How It Works**:
1. **Lua Phase** (instant): Script executes, evaluates conditionals, queues commands
2. **Execution Phase** (sequential): Commands execute one-by-one with proper async/await
3. **Game continues updating** during execution (water effects, animations visible)

---

## Phase 1: Core Infrastructure

### 1.1 Interaction Entity Type
**Files**:
- `src/systems/level/LevelLoader.ts` (modify - add to EntityType)
- `src/interaction/InteractionEntity.ts` (new)
- `src/ecs/components/interaction/InteractionTriggerComponent.ts` (new)

**Purpose**: Entity that triggers Lua script execution when spawned

**Level JSON Format**:
```json
{
  "entities": [
    {
      "id": "interaction0",
      "type": "interaction",
      "createOnAnyEvent": ["enterShop"],
      "data": {
        "filename": "shopInteraction0"
      }
    }
  ]
}
```

**Behavior**:
- Spawns when event fires (via existing `EntityCreatorManager`)
- Immediately triggers `InteractionState` with script filename
- Destroys itself after triggering

**Acceptance Criteria**:
- Added to `EntityType` union
- Entity factory creates minimal entity (no position needed)
- `InteractionTriggerComponent` loads and executes script
- Integrates with existing entity system
- Works with `createOnAnyEvent` and `createOnAllEvents`

### 1.2 InteractionTriggerComponent
**File**: `src/ecs/components/interaction/InteractionTriggerComponent.ts`

**Purpose**: Loads Lua script and triggers InteractionState

**Implementation Pattern**:
```typescript
class InteractionTriggerComponent implements Component {
  entity!: Entity;
  private hasTriggered = false;

  constructor(
    private readonly scene: GameScene,
    private readonly filename: string
  ) {}

  update(_delta: number): void {
    if (this.hasTriggered) return;
    this.hasTriggered = true;

    // Load and trigger (async, but don't await in update)
    this.loadAndTrigger().catch(error => {
      console.error(`[Interaction] Failed to load ${this.filename}:`, error);
      throw error; // Crash game
    });
  }

  private async loadAndTrigger(): Promise<void> {
    const response = await fetch(`/assets/interactions/${this.filename}.lua`);
    if (!response.ok) {
      throw new Error(`Script not found: ${this.filename}.lua`);
    }
    const scriptContent = await response.text();
    this.scene.startInteraction(scriptContent);
    this.entity.destroy();
  }
}
```

**Why update() not init()**: Component.init() is not async in our ECS. Using update() on first frame is the standard pattern for async initialization.

**Acceptance Criteria**:
- Triggers on first update frame
- Loads `.lua` file using `fetch()`
- Throws error if file not found (crashes game)
- Calls `scene.startInteraction(scriptContent)`
- Destroys entity after triggering
- Errors logged and crash game
- Destroys entity immediately after triggering

### 1.5 LuaRuntime with Command Queue
**File**: `src/systems/LuaRuntime.ts`

**Purpose**: Executes Lua scripts and manages command queue

**Command Types**:
```typescript
type Command =
  | { type: 'wait'; ms: number }
  | { type: 'say'; name: string; text: string; speed: number; timeout: number }
  | { type: 'moveTo'; col: number; row: number; speed: number }
  | { type: 'look'; direction: string };
```

**API**:
```typescript
class LuaRuntime {
  private commandQueue: Command[] = [];

  constructor(
    private readonly scene: GameScene,
    private readonly playerEntity: Entity
  )

  async executeScript(scriptContent: string): Promise<void>
  private async executeCommand(cmd: Command): Promise<void>
  cleanup(): void
}
```

**Implementation**:
```typescript
async executeScript(scriptContent: string): Promise<void> {
  const factory = new LuaFactory();
  const lua = await factory.createEngine();

  try {
    this.commandQueue = [];

    // Expose API functions that QUEUE commands
    lua.global.set('wait', (ms: number) => {
      this.commandQueue.push({ type: 'wait', ms });
    });

    lua.global.set('say', (name, text, speed, timeout) => {
      this.commandQueue.push({ type: 'say', name, text, speed, timeout });
    });

    // Expose player object
    const player = {
      moveTo: (col: number, row: number, speed: number) => {
        this.commandQueue.push({ type: 'moveTo', col, row, speed });
      },
      look: (direction: string) => {
        this.commandQueue.push({ type: 'look', direction });
      }
    };
    lua.global.set('player', player);

    // Expose coins object (immediate execution, not queued)
    const coinCounter = this.playerEntity.get(CoinCounterComponent);
    const coins = {
      get: () => coinCounter.getCount(),
      spend: (amount: number) => coinCounter.removeCoins(amount),
      obtain: (amount: number) => coinCounter.addCoins(amount)
    };
    lua.global.set('coins', coins);

    // Expose speech object
    const speech = {
      setColor: (color: string) => {
        this.speechColor = color; // Store for next say()
      }
    };
    lua.global.set('speech', speech);

    // LUA PHASE: Execute script (instant, builds queue)
    await lua.doString(scriptContent);

    // EXECUTION PHASE: Run commands sequentially
    for (const cmd of this.commandQueue) {
      await this.executeCommand(cmd);
    }

  } finally {
    lua.global.close();
  }
}
```

**Acceptance Criteria**:
- Lua phase executes instantly
- Command queue built correctly
- Conditionals evaluated during Lua phase
- State modifications (coins) happen during Lua phase
- Commands execute sequentially in execution phase
- Each command awaits completion
- Errors logged and crash game
- Cleanup after execution

### 1.6 EntityManager Pause Support
**File**: `src/ecs/EntityManager.ts` (modify)

**Purpose**: Pause non-interaction entities during interactions

**Implementation**:
```typescript
update(delta: number): void {
  // Get scene from first entity
  const scene = this.entities[0]?.scene as GameScene | undefined;

  if (scene?.isInInteraction) {
    // Only update interaction-active entities
    for (const entity of this.entities) {
      if (entity.tags.has('interaction_active') && !entity.isDestroyed) {
        entity.update(delta);
      }
    }
  } else {
    // Normal update all
    for (const entity of this.entities) {
      if (!entity.isDestroyed) {
        entity.update(delta);
      }
    }
  }
}
```

**Acceptance Criteria**:
- Checks `scene.isInInteraction` flag
- Only updates entities tagged `'interaction_active'` during interactions
- Normal behavior when not in interaction
- No performance impact (simple flag check)

### 1.7 Entity.getScene() Method
**File**: `src/ecs/Entity.ts` (modify)

**Purpose**: Provide scene access for EntityManager

**Implementation**:
```typescript
class Entity {
  // ... existing code

  get scene(): Phaser.Scene | undefined {
    // Get scene from first component that has one
    const transform = this.get(TransformComponent);
    if (transform?.sprite) return transform.sprite.scene;

    const sprite = this.get(SpriteComponent);
    if (sprite?.sprite) return sprite.sprite.scene;

    return undefined;
  }
}
```

**Acceptance Criteria**:
- Returns scene from sprite components
- Returns undefined if no scene available
- No performance impact (simple getter)

### 1.8 InputComponent.enabled Property
**File**: `src/ecs/components/input/InputComponent.ts` (modify)

**Purpose**: Allow disabling input during interactions

**Implementation**:
```typescript
class InputComponent implements Component {
  public enabled: boolean = true;

  update(delta: number): void {
    if (!this.enabled) return;
    // ... existing input logic
  }
}
```

**Acceptance Criteria**:
- Adds `enabled` property (default true)
- Checks enabled at start of update()
- No input processed when disabled

### 1.9 HudScene.setVisible() Method
**File**: `src/scenes/HudScene.ts` (modify)

**Purpose**: Hide/show all HUD elements

**Implementation**:
```typescript
setVisible(visible: boolean): void {
  this.entityManager.getAll().forEach(entity => {
    const sprite = entity.get(SpriteComponent);
    if (sprite) sprite.sprite.setVisible(visible);

    // Also hide graphics, text, etc.
    // ... handle all HUD element types
  });
}
```

**Acceptance Criteria**:
- Hides/shows all HUD entities
- Handles sprites, graphics, text objects
- Simple boolean parameter
**File**: `src/scenes/states/InteractionState.ts`

**Purpose**: Game state during interactions - executes command queue

**State Data**:
```typescript
interface InteractionStateData {
  scriptContent: string;
}
```

**Execution Flow**:
1. **Lua Phase** (instant):
   - Create LuaRuntime
   - Expose API functions that queue commands
   - Execute `lua.doString(scriptContent)`
   - Lua evaluates conditionals and queues commands
   - State modifications happen immediately (coins.spend())

2. **Execution Phase** (sequential):
   - Iterate through command queue
   - Execute each command with `await`
   - Commands block until complete
   - Game continues updating interaction-active entities

**Pause Mechanism**:
```typescript
onEnter(data: InteractionStateData): void {
  // Set global flag for EntityManager
  (this.scene as GameScene).isInInteraction = true;

  // Hide HUD
  const hudScene = this.scene.scene.get('HudScene') as HudScene;
  hudScene.setVisible(false);

  // Disable player input
  const player = this.entityManager.getFirst('player');
  const input = player?.get(InputComponent);
  if (input) input.enabled = false;

  // Execute script (Lua phase + execution phase)
  this.executeScript(data.scriptContent).then(() => {
    this.scene.stateMachine.enter('inGame');
  }).catch(error => {
    console.error('[Interaction] Script error:', error);
    throw error; // Crash game
  });
}

onExit(): void {
  // Clear flag
  (this.scene as GameScene).isInInteraction = false;

  // Show HUD
  const hudScene = this.scene.scene.get('HudScene') as HudScene;
  hudScene.setVisible(true);

  // Enable player input
  const player = this.entityManager.getFirst('player');
  const input = player?.get(InputComponent);
  if (input) input.enabled = true;
}
```

**What Pauses** (via EntityManager check):
- All entities EXCEPT those tagged `'interaction_active'`
- Enemies, projectiles, timers all pause
- Player pauses UNLESS tagged `'interaction_active'` (during moveTo)

**What Continues**:
- Rendering (game stays visible)
- Camera (locked on player)
- Entities tagged `'interaction_active'`

**Acceptance Criteria**:
- Lua phase executes instantly and builds command queue
- Execution phase runs commands sequentially
- Game rendering continues
- Only interaction-active entities update
- HUD hidden during interaction
- Player input disabled (InputComponent.enabled = false)
- Returns to InGameState when all commands complete
- All errors logged and crash game

### 1.5 Lua Runtime Integration
**File**: `src/systems/LuaRuntime.ts`

**Purpose**: Wrapper around wasmoon for executing Lua scripts

**API**:
```typescript
class LuaRuntime {
  constructor()
  loadScript(scriptContent: string): void
  exposeAPI(api: InteractionAPI): void
  execute(): Promise<void>
  cleanup(): void
}
```

**Acceptance Criteria**:
- Creates isolated Lua state per interaction
- Exposes JS API to Lua via `lua.global.set()`
- Handles errors gracefully (try/catch)
- Cleans up after execution

---

## Phase 2: Entity Commands

### 2.1 InteractionComponent
**File**: `src/ecs/components/interaction/InteractionComponent.ts`

**Purpose**: Handles player movement and looking during interactions

**Lifecycle**:
- Added to player entity in `PlayerEntity` factory (always present)
- Has `isActive` flag (default false)
- Dormant until activated by command execution
- Tags player as `'interaction_active'` when active

**API** (called from LuaRuntime.executeCommand()):
```typescript
class InteractionComponent implements Component {
  private isActive = false;
  private currentPath: Array<{col: number; row: number}> | null = null;
  private currentPathIndex = 0;
  private targetSpeed = 0;

  constructor(
    private readonly grid: Grid,
    private readonly pathfinder: Pathfinder,
    private readonly animationComp: AnimationComponent
  ) {}

  async moveTo(col: number, row: number, speedPxPerSec: number): Promise<void>
  async look(direction: string): Promise<void>

  update(delta: number): void // Moves along path when active
}
```

**moveTo() Implementation**:
1. Find path using Pathfinder
2. Throw error if no path found (crashes game)
3. Set `isActive = true`
4. Tag entity as `'interaction_active'`
5. Store path and speed
6. Return Promise that resolves when destination reached
7. In `update()`: Move node-by-node, play walk animation
8. When complete: Set `isActive = false`, remove tag

**look() Implementation**:
1. Map direction string to Direction enum (see mapping table below)
2. Throw error if invalid direction
3. Play idle animation for that direction
4. Return resolved Promise (instant)

**Direction Mapping**:
```typescript
const DIRECTION_MAP: Record<string, Direction> = {
  'down': Direction.Down,
  'up': Direction.Up,
  'left': Direction.Left,
  'right': Direction.Right,
  'down_left': Direction.DownLeft,
  'down_right': Direction.DownRight,
  'up_left': Direction.UpLeft,
  'up_right': Direction.UpRight
};
```

**Acceptance Criteria**:
- Always present on player (added in PlayerEntity factory)
- Dormant until activated
- moveTo() uses pathfinding, throws error if no path
- Plays walk animation based on movement direction (calculate from current node to next node)
- look() maps strings to Direction enum, throws error if invalid
- Tags player as `'interaction_active'` when active
- Removes tag when inactive
- Promises resolve when actions complete

### 2.2 WalkComponent Integration
**File**: `src/ecs/components/movement/WalkComponent.ts` (modify)

**Change**: Add check for active InteractionComponent
```typescript
update(delta: number): void {
  const interaction = this.entity.get(InteractionComponent);
  if (interaction?.isActive) return;
  // ... normal walk logic
}
```

**Acceptance Criteria**:
- Normal movement disabled when InteractionComponent is active
- Normal movement works when InteractionComponent is inactive

### 2.3 CoinCounterComponent Methods
**File**: `src/ecs/components/ui/CoinCounterComponent.ts` (modify)

**Purpose**: Expose methods for Lua API

**Add Methods**:
```typescript
getCount(): number {
  return this.coinCount;
}

removeCoins(amount: number): void {
  this.coinCount = Math.max(0, this.coinCount - amount);
  this.updateDisplay();
}

addCoins(amount: number): void {
  this.coinCount += amount;
  this.updateDisplay();
}
```

**Acceptance Criteria**:
- getCount() returns current coin count
- removeCoins() clamps to 0 (can't go negative)
- addCoins() has no max limit
- Visual counter updates after modifications

---

## Phase 3: Scene Commands

### 3.1 Wait Command
**File**: `src/systems/InteractionAPI.ts`

**API** (exposed to Lua):
```lua
wait(timeInMs)
```

**Behavior**: Pauses interaction execution for specified time

**Acceptance Criteria**:
- Blocks for exact duration
- Game remains paused during wait
- No visual changes

### 3.2 SpeechBoxComponent
**File**: `src/ecs/components/ui/SpeechBoxComponent.ts`

**Purpose**: Renders speech box with animated text

**Visual Design**:
- **Rendering**: HUD Graphics rounded rectangle
- **Position**: Centered at bottom
  - Top: 55% of displaySize.height
  - Bottom: 95% of displaySize.height
  - Width: 60% of displaySize.width
  - Horizontally centered
- **Appearance**:
  - Rounded corners: 10px radius
  - Alpha: 0.8 (80% opaque)
  - **Border**: Darker color border (stronger than fill)
  - **Fill**: Lighter color (based on speech.setColor())
  - Example: Green box = light green fill (#90EE90) + dark green border (#006400)
- **Colors**:
  - "blue": Light blue fill + dark blue border
  - "black": Dark gray fill + black border (default)
  - "purple": Light purple fill + dark purple border
  - "gold": Light gold fill + dark gold border
- **Text**:
  - Font: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  - Size: 20px (adjust if needed during implementation)
  - Default color: White
  - Name at top-left with 20px padding
  - Message starts below name with 20px padding
  - **Color tags**: `<red>`, `<green>`, `<purple>`, `<gold>`
    - Renders as multiple text objects positioned side-by-side
    - Each segment has its own color
    - Reverts to white after closing tag
    - **Limitation**: Color tags cannot span line breaks (keep colored text on same line)
  - **Line breaks**: `<newline/>` creates new line
  - **Wrapping**: Use Phaser's wordWrap per text segment

**Color Tag Parsing**:
```typescript
// Parse: "Hello <red>world</red>!"
// Returns: [
//   { text: "Hello ", color: "#ffffff" },
//   { text: "world", color: "#ff0000" },
//   { text: "!", color: "#ffffff" }
// ]
```

**Rules**:
- No nested tags (throw error if found)
- Unclosed tags throw error
- Unknown colors throw error
- Valid colors: red, green, purple, gold

**Behavior**:
1. Tween in from scale 0 to 1 (300ms)
2. Text appears character-by-character (50ms between chars)
3. Punctuation (`.`, `!`, `?`) adds 300ms delay
4. Space/touch: Reveal remaining characters at 5ms speed
5. After all text shown: Wait for timeout OR space/touch
6. Space/touch after complete: Dismiss immediately
7. Tween out to scale 0 (300ms)
8. Destroy and resolve Promise

**Implementation Notes**:
- Create as separate entity (not added to player)
- Tag entity as `'interaction_active'` so it updates during interaction
- Use Phaser.GameObjects.Graphics for rounded rectangle
- Use Phaser.GameObjects.Text for each colored segment
- Position text objects side-by-side based on measured width

**Acceptance Criteria**:
- Renders rounded rectangle with border
- Positioned correctly (centered bottom, 55%-95% height, 60% width)
- Background color changes with `speech.setColor()`
- Text animates character-by-character
- Color tags parsed and rendered correctly
- Nested/unclosed/invalid tags throw errors and crash
- Punctuation delays work
- Skip to 5ms speed works
- Timeout works
- Dismisses on space/touch
- `<newline/>` creates line breaks
- Returns Promise that resolves when dismissed

---

## Phase 4: Conditionals

### 4.1 Conditional Support
**File**: `src/systems/LuaRuntime.ts` (already supported by Lua)

**Syntax**:
```lua
if <condition> then
  <commands>
else
  <commands>
end
```

**Conditions**:
- `<property> < <value>`
- `<property> > <value>`
- `<property> == <value>`
- `<property> ~= <value>` (not equal in Lua)
- `<property> <= <value>`
- `<property> >= <value>`

**Compound Conditions**:
```lua
if coins.get() >= 50 and player.health.get() > 20 then
  -- ...
end
```

**Acceptance Criteria**:
- All comparison operators work
- `and`/`or` work for compound conditions
- Nested conditionals work
- `else` is optional

---

## Phase 5: Build-Time Validation (DEFERRED)

**Decision**: Skip build-time validation for initial implementation. Runtime errors will crash the game with clear error messages.

**Future Enhancement**: Add `scripts/validate-interactions.mjs` to check:
- Lua syntax
- API usage
- Parameter counts
- Valid direction/color strings

---

## Phase 6: Testing (Now Phase 5)

### 6.1 Test Interactions
**Files**: `public/assets/interactions/test_*.lua`

Create test files for:
1. `test_shop.lua` - Coin spending with conditional
2. `test_movement.lua` - Movement and looking
3. `test_speech.lua` - Speech box with various text lengths
4. `test_complex.lua` - Nested conditionals and multiple commands

### 6.2 Integration Testing
- Trigger interactions via events
- Verify game state pauses correctly
- Verify HUD hides/shows
- Verify smooth transitions
- Test error handling

---

## Implementation Order

1. **Phase 1.1-1.3**: Core infrastructure (InteractionEventManager, InteractionState, LuaRuntime)
2. **Phase 2.1-2.3**: Entity commands (InteractionComponent, player.moveTo, player.look, coins.get)
3. **Phase 3.1**: Wait command
4. **Phase 3.2-3.3**: Speech box system
5. **Phase 4.1**: Conditionals (already supported by Lua, just test)
6. **Phase 5.1-5.2**: Build-time validation
7. **Phase 6.1-6.2**: Testing and polish

---

## Future Enhancements (Not in Scope)

- Multiple entity support (enemies, NPCs)
- Camera control commands
- Selection/choice menus
- Sound effects
- Colored text (`<red>text</red>`)
- Editor integration
- Save/load interaction state

---

## Technical Notes

### Player Name
- Display name: "Akari" (明里 - "bright village")
- Entity ID: "player"

### Comments
- Lua comments: `-- comment text`
- Everything after `--` on a line is ignored

### Error Handling
- Syntax errors: Caught at build time
- Runtime errors: Log to console and crash game
- No path found: Raise exception, crash game

### Performance
- wasmoon adds ~112KB to bundle (WebAssembly)
- Lua 5.4 execution is fast
- One Lua state per interaction (isolated)

---

## Dependencies

**New**:
- `wasmoon` - Lua 5.4 via WebAssembly

**Existing**:
- `Pathfinder` - For moveTo pathfinding
- `EventManagerSystem` - For triggering interactions
- `StateMachine` - For InteractionState
- `CoinCounterComponent` - For coin operations
- `Direction` enum - For look directions

---

## Files to Create

1. `src/systems/LuaRuntime.ts` - Command queue and Lua execution
2. `src/scenes/states/InteractionState.ts` - Game state during interactions
3. `src/interaction/InteractionEntity.ts` - Entity factory
4. `src/ecs/components/interaction/InteractionTriggerComponent.ts` - Loads script and triggers state
5. `src/ecs/components/interaction/InteractionComponent.ts` - Player movement and looking (dormant until activated)
6. `src/ecs/components/ui/SpeechBoxComponent.ts` - Speech box rendering and animation
7. `src/types/wasmoon.d.ts` - Type declarations for wasmoon
8. `public/assets/interactions/test_*.lua` - Test scripts

## Files to Modify

1. `src/systems/level/LevelLoader.ts` - Add 'interaction' to EntityType
2. `src/systems/EntityLoader.ts` - Add case for 'interaction' type
3. `src/ecs/EntityManager.ts` - Add pause mechanism (check scene.isInInteraction)
4. `src/ecs/Entity.ts` - Add getScene() method
5. `src/ecs/components/input/InputComponent.ts` - Add enabled property
6. `src/ecs/components/movement/WalkComponent.ts` - Check InteractionComponent.isActive
7. `src/ecs/components/ui/CoinCounterComponent.ts` - Add getCount(), removeCoins(), addCoins()
8. `src/ecs/entities/player/PlayerEntity.ts` - Add InteractionComponent (always present, dormant)
9. `src/scenes/HudScene.ts` - Add setVisible() method
10. `src/scenes/GameScene.ts` - Add isInInteraction flag, startInteraction() method, add InteractionState to state machine
11. `src/editor/AddEntityEditorState.ts` - Add 'interaction' type (future)
12. `src/scenes/EditorScene.ts` - Extract interaction entities (future)

---

## Next Steps

Ready to proceed with Phase 1? I'll start with:
1. InteractionEventManager
2. LuaRuntime wrapper
3. InteractionState

Let me know if you want any changes to this spec!
