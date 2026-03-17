# Pet System - Design

## Architecture Overview

```
PetManager (singleton)
├── Tracks collected pets (from WorldState flags)
├── Tracks selected pet
├── Spawns/despawns pet entities
├── Handles swap animations
└── Notifies HUD of changes

PetEntity (per active pet)
├── TransformComponent (world position)
├── SpriteComponent (pet spritesheet)
├── AnimationComponent (idle/walk anims)
└── PetFollowComponent (pathfinding + state)

HUD (JoystickEntity additions)
├── PetCarouselComponent (icon rotation)
└── PetActionButtonComponent (ability trigger + cooldown)

Player (modifications)
├── PetAbilityComponent (replaces SlideAbilityComponent)
└── InputComponent.isPetActionPressed() (replaces isSlidePressed)
```

## Prerequisite Refactors

### Refactor 1: Remove SlideAbilityComponent from Player

**Current problem:** The H key and slide ability occupy the action slot we need for pets. Slide is tightly coupled into PlayerIdleState, PlayerWalkState, PlayerStateHelpers, and the update order.

**Why it matters:** Pet ability needs to replace slide cleanly. Leaving slide in creates dead code and confusion.

**Proposed solution:**
1. Remove `SlideAbilityComponent` from `PlayerEntity.ts` factory
2. Remove slide animations from player animation map
3. Replace `handleSlideInput()` in `PlayerStateHelpers.ts` with `handlePetAbilityInput()`
4. Update `PlayerIdleState` and `PlayerWalkState` to use new helper
5. Replace `isSlidePressed()` in `InputComponent` with `isPetActionPressed()`
6. Remove `SlideAbilityComponent` from update order

**Time estimate:** 1 hour
**Confidence:** 95% — straightforward removal and replacement

## Data Structures

### Pet Registry (Static Config)

```typescript
type PetConfig = {
  readonly id: string;                    // 'rock' | 'dog'
  readonly spritesheet: string;           // 'rock_spritesheet' | 'dog_spritesheet'
  readonly frameWidth: number;            // 48 | 32
  readonly frameHeight: number;           // 48 | 32
  readonly scale: number;                 // display scale
  readonly directions: 4 | 8;            // rock=4, dog=8
  readonly idleAnim: string;             // 'breathing-idle'
  readonly walkAnim: string;             // 'walking' | 'walk'
  readonly abilityCooldownMs: number;    // per-pet cooldown
  readonly worldStateFlag: string;       // 'pet_rock_collected'
  readonly iconTexture: string;          // 'rock_pet_icon' | 'dog_pet_icon'
}

const PET_REGISTRY: Record<string, PetConfig> = {
  rock: {
    id: 'rock',
    spritesheet: 'rock_spritesheet',
    frameWidth: 48,
    frameHeight: 48,
    scale: 1.5,
    directions: 4,
    idleAnim: 'breathing-idle',
    walkAnim: 'walking',
    abilityCooldownMs: 5000,
    worldStateFlag: 'pet_rock_collected',
    iconTexture: 'rock_pet_icon',
  },
  dog: {
    id: 'dog',
    spritesheet: 'dog_spritesheet',
    frameWidth: 32,
    frameHeight: 32,
    scale: 2,
    directions: 8,
    idleAnim: 'breathing-idle',
    walkAnim: 'walk',
    abilityCooldownMs: 3000,
    worldStateFlag: 'pet_dog_collected',
    iconTexture: 'dog_pet_icon',
  },
};
```

### Direction Mapping (4-dir pets)

Rock only has 4 directions. We need to map the 8-direction `Direction` enum to the 4 metadata direction names:

```typescript
const DIR_8_TO_4: Record<Direction, string> = {
  [Direction.Right]: 'west',  // Sprite images have east/west swapped
  [Direction.UpRight]: 'north',
  [Direction.Up]: 'north',
  [Direction.UpLeft]: 'east',
  [Direction.Left]: 'east',
  [Direction.DownLeft]: 'south',
  [Direction.Down]: 'south',
  [Direction.DownRight]: 'west',
  [Direction.None]: 'south',
};

const DIR_8_TO_8: Record<Direction, string> = {
  [Direction.Right]: 'east',
  [Direction.UpRight]: 'north-east',
  [Direction.Up]: 'north',
  [Direction.UpLeft]: 'north-west',
  [Direction.Left]: 'west',
  [Direction.DownLeft]: 'south-west',
  [Direction.Down]: 'south',
  [Direction.DownRight]: 'south-east',
  [Direction.None]: 'south',
};
```

## Component Design

### PetAnimations.ts

**Purpose**: Create Phaser animations from spritesheet metadata, following the puma pattern.

The metadata JSON files define frame ranges per animation per direction. We read these at runtime and create `Animation` objects (our custom system, not Phaser's `anims`).

```typescript
// Builds a Map<string, Animation> from metadata
// Keys: 'idle_south', 'walk_east', etc.
export function createPetAnimationMap(
  metadata: PetSpritesheetMetadata,
  config: PetConfig
): Map<string, Animation> {
  const animMap = new Map<string, Animation>();
  const dirMap = config.directions === 4 ? DIR_8_TO_4 : DIR_8_TO_8;

  // For each Direction enum value, create idle and walk animations
  for (const dir of ALL_DIRECTIONS) {
    const metaDir = dirMap[dir];
    
    // Idle
    const idleData = metadata.animations[config.idleAnim][metaDir];
    const idleFrames = rangeToFrameStrings(idleData.start, idleData.end);
    animMap.set(`idle_${dir}`, new Animation(idleFrames, 'repeat', 0.125));

    // Walk
    const walkData = metadata.animations[config.walkAnim][metaDir];
    const walkFrames = rangeToFrameStrings(walkData.start, walkData.end);
    animMap.set(`walk_${dir}`, new Animation(walkFrames, 'repeat', 0.1));
  }

  return animMap;
}
```

**Key insight**: We use our own `AnimationSystem` (frame index strings) rather than Phaser's `scene.anims`. This matches how the player entity works and avoids global animation namespace pollution.

### PetFollowComponent

**Purpose**: Smooth following behavior with direct movement and pathfinding fallback.

**Movement Strategy:**
- **Direct movement** when player <200px away (smooth, no grid snapping)
- **Pathfinding** when player >200px away (navigates obstacles)
- **Delta-based velocity** at 300px/sec for smooth motion
- Never snaps to grid positions

**Behavior:**
- Stops within 128px and plays idle
- Teleports if >800px away
- Detects player water state and hides pet (alpha=0)
- Plays walk animation when following, idle when stopped

**Constants:**
```typescript
const FOLLOW_SPEED_PX_PER_SEC = 300;
const STOP_DISTANCE_PX = 128;
const TELEPORT_DISTANCE_PX = 800;
const ABILITY_DISABLE_DISTANCE_PX = 250;
const PATH_RECALC_MS = 1000;
const USE_PATHFINDING_DISTANCE_PX = 200;
```

```typescript
export class PetFollowComponent implements Component {
  entity!: Entity;
  
  // State
  private isFollowing = false;
  private isTooFar = false;
  private isHidden = false;  // in water or swapping
  
  // Pathfinding
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  
  constructor(
    private readonly grid: Grid,
    private readonly playerEntity: Entity,
    private readonly config: PetConfig
  ) {}
  
  update(delta: number): void {
    if (this.isHidden) return;
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distancePx = Math.hypot(dx, dy);
    
    // Teleport if too far
    if (distancePx > TELEPORT_DISTANCE_PX) {
      transform.x = playerTransform.x;
      transform.y = playerTransform.y;
      this.isFollowing = false;
      this.path = null;
      anim.animationSystem.play(`idle_${this.currentDirection}`);
      return;
    }
    
    // Close enough — idle
    if (distancePx <= STOP_DISTANCE_PX) {
      if (this.isFollowing) {
        this.isFollowing = false;
        const faceDir = dirFromDelta(dx, dy);
        if (faceDir !== Direction.None) this.currentDirection = faceDir;
        anim.animationSystem.play(`idle_${this.currentDirection}`);
      }
      return;
    }
    
    // Pathfind toward player
    this.isFollowing = true;
    this.pathRecalcTimerMs += delta;
    
    if (!this.path || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePath();
      this.pathRecalcTimerMs = 0;
    }
    
    this.moveAlongPath(delta, transform, anim);
  }
  
  private recalculatePath(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const goalCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    
    const pathfinder = new Pathfinder(this.grid);
    const startCellData = this.grid.getCell(startCell.col, startCell.row);
    const currentLayer = startCellData?.layer ?? 0;
    
    this.path = pathfinder.findPath(
      startCell.col, startCell.row,
      goalCell.col, goalCell.row,
      currentLayer, true, true
    );
    this.currentPathIndex = 0;
  }
  
  private moveAlongPath(delta: number, transform: TransformComponent, anim: AnimationComponent): void {
    if (!this.path || this.currentPathIndex >= this.path.length) {
      // No path — move directly toward player
      const playerTransform = this.playerEntity.require(TransformComponent);
      this.moveToward(transform, playerTransform.x, playerTransform.y, delta, anim);
      return;
    }
    
    const target = this.path[this.currentPathIndex];
    const targetX = target.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = target.row * this.grid.cellSize + this.grid.cellSize / 2;
    
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < WAYPOINT_THRESHOLD_PX) {
      this.currentPathIndex++;
      return;
    }
    
    this.moveToward(transform, targetX, targetY, delta, anim);
  }
  
  private moveToward(
    transform: TransformComponent,
    targetX: number, targetY: number,
    delta: number, anim: AnimationComponent
  ): void {
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);
    
    const moveDist = FOLLOW_SPEED_PX_PER_SEC * (delta / 1000);
    
    if (moveDist >= dist) {
      transform.x = targetX;
      transform.y = targetY;
    } else {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    }
    
    const newDir = dirFromDelta(dx, dy);
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
      anim.animationSystem.play(`walk_${this.currentDirection}`);
    } else if (!this.isFollowing) {
      anim.animationSystem.play(`walk_${this.currentDirection}`);
    }
  }
  
  getIsTooFar(): boolean { 
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distancePx = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    return distancePx > ABILITY_DISABLE_DISTANCE_PX;
  }
  getIsHidden(): boolean { return this.isHidden; }
  setHidden(hidden: boolean): void { this.isHidden = hidden; }
}
```

**Constants**:
```typescript
const FOLLOW_SPEED_PX_PER_SEC = 300;
const STOP_DISTANCE_PX = 128;  // Pet tries to stay within this distance
const TELEPORT_DISTANCE_PX = 800;  // Teleport if farther than this
const ABILITY_DISABLE_DISTANCE_PX = 250;  // Disable ability if farther than this
const PATH_RECALC_MS = 500;
const WAYPOINT_THRESHOLD_PX = 8;
```

### PetEntity Factory

```typescript
export function createPetEntity(
  scene: Phaser.Scene,
  grid: Grid,
  playerEntity: Entity,
  config: PetConfig,
  metadata: PetSpritesheetMetadata,
  startX: number,
  startY: number
): Entity {
  const entity = new Entity('pet');
  entity.tags.add('pet');
  
  const transform = entity.add(new TransformComponent(startX, startY, 0, config.scale));
  const sprite = entity.add(new SpriteComponent(scene, config.spritesheet, transform));
  sprite.sprite.setDepth(Depth.player - 1);
  
  const animMap = createPetAnimationMap(metadata, config);
  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  entity.add(new AnimationComponent(animSystem, sprite));
  
  entity.add(new PetFollowComponent(grid, playerEntity, config));
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    PetFollowComponent,
    AnimationComponent,
  ]);
  
  return entity;
}
```

### PetManager (Singleton)

**Purpose**: Central coordinator for pet lifecycle, selection, and HUD communication.

```typescript
export class PetManager {
  private static instance: PetManager;
  private activePetEntity: Entity | null = null;
  private selectedPetId: string | null = null;
  private collectedPets: string[] = [];
  private isSwapping = false;
  
  static getInstance(): PetManager { ... }
  
  // Called in GameScene.create() after player spawns
  initialize(scene: GameScene, grid: Grid, playerEntity: Entity): void {
    this.refreshCollectedPets();
    const selected = this.getSelectedPetId();
    if (selected) {
      this.spawnPet(scene, grid, playerEntity, selected);
    }
  }
  
  // Read WorldState flags
  refreshCollectedPets(): void {
    const ws = WorldStateManager.getInstance();
    this.collectedPets = [];
    for (const [id, config] of Object.entries(PET_REGISTRY)) {
      if (ws.isFlagCondition(config.worldStateFlag, 'eq', 'true')) {
        this.collectedPets.push(id);
      }
    }
  }
  
  getSelectedPetId(): string | null {
    const ws = WorldStateManager.getInstance();
    const selected = ws.getState().flags['pet_selected'];
    if (selected && this.collectedPets.includes(selected)) {
      return selected;
    }
    return this.collectedPets.length > 0 ? this.collectedPets[0] : null;
  }
  
  // Cycle selection
  selectNext(): void { ... }
  selectPrevious(): void { ... }
  
  // Spawn/despawn
  private async spawnPet(scene, grid, playerEntity, petId): Promise<void> { ... }
  private despawnPet(scene): void { ... }
  
  // Water interaction
  hidePet(scene: Phaser.Scene): void {
    // Tween pet up and fade out
    if (!this.activePetEntity) return;
    const sprite = this.activePetEntity.require(SpriteComponent);
    const follow = this.activePetEntity.require(PetFollowComponent);
    follow.setHidden(true);
    scene.tweens.add({
      targets: sprite.sprite,
      y: sprite.sprite.y - 200,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
    });
  }
  
  showPet(scene: Phaser.Scene, playerEntity: Entity): void {
    // Tween pet down from above player
    if (!this.activePetEntity) return;
    const transform = this.activePetEntity.require(TransformComponent);
    const playerTransform = playerEntity.require(TransformComponent);
    const sprite = this.activePetEntity.require(SpriteComponent);
    const follow = this.activePetEntity.require(PetFollowComponent);
    
    transform.x = playerTransform.x;
    transform.y = playerTransform.y - 200;
    sprite.sprite.setAlpha(0);
    
    scene.tweens.add({
      targets: sprite.sprite,
      y: playerTransform.y,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => { follow.setHidden(false); }
    });
  }
  
  getActivePetEntity(): Entity | null { return this.activePetEntity; }
  getCollectedPets(): string[] { return this.collectedPets; }
  isActive(): boolean { return this.activePetEntity !== null && !this.isSwapping; }
}
```

### PetAbilityComponent (Replaces SlideAbilityComponent)

```typescript
export class PetAbilityComponent implements Component {
  entity!: Entity;
  private cooldownMs = 0;
  
  update(delta: number): void {
    if (this.cooldownMs > 0) {
      this.cooldownMs -= delta;
    }
  }
  
  tryAbility(): boolean {
    const petManager = PetManager.getInstance();
    if (!petManager.isActive()) return false;
    
    // Check if player is punching
    const punch = this.entity.get(PunchComponent);
    if (punch?.isActive()) return false;
    
    // Check if player is swimming
    const water = this.entity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return false;
    
    // Check if pet is too far
    const follow = petManager.getActivePetEntity()?.get(PetFollowComponent);
    if (follow?.getIsTooFar()) return false;
    
    const config = PET_REGISTRY[petManager.getSelectedPetId()!];
    if (this.cooldownMs > 0) return false;
    
    this.cooldownMs = config.abilityCooldownMs;
    console.log(`[PET] ${config.id} ability activated!`);
    return true;
  }
  
  canUseAbility(): boolean {
    if (this.cooldownMs > 0) return false;
    
    const petManager = PetManager.getInstance();
    if (!petManager.isActive()) return false;
    
    const punch = this.entity.get(PunchComponent);
    if (punch?.isActive()) return false;
    
    const water = this.entity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return false;
    
    const follow = petManager.getActivePetEntity()?.get(PetFollowComponent);
    if (follow?.getIsTooFar()) return false;
    
    return true;
  }
  
  getCooldownRatio(): number {
    const petManager = PetManager.getInstance();
    const petId = petManager.getSelectedPetId();
    if (!petId) return 1;
    const config = PET_REGISTRY[petId];
    if (this.cooldownMs <= 0) return 1;
    return 1 - (this.cooldownMs / config.abilityCooldownMs);
  }
}
```

### PetCarouselComponent (HUD)

**Purpose**: Shows selected pet icon with scroll arrows for cycling

**Layout**:
- Single pet icon at top-center of screen
- Left/right arrow buttons flanking the icon
- Arrows only visible if player has > 1 pet collected

**Behavior**:
- Shows icon for currently selected pet
- Clicking left arrow: cycles to previous pet, old icon slides left off-screen, new icon slides in from right
- Clicking right arrow: cycles to next pet, old icon slides right off-screen, new icon slides in from left
- Slide animation duration: 200ms
- Arrows hidden if only 1 pet collected

**Controls**:
- Left/right arrow sprites at top of screen
- Touch or click to cycle

### PetActionButtonComponent (HUD)

**Purpose**: Replaces the slide icon. Shows pet-specific icon with cooldown overlay.

**Behavior**:
- Positioned same as slide button (75% camera width, 85% camera height)
- Shows icon for currently selected pet
- Cooldown overlay: alpha 0.2 during cooldown, 0.4 unpressed, 0.9 pressed
- Fades to 0.2 when disabled (punching, swimming, or pet > 250px from player)
- Touch triggers `PetAbilityComponent.tryAbility()`
- For now: logs `[PET] <petName> ability activated!`

**Acceptance Criteria**:
- Icon matches selected pet
- Alpha states work correctly
- Disabled when punching, swimming, or pet too far
- Console log on activation

## Integration Points

### GameScene.create()

After player entity is created:
```typescript
const petManager = PetManager.getInstance();
petManager.initialize(this, this.grid, playerEntity);
```

### GameScene update (via InGameState)

PetManager's active entity is added to `entityManager`, so it updates automatically.

### Water Detection

In `PlayerWalkState` / `PlayerIdleState`, when player enters water:
```typescript
const water = this.entity.get(WaterEffectComponent);
if (water?.getIsInWater()) {
  PetManager.getInstance().hidePet(scene);
}
```

When player exits water:
```typescript
if (!water?.getIsInWater() && petWasHidden) {
  PetManager.getInstance().showPet(scene, this.entity);
}
```

### Level Transitions

In `GameScene.create()`, `PetManager.initialize()` handles respawning the pet at the player's new position. The pet entity from the previous level is destroyed with the old `EntityManager`.

### Interaction Pause

During interactions (`scene.isInInteraction`), the pet entity will be paused along with all other entities (EntityManager already handles this). No special handling needed.

## Asset Loading

Pet assets are always loaded (they're small: rock ~6KB, dog ~18KB). Add to core asset groups so they're available on every level.

```typescript
// AssetRegistry.ts
ASSET_GROUPS: {
  pets: {
    rock_spritesheet: { path: 'pets/rock/rock_spritesheet.png', frameWidth: 48, frameHeight: 48 },
    dog_spritesheet: { path: 'pets/dog/dog_spritesheet.png', frameWidth: 32, frameHeight: 32 },
    rock_pet_icon: { path: 'pets/rock/rock_icon.png' },
    dog_pet_icon: { path: 'pets/dog/dog_icon.png' },
  }
}
```

Metadata JSON files are fetched at runtime when spawning a pet (cached after first load).

## Error Handling

- Missing pet spritesheet: Log error, don't spawn pet
- Missing metadata: Log error, don't spawn pet
- No collected pets: Carousel hidden, no pet spawned
- Invalid pet_selected flag: Fall back to first collected pet

## Performance Considerations

- Pathfinder runs every 500ms per pet (negligible)
- One additional entity with 4 components (negligible)
- Metadata JSON fetched once and cached
- Pet sprites are small (6-18KB)
- Carousel icons are static images (no animation overhead)
