# Interaction System - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         GameScene                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              EntityCreatorManager                       │ │
│  │  - Listens for events                                  │ │
│  │  - Spawns interaction entities when events fire        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    InteractionEntity                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         InteractionTriggerComponent                     │ │
│  │  - Loads .lua file from public/assets/interactions/   │ │
│  │  - Triggers InteractionState                           │ │
│  │  - Destroys entity after triggering                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      InteractionState                        │
│  - Pauses game (enemies, projectiles, timers)              │
│  - Hides HUD                                                 │
│  - Executes Lua script via LuaRuntime                       │
│  - Resumes game when complete                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        LuaRuntime                            │
│  - Wraps wasmoon (Lua 5.4 via WebAssembly)                 │
│  - Exposes InteractionAPI to Lua                            │
│  - Executes script sequentially (blocking commands)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      InteractionAPI                          │
│  - Exposes JS functions to Lua:                             │
│    • player.moveTo(col, row, speed)                         │
│    • player.look(direction)                                 │
│    • coins.get() / coins.spend() / coins.obtain()          │
│    • wait(timeMs)                                           │
│    • say(name, text, talkSpeed, timeout)                    │
│    • speech.setColor(color)                                 │
│  - Each command returns Promise (blocks until complete)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Components                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ InteractionComponent (player entity)                  │  │
│  │  - moveTo: Uses Pathfinder, plays walk animation     │  │
│  │  - look: Changes facing direction                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SpeechBoxComponent (HUD entity)                       │  │
│  │  - Renders rounded rectangle with gradient           │  │
│  │  - Character-by-character text reveal                │  │
│  │  - Color tags: <red>, <green>, <purple>, <gold>      │  │
│  │  - Skip on space/touch                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Level JSON Definition
```json
{
  "entities": [
    {
      "id": "interaction0",
      "type": "interaction",
      "createOnAnyEvent": ["enterShop"],
      "data": {
        "filename": "shop_interaction"
      }
    }
  ]
}
```

### 2. Event Trigger
```typescript
// Player walks into trigger zone
eventManager.raiseEvent("enterShop");
  ↓
// EntityCreatorManager spawns interaction entity
createInteractionEntity({ filename: "shop_interaction" });
  ↓
// InteractionTriggerComponent loads script and triggers state
stateMachine.enter("interaction", { scriptContent });
  ↓
// Entity destroys itself after triggering
```

### 3. Script Execution
```lua
-- public/assets/interactions/shop_interaction.lua
if coins.get() >= 50 then
  speech.setColor("purple")
  say("Akari", "I'll buy this!", 50, 3000)
  coins.spend(50)
else
  speech.setColor("gold")
  say("Akari", "Need <red>50 coins</red>!", 50, 3000)
end
```

### 4. Command Execution
```typescript
// Each Lua command blocks until complete
await lua.doString(`
  local balance = coins.get()  -- Returns immediately
  if balance >= 50 then
    say("Akari", "Text", 50, 3000)  -- Blocks until dismissed
  end
`);
```

## Component Design

### InteractionComponent
**Purpose**: Handles player movement and looking during interactions

**Key Methods**:
- `moveTo(col, row, speed)`: Returns Promise, resolves when destination reached
- `look(direction)`: Returns Promise, resolves immediately

**Implementation**:
- Uses existing `Pathfinder` for navigation
- Plays walk animations based on movement direction
- Updates `AnimationComponent` for idle frames when looking

### SpeechBoxComponent
**Purpose**: Renders speech box with text animation

**Visual Structure**:
```
┌─────────────────────────────────────────────────┐
│ Akari                                           │  ← Name (top-left, padding, bold)
│                                                 │
│ I think I will buy this!                        │  ← Text (white, wraps)
│                                                 │
└─────────────────────────────────────────────────┘
   ↑                                           ↑
   55% screen height                    95% screen height

   ←─────────── 60% screen width ──────────→
```

**Rendering**:
- HUD Graphics (not sprite)
- Rounded rectangle: 10px corners
- Alpha: 0.8 (80% opaque)
- Gradient: Lighter center, darker edges (blend mode)
- Colors: blue, black (default), purple, gold

**Text Rendering**:
- Font: Arial, Helvetica Neue, Helvetica, sans-serif
- Default color: White
- Color tags: `<red>text</red>`, `<green>text</green>`, `<purple>text</purple>`, `<gold>text</gold>`
- Auto-wrap to fit box width
- Character-by-character reveal (50ms default)
- Punctuation delay: 300ms

**Input Handling**:
- Space or touch: Skip to end (faster reveal)
- After complete: Wait for timeout OR space/touch
- Dismisses and resolves Promise

## State Management

### Game Pause During Interactions

**What pauses**:
- Player input (disable `InputComponent`)
- Enemy state machines (pause `StateMachineComponent.update()`)
- Projectile updates (pause `ProjectileComponent.update()`)
- Timers (ammo refill, cooldowns)
- Health regeneration

**What continues**:
- Rendering (game stays visible)
- Camera (stays locked on player)
- Interaction commands (movement, speech)

**Implementation**:
```typescript
// InteractionState.onEnter()
- Set flag: scene.isInInteraction = true
- Hide HUD: hudScene.setVisible(false)
- Disable player input: player.get(InputComponent).enabled = false
- Pause enemies: for each enemy, enemy.paused = true
- Execute Lua script

// InteractionState.onExit()
- Clear flag: scene.isInInteraction = false
- Show HUD: hudScene.setVisible(true)
- Enable player input: player.get(InputComponent).enabled = true
- Resume enemies: for each enemy, enemy.paused = false
```

## Wasmoon Usage Guide

### Basic Setup

```typescript
import { LuaFactory } from 'wasmoon';

// Create Lua engine (async)
const factory = new LuaFactory();
const lua = await factory.createEngine();

// Always cleanup when done
try {
  // ... use lua
} finally {
  lua.global.close();
}
```

### Exposing JS Functions to Lua

```typescript
// Simple function
lua.global.set('wait', (timeMs: number) => {
  return new Promise(resolve => setTimeout(resolve, timeMs));
});

// In Lua:
// wait(500)
```

### Exposing JS Objects with Methods

```typescript
// Object with methods
const coins = {
  get: () => coinCounter.getCount(),
  spend: (amount: number) => coinCounter.removeCoins(amount),
  obtain: (amount: number) => coinCounter.addCoins(amount)
};

lua.global.set('coins', coins);

// In Lua:
// local balance = coins.get()
// coins.spend(50)
```

### Executing Lua Scripts

```typescript
// Execute and get return value
const result = await lua.doString(`
  local x = 10
  return x + 5
`);
console.log(result); // 15

// Execute without return value
await lua.doString(`
  print("Hello from Lua!")
`);
```

### Error Handling

```typescript
try {
  await lua.doString(scriptContent);
} catch (error) {
  console.error('Lua error:', error);
  // Error message includes line number and description
}
```

### Async Commands (Blocking)

For commands that should block (moveTo, say, wait):

```typescript
// Expose async function
lua.global.set('say', async (name: string, text: string, talkSpeed: number, timeout: number) => {
  const speechBox = new SpeechBoxComponent(scene);
  await speechBox.show(name, text, talkSpeed, timeout);
});

// Lua automatically awaits
// say("Akari", "Hello!", 50, 3000)  -- Blocks until dismissed
// print("This runs after speech box closes")
```

### Key Differences from Fengari

**Fengari** (doesn't work):
- Complex stack manipulation
- `interop.push()` doesn't pass parameters correctly
- Nested objects fail: `player.coins.spend(50)` → undefined

**Wasmoon** (works perfectly):
- Simple API: `lua.global.set()`
- Parameters pass correctly: `coins.spend(50)` → 50
- Objects with methods work: `coins.get()`, `coins.spend()`
- Async/await support built-in

### Type Declarations

Already created in `src/types/wasmoon.d.ts`:

```typescript
declare module 'wasmoon' {
  export class LuaFactory {
    createEngine(): Promise<LuaEngine>;
  }

  export class LuaEngine {
    global: LuaGlobal;
    doString(code: string): Promise<any>;
  }

  export class LuaGlobal {
    set(name: string, value: any): void;
    get(name: string): any;
    close(): void;
  }
}
```

---

## Lua API Design

### Flat Structure (wasmoon compatible)
```lua
-- Global functions
wait(500)
say("Akari", "Hello!", 50, 3000)

-- Global objects with methods
coins.get()
coins.spend(50)
coins.obtain(10)

player.moveTo(10, 5, 200)
player.look("down_left")

speech.setColor("purple")
```

### Why This Structure?
- Wasmoon handles parameters correctly with flat structure
- Nested objects (`player.coins.spend()`) had parameter passing issues
- Simple and clear for script writers

## Error Handling

### Build-Time Validation
```bash
npm run check-interactions
```
- Checks Lua syntax
- Validates API usage
- Checks parameter counts
- Validates color/direction strings
- Fails build if errors found

### Runtime Errors
```typescript
try {
  await lua.doString(script);
} catch (error) {
  console.error('[Interaction] Script error:', error);
  throw error; // Crash game (fail fast)
}
```

**Philosophy**: Fail fast during development, fix scripts before release

## Performance Considerations

### Bundle Size
- wasmoon: ~112KB (WebAssembly)
- Acceptable for feature richness

### Script Loading
- Load `.lua` files dynamically when triggered
- Cache loaded scripts in memory
- No preloading needed

### Lua Execution
- WebAssembly is fast
- Scripts are simple (no heavy computation)
- Blocking is intentional (sequential commands)

## Testing Strategy

### Unit Tests (if time permits)
- LuaRuntime: Script execution, API exposure
- InteractionAPI: Command execution, Promise handling
- SpeechBoxComponent: Text parsing, color tags

### Integration Tests
- Create test interactions in `public/assets/interactions/test_*.lua`
- Test each command type
- Test conditionals
- Test error handling

### Manual Testing
- Trigger interactions via events
- Verify game pause/resume
- Verify HUD hide/show
- Test speech box appearance
- Test color tags
- Test skip functionality

## Future Enhancements (Out of Scope)

- Multiple entity support (enemies, NPCs in interactions)
- Camera control commands
- Selection/choice menus
- Sound effects
- More color tags
- Animation commands (shake, fade, etc.)
- Editor integration (visual interaction editor)
- Save/load interaction state
- Branching dialogue trees
- Variable storage across interactions

## File Organization

```
features/interactions/
├── interaction-system-requirements.md  # Complete spec
├── interaction-system-tasks.md         # Task breakdown
├── interaction-system-design.md        # This file
└── README.md                           # Guide for new sessions

public/assets/interactions/
├── test_shop.lua
├── test_movement.lua
├── test_speech.lua
└── test_complex.lua

src/interaction/
└── InteractionEntity.ts

src/systems/
├── LuaRuntime.ts
└── InteractionAPI.ts

src/scenes/states/
└── InteractionState.ts

src/ecs/components/
├── interaction/
│   ├── InteractionTriggerComponent.ts
│   └── InteractionComponent.ts
└── ui/
    └── SpeechBoxComponent.ts

scripts/
└── validate-interactions.mjs
```

## Dependencies

**New**:
- `wasmoon` - Lua 5.4 via WebAssembly (~112KB)

**Existing**:
- `Pathfinder` - For moveTo pathfinding
- `EventManagerSystem` - For triggering interactions
- `StateMachine` - For InteractionState
- `CoinCounterComponent` - For coin operations
- `Direction` enum - For look directions
- `AnimationComponent` - For walk/idle animations

## Summary

The interaction system provides a Lua-based scripting layer for cutscenes and interactive events. It uses wasmoon for reliable Lua execution, exposes a clean API for common game actions, and renders speech boxes using HUD graphics with color support. The system is designed to be simple, reliable, and easy to extend.
