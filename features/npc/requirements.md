# NPC System - Requirements

## Overview

NPCs are non-hostile entities that stand idle and can trigger interactions when the player is nearby. They support conditional interactions based on global flags and position overrides.

## Phase 1: Core NPC Entity

### 1.1 NPC Entity Type

**Purpose**: Define NPC as a new entity type with idle behavior

**Level JSON Format**:
```json
{
  "id": "npc1",
  "type": "npc",
  "data": {
    "assets": "npc1",
    "col": 11,
    "row": 21,
    "direction": "Down",
    "interactions": [
      {
        "name": "npc1_alt_interaction",
        "whenFlagSet": {
          "name": "npc1_condition",
          "condition": "equals",
          "value": "on"
        },
        "position": {
          "col": 5,
          "row": 8
        }
      },
      {
        "name": "npc1_default_interaction"
      }
    ]
  }
}
```

**Properties**:
- `assets`: String - asset folder name (e.g., "npc1" → `public/assets/npc/npc1/`)
- `col`, `row`: Number - spawn position
- `direction`: Direction enum value - initial facing direction (Down, Up, Left, Right, UpLeft, UpRight, DownLeft, DownRight)
- `interactions`: Array - list of possible interactions (priority order)

**Acceptance Criteria**:
- Added to `EntityType` union
- Entity factory creates NPC with components
- Spawns at specified grid position
- Faces specified direction
- No collision (player can walk through)

### 1.2 NPC Animations File

**Purpose**: Centralized animation creation following skeleton/thrower pattern

**File**: `src/ecs/entities/npc/NPCAnimations.ts`

**API**:
```typescript
export function createNPCAnimations(scene: Phaser.Scene, spritesheet: string): void
export function getNPCAnimKey(spritesheet: string, direction: Direction): string
```

**Behavior**:
- Detects frame count from texture
- If 1 frame: Creates static animation (frameRate: 1, repeat: 0)
- If >1 frames: Creates looping animation (frameRate: 8, repeat: -1)
- Creates animations for all 8 directions
- Idempotent (checks if animations exist before creating)

**Acceptance Criteria**:
- Follows skeleton/thrower pattern exactly
- Creates animations once per spritesheet
- Returns correct animation key for direction
- Handles both static and animated sprites

### 1.3 NPC Idle Component

**Purpose**: Play idle animation and handle direction changes

**API**:
```typescript
class NPCIdleComponent implements Component {
  constructor(
    private direction: Direction,
    private readonly spritesheet: string
  )
  
  setDirection(direction: Direction): void
}
```

**Behavior**:
- Initializes on first update (needs scene reference)
- Calls createNPCAnimations() once
- Plays animation for current direction
- setDirection() updates direction and plays new animation

**Acceptance Criteria**:
- Single responsibility: animation playback only
- Direction can be changed dynamically
- Uses AnimationComponent for playback
- Follows skeleton/thrower idle state pattern

### 1.4 Asset Loading

**Purpose**: Load NPC assets per level

**Asset Structure**:
```
public/assets/npc/npc1/
  npc1_spritesheet.png
```

**AssetRegistry Changes**:
```typescript
ASSET_GROUPS: {
  npc1: {
    spritesheet: 'npc1_spritesheet',
    frameWidth: 64,
    frameHeight: 64
  }
}
```

**Acceptance Criteria**:
- NPCs added to ASSET_GROUPS
- Assets loaded when level contains NPCs
- Spritesheet sliced correctly

## Phase 2: Interaction System Integration

### 2.1 NPC Interaction Component

**Purpose**: Track available interactions and evaluate conditions

**API**:
```typescript
type NPCInteraction = {
  name: string;
  whenFlagSet?: FlagCondition;
  position?: { col: number; row: number };
}

type FlagCondition = {
  name: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
  value: string | number;
}

class NPCInteractionComponent implements Component {
  constructor(
    private readonly interactions: NPCInteraction[],
    private readonly defaultCol: number,
    private readonly defaultRow: number
  )
  
  getActiveInteraction(): { name: string; col: number; row: number } | null
  isPlayerInRange(playerEntity: Entity, grid: Grid): boolean
}
```

**Behavior**:
- Evaluates interactions in priority order (first to last)
- Checks `whenFlagSet` conditions using `WorldStateManager.isFlagCondition()`
- Returns first interaction with true condition
- If no `whenFlagSet`, interaction is always valid
- Uses position override if specified, otherwise default position
- Logs warning once if multiple interactions have true conditions
- Logs warning once if no valid interactions

**Acceptance Criteria**:
- Evaluates flag conditions correctly
- Returns first valid interaction
- Handles missing flags (condition fails)
- Validates numeric vs string comparisons
- Logs error for invalid comparisons (e.g., "gt" on strings)
- Logs warning if >1 interaction is valid (once per NPC)
- Logs warning if no valid interactions (once per NPC)

### 2.2 Interaction Range Detection

**Purpose**: Detect when player is within interaction range

**Range Calculation**:
- 100 pixels from NPC center to player collision box center
- Uses player's `CollisionComponent` bounds
- Uses `grid.cellSize` for position calculations (not hardcoded constant)
- Distance = `Math.hypot(npcX - playerBoxCenterX, npcY - playerBoxCenterY)`

**Acceptance Criteria**:
- Calculates distance from NPC center to player box center
- Returns true if distance ≤ 100 pixels
- Uses grid.cellSize from scene

### 2.3 Closest NPC Selection

**Purpose**: Determine which NPC to interact with when multiple are in range

**API**:
```typescript
class NPCManager {
  private cachedClosestNPC: Entity | null = null
  private lastPlayerCol = -1
  private lastPlayerRow = -1
  
  getClosestInteractableNPC(playerEntity: Entity, grid: Grid): Entity | null
}
```

**Behavior**:
- Caches result and only recalculates when player moves to new cell
- Queries all NPC entities
- Filters to those with valid interactions
- Filters to those in range
- Returns closest by distance
- Returns null if none in range

**Acceptance Criteria**:
- Only recalculates when player changes grid cell
- Only considers NPCs with valid interactions
- Only considers NPCs in range
- Returns closest NPC
- Returns null if no valid NPCs

## Phase 3: UI Integration

### 3.1 Attack Button Icon Switching

**Purpose**: Show lips icon when NPC interaction available

**Changes to AttackButtonComponent**:
```typescript
update(delta: number): void {
  const closestNPC = npcManager.getClosestInteractableNPC(playerEntity);
  
  if (closestNPC) {
    this.setIcon('lips');
  } else {
    this.setIcon('punch');
  }
}
```

**Icon Assets**:
- Existing: `public/assets/ui/punch_icon.png`
- New: `public/assets/ui/lips_icon.png` (to be created)

**Acceptance Criteria**:
- Shows lips icon when NPC in range
- Shows punch icon otherwise
- Switches smoothly between icons
- No flicker when switching

### 3.2 Interaction Triggering

**Purpose**: Launch interaction instead of punch when NPC in range

**Changes to InputComponent**:
```typescript
// When space pressed or attack button touched
const closestNPC = npcManager.getClosestInteractableNPC(playerEntity);

if (closestNPC) {
  const interaction = closestNPC.require(NPCInteractionComponent).getActiveInteraction();
  eventManager.raiseEvent(interaction.name);
} else {
  // Existing punch logic
}
```

**Acceptance Criteria**:
- Space key triggers interaction if NPC in range
- Attack button touch triggers interaction if NPC in range
- Punch only happens if no NPC in range
- Interaction event raised correctly

## Phase 4: Interaction Behavior

### 4.1 NPC Look Command

**Purpose**: Allow NPCs to change facing direction during interactions

**LuaRuntime Changes**:
```typescript
// Add to command queue
type Command = 
  | ... existing commands
  | { type: 'npcLook'; npcId: string; direction: Direction }

// Expose to Lua
lua.global.set('npc', {
  look: (direction: string) => {
    const dir = DIRECTION_MAP[direction];
    if (!dir) throw new Error(`Invalid direction: ${direction}`);
    commandQueue.push({ type: 'npcLook', npcId: stateData.npcId, direction: dir });
  }
});

// Execute command
case 'npcLook': {
  const npcEntity = scene.entityManager.getById(cmd.npcId);
  const idle = npcEntity.require(NPCIdleComponent);
  idle.setDirection(cmd.direction);
  break;
}
```

**Acceptance Criteria**:
- npc.look() queues command
- Command executes and updates NPC direction
- Animation changes to match new direction
- Works with both static and animated sprites

### 4.2 Direction Calculation Utility

**Purpose**: Calculate direction from one position to another

**Implementation**: Use existing `dirFromDelta()` from `src/constants/Direction.ts`

**Lua Exposure**:
```typescript
lua.global.set('calculateDirection', (fromCol: number, fromRow: number, toCol: number, toRow: number) => {
  const dx = toCol - fromCol;
  const dy = toRow - fromRow;
  return dirFromDelta(dx, dy);
});
```

**Returns**: Direction enum value (0-8)

**Acceptance Criteria**:
- Uses existing dirFromDelta() utility
- Returns Direction enum value
- Callable from Lua scripts
- Maps to 8 directions correctly

### 4.3 Face Each Other Pattern

**Purpose**: Standard pattern for NPCs and player to face each other

**Lua Script Pattern**:
```lua
-- Calculate directions using existing utility
local playerToNPC = calculateDirection(player.col, player.row, npc.col, npc.row)
local npcToPlayer = calculateDirection(npc.col, npc.row, player.col, player.row)

-- Face each other
player.look(playerToNPC)
npc.look(npcToPlayer)
```

**Acceptance Criteria**:
- Pattern documented in interaction examples
- Works with existing player.look() command
- Works with new npc.look() command
- Uses Direction enum values

### 4.4 InteractionState Integration

**Purpose**: Pass NPC entity ID to interaction scripts

**Changes**:
```typescript
// InteractionTriggerComponent
scene.startInteraction(scriptContent, this.entity.id);

// GameScene.startInteraction()
startInteraction(scriptContent: string, npcId?: string): void {
  this.stateMachine.enter('interaction', { scriptContent, npcId });
}

// InteractionState
type InteractionStateData = {
  scriptContent: string;
  filename: string;
  npcId?: string;
}

// LuaRuntime
constructor(
  private readonly scene: GameScene,
  private readonly playerEntity: Entity,
  private readonly npcId?: string
)
```

**Acceptance Criteria**:
- NPC ID passed through interaction chain
- LuaRuntime receives NPC ID
- npc.look() can find NPC entity by ID
- Works when no NPC (npcId is undefined)

## Phase 5: Edge Cases and Validation

### 5.1 No Valid Interactions

**Purpose**: Handle NPCs with no valid interactions

**Behavior**:
- NPC renders at default position
- No lips icon shown
- No interaction possible
- Console warning logged once per NPC

**Acceptance Criteria**:
- NPC visible
- Lips icon never appears
- Warning logged to console
- Warning only logged once per NPC

### 5.2 Flag Condition Validation

**Purpose**: Validate flag conditions at runtime

**Error Cases**:
- String value with numeric comparison (gt, lt, gte, lte)
  - Log error: "Cannot use numeric comparison on string flag"
  - Condition fails (returns false)
- Missing flag
  - Condition fails silently (returns false)
  - No error logged (expected behavior)

**Acceptance Criteria**:
- Invalid comparisons logged as errors
- Invalid comparisons return false
- Missing flags return false without error

### 5.3 Multiple Valid Interactions

**Purpose**: Warn when multiple interactions are valid

**Behavior**:
- Evaluate all interactions
- Count how many have true conditions
- If >1, log warning with NPC ID and interaction names
- Use first valid interaction

**Acceptance Criteria**:
- Warning logged if >1 valid
- First valid interaction used
- Warning includes NPC ID and interaction names

## Files to Create

- `src/ecs/entities/npc/NPCEntity.ts`
- `src/ecs/components/npc/NPCIdleComponent.ts`
- `src/ecs/components/npc/NPCInteractionComponent.ts`
- `src/systems/NPCManager.ts`
- `public/assets/ui/lips_icon.png` (asset)

## Files to Modify

- `src/systems/level/LevelLoader.ts` - Add 'npc' to EntityType
- `src/systems/EntityLoader.ts` - Add NPC case
- `src/assets/AssetRegistry.ts` - Add NPC asset groups
- `src/assets/AssetLoader.ts` - Load NPC assets per level
- `src/ecs/components/ui/AttackButtonComponent.ts` - Icon switching logic
- `src/ecs/components/input/InputComponent.ts` - Interaction triggering
- `src/scenes/GameScene.ts` - Initialize NPCManager

## Success Criteria

- NPCs spawn at specified positions
- NPCs play idle animations (static or looping)
- NPCs don't block player movement
- Lips icon appears when NPC in range with valid interaction
- Space/attack button triggers interaction instead of punch
- Closest NPC selected when multiple in range
- Flag conditions evaluated correctly
- Position overrides work for range calculation
- Player and NPC face each other on interaction start
- Edge cases handled with appropriate warnings
- Build and lint pass with zero errors
