# NPC System - Design

## Architecture Overview

```
GameScene
  ↓
NPCManager (singleton with caching)
  ↓
NPC Entities
  ├─ TransformComponent (position)
  ├─ SpriteComponent (visual)
  ├─ NPCIdleComponent (playback with setDirection())
  └─ NPCInteractionComponent (interaction logic)

NPCAnimations.ts (centralized)
  ↓ creates animations once
AnimationComponent (playback)
  
AttackButtonComponent
  ↓ queries
NPCManager.getClosestInteractableNPC()
  ↓ returns (cached)
Closest NPC with valid interaction in range
  ↓ triggers
Interaction Event → InteractionState (with NPC ID)
```

## Animation System

### NPCAnimations.ts (Centralized)

**Purpose**: Create all NPC animations once, following skeleton/thrower pattern

**Implementation**:
```typescript
import { Direction, DIR_TO_INDEX } from '../../../constants/Direction';

export function createNPCAnimations(scene: Phaser.Scene, spritesheet: string): void {
  const frameCount = scene.textures.get(spritesheet).frameTotal;
  
  if (frameCount === 1) {
    // Static sprite - create static animation
    const animKey = `${spritesheet}_idle`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [{ key: spritesheet, frame: 0 }],
        frameRate: 1,
        repeat: 0
      });
    }
  } else {
    // Animated sprite - create looping animations for all directions
    for (const [dirName, dirIndex] of Object.entries(DIR_TO_INDEX)) {
      const animKey = `${spritesheet}_idle_${dirName}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [{ key: spritesheet, frame: dirIndex }],
          frameRate: 8,
          repeat: -1
        });
      }
    }
  }
}

export function getNPCAnimKey(spritesheet: string, direction: Direction): string {
  const frameCount = scene.textures.get(spritesheet).frameTotal;
  if (frameCount === 1) {
    return `${spritesheet}_idle`;
  }
  return `${spritesheet}_idle_${direction}`;
}
```

**Key Points**:
- Follows skeleton/thrower pattern exactly
- Creates animations once per spritesheet
- Static sprites: 1 animation, no direction
- Animated sprites: 8 animations (one per direction)
- Idempotent (checks if exists)

### NPCIdleComponent (Playback Only)

**Purpose**: Play animation and handle direction changes

**Implementation**:
```typescript
export class NPCIdleComponent implements Component {
  entity!: Entity;
  private hasInitialized = false;
  
  constructor(
    private direction: Direction,
    private readonly spritesheet: string
  ) {}
  
  update(_delta: number): void {
    if (this.hasInitialized) return;
    this.hasInitialized = true;
    
    const scene = this.entity.scene;
    
    // Create animations once
    createNPCAnimations(scene, this.spritesheet);
    
    // Add AnimationComponent if needed
    if (!this.entity.get(AnimationComponent)) {
      this.entity.add(AnimationComponent, new AnimationComponent());
    }
    
    // Play initial animation
    const animKey = getNPCAnimKey(this.spritesheet, this.direction);
    AnimationSystem.getInstance().play(this.entity, animKey);
  }
  
  setDirection(direction: Direction): void {
    this.direction = direction;
    const animKey = getNPCAnimKey(this.spritesheet, this.direction);
    AnimationSystem.getInstance().play(this.entity, animKey);
  }
}
```

**Key Points**:
- Single responsibility: playback only
- Calls createNPCAnimations() once
- setDirection() updates direction and plays new animation
- Uses AnimationSystem for playback

## Component Design

### NPCEntity Factory

**Implementation**:
```typescript
export function createNPCEntity(
  scene: GameScene,
  data: {
    assets: string;
    col: number;
    row: number;
    direction: Direction;
    interactions: NPCInteraction[];
  }
): Entity {
  const entity = new Entity('npc');
  const grid = scene.grid;
  
  const transform = new TransformComponent(
    scene,
    data.col * grid.cellSize,
    data.row * grid.cellSize
  );
  entity.add(TransformComponent, transform);
  
  const sprite = new SpriteComponent(
    transform.sprite,
    `${data.assets}_spritesheet`,
    0
  );
  entity.add(SpriteComponent, sprite);
  
  const idle = new NPCIdleComponent(data.direction, data.assets);
  entity.add(NPCIdleComponent, idle);
  
  const interaction = new NPCInteractionComponent(
    data.interactions,
    data.col,
    data.row
  );
  entity.add(NPCInteractionComponent, interaction);
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    NPCIdleComponent,
    NPCInteractionComponent
  ]);
  
  return entity;
}
```

**Key Points**:
- Uses Direction enum (not Direction8)
- Uses grid.cellSize (not hardcoded constant)
- No collision components

### NPCInteractionComponent

**Implementation**:
```typescript
export class NPCInteractionComponent implements Component {
  entity!: Entity;
  private warnedNoValidInteractions = false;
  private warnedMultipleValid = false;
  
  constructor(
    private readonly interactions: NPCInteraction[],
    private readonly defaultCol: number,
    private readonly defaultRow: number
  ) {}
  
  getActiveInteraction(): { name: string; col: number; row: number } | null {
    const worldState = WorldStateManager.getInstance();
    const validInteractions: NPCInteraction[] = [];
    
    for (const interaction of this.interactions) {
      if (!interaction.whenFlagSet) {
        validInteractions.push(interaction);
        continue;
      }
      
      const condition = interaction.whenFlagSet;
      const isValid = worldState.isFlagCondition(
        condition.name,
        condition.condition,
        condition.value
      );
      
      if (isValid) validInteractions.push(interaction);
    }
    
    if (validInteractions.length > 1 && !this.warnedMultipleValid) {
      console.warn(`[NPC] Multiple valid interactions for ${this.entity.id}`);
      this.warnedMultipleValid = true;
    }
    
    if (validInteractions.length === 0 && !this.warnedNoValidInteractions) {
      console.warn(`[NPC] No valid interactions for ${this.entity.id}`);
      this.warnedNoValidInteractions = true;
    }
    
    if (validInteractions.length === 0) return null;
    
    const interaction = validInteractions[0];
    const col = interaction.position?.col ?? this.defaultCol;
    const row = interaction.position?.row ?? this.defaultRow;
    
    return { name: interaction.name, col, row };
  }
  
  isPlayerInRange(playerEntity: Entity, grid: Grid): boolean {
    const activeInteraction = this.getActiveInteraction();
    if (!activeInteraction) return false;
    
    const npcX = activeInteraction.col * grid.cellSize + grid.cellSize / 2;
    const npcY = activeInteraction.row * grid.cellSize + grid.cellSize / 2;
    
    const collision = playerEntity.get(CollisionComponent);
    if (!collision) return false;
    
    const transform = playerEntity.require(TransformComponent);
    const playerBoxCenterX = transform.x + collision.offsetX + collision.width / 2;
    const playerBoxCenterY = transform.y + collision.offsetY + collision.height / 2;
    
    const distance = Math.hypot(npcX - playerBoxCenterX, npcY - playerBoxCenterY);
    
    return distance <= 100;
  }
}
```

**Key Points**:
- Uses grid.cellSize parameter
- Warns once per NPC
- Returns first valid interaction

## NPCManager (with Caching)

**Implementation**:
```typescript
export class NPCManager {
  private static instance: NPCManager;
  private cachedClosestNPC: Entity | null = null;
  private lastPlayerCol = -1;
  private lastPlayerRow = -1;
  
  private constructor(private readonly scene: GameScene) {}
  
  static getInstance(scene?: GameScene): NPCManager {
    if (!NPCManager.instance && scene) {
      NPCManager.instance = new NPCManager(scene);
    }
    return NPCManager.instance;
  }
  
  getClosestInteractableNPC(playerEntity: Entity, grid: Grid): Entity | null {
    const gridPos = playerEntity.get(GridPositionComponent);
    if (!gridPos) return null;
    
    // Only recalculate if player moved to new cell
    if (gridPos.col === this.lastPlayerCol && gridPos.row === this.lastPlayerRow) {
      return this.cachedClosestNPC;
    }
    
    this.lastPlayerCol = gridPos.col;
    this.lastPlayerRow = gridPos.row;
    
    const npcs = this.scene.entityManager.getByType('npc');
    
    let closestNPC: Entity | null = null;
    let closestDistance = Infinity;
    
    for (const npc of npcs) {
      const interaction = npc.get(NPCInteractionComponent);
      if (!interaction) continue;
      
      if (!interaction.getActiveInteraction()) continue;
      if (!interaction.isPlayerInRange(playerEntity, grid)) continue;
      
      const npcTransform = npc.require(TransformComponent);
      const playerTransform = playerEntity.require(TransformComponent);
      const distance = Math.hypot(
        npcTransform.x - playerTransform.x,
        npcTransform.y - playerTransform.y
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNPC = npc;
      }
    }
    
    this.cachedClosestNPC = closestNPC;
    return closestNPC;
  }
}
```

**Key Points**:
- Caches result per player grid cell
- Only recalculates when player moves to new cell
- Filters valid interactions and range
- Returns closest by distance

## UI Integration

### AttackButtonComponent

```typescript
export class AttackButtonComponent implements Component {
  private currentIcon: 'punch' | 'lips' = 'punch';
  
  update(_delta: number): void {
    const npcManager = NPCManager.getInstance();
    const playerEntity = this.getPlayerEntity();
    const grid = this.scene.grid;
    const closestNPC = npcManager.getClosestInteractableNPC(playerEntity, grid);
    
    const newIcon = closestNPC ? 'lips' : 'punch';
    
    if (newIcon !== this.currentIcon) {
      this.currentIcon = newIcon;
      this.sprite.setTexture(newIcon === 'punch' ? 'punch_icon' : 'lips_icon');
    }
  }
}
```

### InputComponent

```typescript
export class InputComponent implements Component {
  private handleAttack(): void {
    const npcManager = NPCManager.getInstance();
    const grid = this.scene.grid;
    const closestNPC = npcManager.getClosestInteractableNPC(this.entity, grid);
    
    if (closestNPC) {
      const interaction = closestNPC.require(NPCInteractionComponent);
      const activeInteraction = interaction.getActiveInteraction();
      if (activeInteraction) {
        EventManager.getInstance().raiseEvent(activeInteraction.name);
      }
    } else {
      this.triggerPunch();
    }
  }
}
```

## Interaction Behavior

### NPC Look Command

**LuaRuntime Integration**:
```typescript
// Add to command types
type Command = 
  | { type: 'npcLook'; npcId: string; direction: Direction }
  | ... existing commands

// Expose to Lua
lua.global.set('npc', {
  look: (direction: string) => {
    const dir = directionFromString(direction);
    if (!dir) throw new Error(`Invalid direction: ${direction}`);
    commandQueue.push({ type: 'npcLook', npcId: stateData.npcId, direction: dir });
  }
});

// Execute command
case 'npcLook': {
  const npcEntity = scene.entityManager.getById(cmd.npcId);
  const idle = npcEntity?.get(NPCIdleComponent);
  if (idle) idle.setDirection(cmd.direction);
  break;
}
```

### Direction Calculation

**Expose dirFromDelta() to Lua**:
```typescript
import { dirFromDelta } from '../constants/Direction';

lua.global.set('calculateDirection', (fromCol: number, fromRow: number, toCol: number, toRow: number) => {
  const dx = toCol - fromCol;
  const dy = toRow - fromRow;
  return dirFromDelta(dx, dy);
});
```

**Lua Usage**:
```lua
local playerToNPC = calculateDirection(player.col, player.row, npc.col, npc.row)
local npcToPlayer = calculateDirection(npc.col, npc.row, player.col, player.row)

player.look(playerToNPC)
npc.look(npcToPlayer)
```

### InteractionState Integration

**Pass NPC ID**:
```typescript
// InteractionTriggerComponent
const npcId = this.entity.id;
this.scene.startInteraction(scriptContent, npcId);

// GameScene
startInteraction(scriptContent: string, npcId?: string): void {
  this.stateMachine.enter('interaction', { scriptContent, npcId });
}

// InteractionState
type InteractionStateData = {
  scriptContent: string;
  npcId?: string;
}
```

## Editor Integration

### NPCEditorState

**Purpose**: Place and configure NPCs in editor

**Features**:
- Click to place NPC
- Cycle through directions (D key)
- Configure interactions (I key)
- Delete NPC (Delete key)
- Visual direction indicator

**Implementation**:
```typescript
export class NPCEditorState implements IState {
  private selectedNPC: Entity | null = null;
  private currentDirection: Direction = Direction.Down;
  
  onEnter(): void {
    // Show NPC palette
    // Enable click to place
  }
  
  private placeNPC(col: number, row: number): void {
    const npc = createNPCEntity(this.scene, {
      assets: this.selectedAsset,
      col,
      row,
      direction: this.currentDirection,
      interactions: []
    });
    this.scene.entityManager.add(npc);
  }
  
  private cycleDirection(): void {
    // Cycle through 8 directions
    // Update selected NPC if any
  }
  
  private openInteractionDialog(): void {
    // Show UI to add/edit interactions
    // Configure whenFlagSet conditions
    // Set position overrides
  }
}
```

### Interaction Configuration UI

**Features**:
- Add/remove interactions
- Set interaction name
- Configure flag conditions
- Set position overrides
- Reorder priority

**Data Flow**:
```
NPCEditorState
  ↓ opens
InteractionConfigDialog
  ↓ modifies
NPCInteractionComponent.interactions
  ↓ saves to
Level JSON
```

## Testing Strategy

### Unit Tests
- NPCAnimations.createNPCAnimations() with 1 frame
- NPCAnimations.createNPCAnimations() with >1 frames
- NPCIdleComponent.setDirection()
- NPCInteractionComponent.getActiveInteraction() with conditions
- NPCManager caching behavior

### Integration Tests
- Place NPC in level
- Trigger interaction
- Face each other
- Position override
- Multiple NPCs in range

### Manual Tests
- Static sprite (1 frame)
- Animated sprite (>1 frames)
- Direction changes
- Flag conditions
- Editor placement
- Editor configuration
