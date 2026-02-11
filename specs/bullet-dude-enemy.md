# BulletDude Enemy Implementation Spec

## Overview
Add a bulletDude enemy that guards an area by rotating through directions, detects the player with FOV/line-of-sight, shoots bullets with limited ammo, overheats and chases the player during cooldown, and can be stunned by melee attacks.

## Difficulty Configuration

```typescript
export const BULLET_DUDE_DIFFICULTY_CONFIG = {
  easy: {
    health: 20,
    stunTime: 1000,
    lookDistance: 300,
    maxBullets: 8,
    aimAccuracy: 80,
    shootDelay: 200,
    overheatPeriod: 5000,
    bulletSpeed: 400,
    guardRotateSpeed: 600
  },
  medium: {
    health: 30,
    stunTime: 600,
    lookDistance: 500,
    maxBullets: 16,
    aimAccuracy: 40,
    shootDelay: 100,
    overheatPeriod: 4000,
    bulletSpeed: 500,
    guardRotateSpeed: 500
  },
  hard: {
    health: 60,
    stunTime: 300,
    lookDistance: 700,
    maxBullets: 24,
    aimAccuracy: 10,
    shootDelay: 50,
    overheatPeriod: 3000,
    bulletSpeed: 600,
    guardRotateSpeed: 400
  }
} as const;
```

## Assets

**Spritesheet:** `public/assets/player/player-spritesheet.png` (4 cols × 8 rows)
- Each row = 1 direction (idle + 3 walk frames)
- Column 0: Idle pose
- Columns 1-3: Walk animation (pingpong)
- Row order: Down, Up, Left, Right, UpLeft, UpRight, DownLeft, DownRight

**Projectile:** `public/assets/player/bullet_default.png` (already in AssetRegistry)

**Shell Casing:** `public/assets/player/bullet_default_shell.png` (already in AssetRegistry)

**Exclamation:** `public/assets/exclamation.png` (already in AssetRegistry)

**Particles:** `smoke`, `fire` (already in AssetRegistry)

## State Machine

### States
1. **Guard** - Rotates through 8 directions, checking FOV for player
2. **Alert** - Faces player, shows exclamation mark for 0.5s
3. **Shooting** - Fires bullets at player until ammo depleted
4. **Overheated** - Gun emits flames/smoke, pathfinds toward player
5. **Stunned** - Takes damage, knockback, brief pause
6. **Dying** - Alpha fade out over 1s, cannot be hit

### State Transitions
- Guard → Alert: Player detected in FOV
- Alert → Shooting: After 0.5s alert duration
- Shooting → Overheated: All bullets fired (maxBullets reached)
- Overheated → Shooting: Within lookDistance of player
- Overheated → Guard: Player too far away (lookDistance * 1.5)
- Any → Stunned: Takes damage and health > 0
- Stunned → Shooting: After stunTime duration
- Any → Dying: Health ≤ 0

## Components

### Core
- `TransformComponent` - Position, rotation, scale
- `SpriteComponent` - Player sprite (bulletDude uses player spritesheet)
- `AnimatedSpriteComponent` - Animation playback
- `ShadowComponent` - Shadow below bulletDude
- `GridPositionComponent` - Grid cell tracking
- `GridCollisionComponent` - Wall collision
- `HealthComponent` - HP tracking
- `HitFlashComponent` - Damage feedback
- `CollisionComponent` - Entity collision (takes damage from player melee)
- `StateMachineComponent` - State management
- `DifficultyComponent<BulletDudeDifficulty>` - Difficulty settings

### AI
- `LineOfSightComponent` - FOV detection (range: lookDistance, FOV: varies by direction)
- Custom overheat tracking (timer-based, not AmmoComponent)

## Guard State Logic

### Rotation Pattern
- Start facing Up (Direction.Up)
- Rotate clockwise: Up → UpRight → Right → DownRight → Down → DownLeft → Left → UpLeft → (repeat)
- Hold each direction for `guardRotateSpeed` ms (600/500/400 for easy/medium/hard)
- Use idle sprite for current direction

### FOV Detection
- Each direction has a specific FOV cone
- Use `LineOfSightComponent.canSeeTarget()` to check if player is visible
- `facingAngle` updates based on current guard direction
- `range` = `lookDistance` from difficulty config
- `fieldOfView` = appropriate cone for direction (e.g., π/4 radians for cardinal, wider for diagonals)

## Alert State Logic

- Duration: 500ms (fixed)
- Face player using `dirFromDelta()`
- Show idle sprite for facing direction
- Create exclamation sprite above head (same as RobotAlertState):
  - Offset Y: -120px initially
  - Rise to Y: -140px
  - Scale: 2
  - Depth: 3
  - Tween: Back.easeOut, 300ms duration
- Exclamation follows bulletDude position during alert
- Destroy exclamation on exit

## Shooting State Logic

### Bullet Firing
- Track bullets fired (0 to maxBullets)
- Fire at player position with `aimAccuracy` offset:
  ```typescript
  const offsetX = (Math.random() - 0.5) * 2 * aimAccuracy;
  const offsetY = (Math.random() - 0.5) * 2 * aimAccuracy;
  const targetX = playerX + offsetX;
  const targetY = playerY + offsetY;
  ```
- Delay between shots: `shootDelay` ms
- Face player continuously (update direction each frame)
- Use idle sprite for facing direction

### Shell Casing Emission
- Emit shell on each shot:
  ```typescript
  import { createShellCasingEntity } from "../ecs/entities/projectile/ShellCasingEntity";
  
  const shell = createShellCasingEntity(this.scene, x, y, direction, playerDirection);
  this.entityManager.add(shell);
  ```
- `direction`: 'left' or 'right' based on bulletDude facing
- `playerDirection`: bulletDude's current Direction enum value

### Bullet Entity
- Use existing bullet sprite (`bullet_default.png`)
- Speed: `bulletSpeed` from difficulty config (400/500/600 px/s)
- Damage: 10
- Max distance: 800px (reasonable range)
- Destroyed by walls
- Destroyed on player hit
- Use existing `ProjectileComponent` pattern

## Overheated State Logic

### Overheat Timer
- Track elapsed time since entering state
- Total duration: `overheatPeriod` ms from difficulty config
- **Flames phase**: 0 to overheatPeriod * 0.3 (30% of period)
- **Smoke phase**: overheatPeriod * 0.3 to overheatPeriod (70% of period)

### Particle Effects
- Get emitter position using `emitterOffsets` for current direction:
  ```typescript
  const emitterOffsets: Record<Direction, EmitterOffset> = {
    [Direction.Down]: { x: -16 * SPRITE_SCALE, y: 40 * SPRITE_SCALE },
    [Direction.Up]: { x: 10 * SPRITE_SCALE, y: -30 * SPRITE_SCALE },
    [Direction.Left]: { x: -51 * SPRITE_SCALE, y: 0 * SPRITE_SCALE },
    [Direction.Right]: { x: 43 * SPRITE_SCALE, y: 0 * SPRITE_SCALE },
    [Direction.UpLeft]: { x: -25 * SPRITE_SCALE, y: -25 * SPRITE_SCALE },
    [Direction.UpRight]: { x: 22 * SPRITE_SCALE, y: -20 * SPRITE_SCALE },
    [Direction.DownLeft]: { x: -35 * SPRITE_SCALE, y: 22 * SPRITE_SCALE },
    [Direction.DownRight]: { x: 29 * SPRITE_SCALE, y: 21 * SPRITE_SCALE },
    [Direction.None]: { x: 0, y: 0 },
  };
  ```
- **Fire particles** (flames phase):
  - Config: speed 80-150, angle 250-290, scale 0.05→0, alpha 1→0
  - Lifespan: 400ms, frequency: 20ms, quantity: 3
  - Tint: [0xffffff, 0xff8800, 0xff0000], blendMode: ADD
  - Depth: adjust based on facing (up = -1, else = 1001)
- **Smoke particles** (smoke phase):
  - Config: speed 50-100, angle 250-290, scale 6→0, alpha 1→0
  - Lifespan: 1000ms, frequency: 50ms, quantity: 2
  - Tint: 0xffffff
  - Depth: adjust based on facing (up = -1, else = 1000)

### Movement During Overheat
- Use pathfinding (same as SkeletonWalkState pattern)
- Target: player position
- Speed: Use a reasonable chase speed (e.g., 150 px/s, not from difficulty config)
- Play walk animation for current direction
- Recalculate path every 500ms
- **Transition to Shooting**: Distance to player ≤ lookDistance
- **Transition to Guard**: Distance to player > lookDistance * 1.5 (same hysteresis as skeleton)

## Stunned State Logic

### On Enter
- Apply knockback: 100px in direction of the hit (from projectile/punch direction)
- Use tween for smooth knockback animation (200ms duration, Quad.easeOut)
- Check for wall collision during knockback (don't move into walls)
- Activate `HitFlashComponent` for visual feedback
- Play idle sprite for current direction
- Set timer to `stunTime` ms from difficulty config

### During Stun
- No movement
- No rotation
- Just hold idle pose
- **Can be hit again**: If hit while stunned, `onEnter` is called directly to reset timer and apply new knockback (allows continuous stunning)

### On Exit
- Return to Shooting state (resume combat)

## Dying State Logic

- Duration: 1000ms
- Apply knockback: 100px in direction of the killing hit (same as stunned state)
- Alpha fade: 1.0 → 0.0 over 1s (linear tween)
- Disable collision (cannot be hit during death)
- Remove entity after fade completes
- No particle effects (simple fade with knockback)

## Level Data Structure

```typescript
export type LevelBulletDude = {
  col: number;
  row: number;
  difficulty: EnemyDifficulty; // 'easy' | 'medium' | 'hard'
  id?: string; // Optional - for spawner system
}

export type LevelData = {
  // ... existing fields
  bulletDudes?: LevelBulletDude[];
}
```

## Editor Integration

### Add Mode
- Button: "BulletDude" in `DefaultEditorState` (move all buttons up to fit)
- State: `AddBulletDudeEditorState`
- Ghost sprite follows mouse, snaps to grid
- Ghost shows Down idle pose (row 0, col 0 of player spritesheet)
- Click to place bulletDude at cell
- Difficulty selector: Easy/Medium/Hard buttons (same UI as skeleton)
- Default difficulty: easy

### Edit Mode
- State: `EditBulletDudeEditorState`
- Click bulletDude to edit
- UI panel shows difficulty buttons (Easy/Medium/Hard)
- Click bulletDude again to enter move mode
- ID input field for spawner integration

### Extraction
- `EditorScene.extractBulletDudes()` - Converts bulletDude entities to `LevelBulletDude[]`
- Called in `getCurrentLevelData()`
- Include in log output when clicking "Log" button

## Implementation Phases

### Phase 1: Basic Structure
- [ ] Add `LevelBulletDude` to `LevelData` in `LevelLoader.ts`
- [ ] Create `BulletDudeDifficulty` type and config file
- [ ] Ensure player spritesheet is in `AssetRegistry.ts` (already exists)

### Phase 2: BulletDude Entity
- [ ] Create `src/ecs/entities/bulletdude/BulletDudeEntity.ts` factory function
- [ ] Add all core components (transform, sprite, health, collision, etc.)
- [ ] Set up collision boxes (grid + entity, similar to skeleton)
- [ ] Configure update order
- [ ] Add shadow component
- [ ] Use player spritesheet with scale 2

### Phase 3: Animation System
- [ ] Create animation helper for player spritesheet (4x8 grid)
- [ ] Idle animations (col 0, all 8 rows)
- [ ] Walk animations (cols 1-3, all 8 rows, pingpong)
- [ ] Integrate with `AnimatedSpriteComponent`

### Phase 4: Guard State
- [ ] Create `BulletDudeGuardState` - rotation logic, FOV checks
- [ ] Implement clockwise rotation through 8 directions
- [ ] Add `LineOfSightComponent` with appropriate FOV per direction

### Phase 5: Alert State
- [ ] Create `BulletDudeAlertState` - exclamation, face player, 500ms duration
- [ ] Reuse exclamation sprite pattern from RobotAlertState

### Phase 6: Shooting State & Bullet Projectile
- [ ] Create `BulletDudeShootingState` - bullet firing, shell emission
- [ ] Implement aim accuracy offset calculation
- [ ] Create `BulletDudeBulletEntity.ts` factory (or reuse existing bullet entity)
- [ ] Emit shell casings on each shot
- [ ] Track bullets fired, transition to Overheated when maxBullets reached

### Phase 7: Overheated State
- [ ] Create `BulletDudeOverheatedState` - timer, particles, pathfinding
- [ ] Implement overheat timer with flames/smoke phases
- [ ] Create fire and smoke particle emitters
- [ ] Update emitter positions based on direction and emitterOffsets
- [ ] Implement pathfinding toward player (reuse Pathfinder)

### Phase 8: Stunned State
- [ ] Create `BulletDudeStunnedState` - knockback, hit flash, timer
- [ ] Implement 100px knockback with wall collision check
- [ ] Use tween for smooth knockback animation
- [ ] Activate `HitFlashComponent`

### Phase 9: Dying State
- [ ] Create `BulletDudeDyingState` - alpha fade, disable collision
- [ ] Implement 1s fade tween
- [ ] Remove entity after fade

### Phase 10: Editor Integration
- [ ] Create `AddBulletDudeEditorState` - ghost sprite, click to place
- [ ] Create `EditBulletDudeEditorState` - difficulty buttons, ID input, move mode
- [ ] Add "BulletDude" button to `DefaultEditorState` (move buttons up)
- [ ] Add click detection for bulletDude entities
- [ ] Implement `extractBulletDudes()` in `EditorScene`
- [ ] Add bulletDudes to log output

### Phase 11: Level Loading & Spawner Support
- [ ] Load bulletDudes from level JSON in `GameScene.spawnEntities()`
- [ ] Skip bulletDudes with IDs in game mode (spawner-only)
- [ ] Store ID on bulletDude entity for editor extraction

### Phase 12: Final Validation
- [ ] Run build + lint

## Constants

```typescript
// In BulletDudeEntity.ts
const BULLET_DUDE_SCALE = 2;
const BULLET_DUDE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const BULLET_DUDE_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const BULLET_DUDE_SHADOW_PROPS = { scale: 1.5, offsetX: 0, offsetY: 40 };

// In BulletDudeConstants.ts (shared)
const SPRITE_SCALE = 2;
const BULLET_EMIT_OFFSET_SCALE = 0.3;
// BULLET_DUDE_EMITTER_OFFSETS - shared between shooting and overheated states

// In BulletDudeAlertState.ts
const ALERT_DURATION_MS = 500;
const EXCLAMATION_OFFSET_Y_PX = -120;
const EXCLAMATION_RISE_Y_PX = -140;
const EXCLAMATION_SCALE = 2;
const EXCLAMATION_DEPTH = 3;
const EXCLAMATION_ANIMATION_DURATION_MS = 300;

// In BulletDudeOverheatedState.ts
const OVERHEAT_CHASE_SPEED_PX_PER_SEC = 75; // Half speed
const PATH_RECALC_INTERVAL_MS = 500;
const FLAMES_PHASE_RATIO = 0.3; // 30% flames, 70% smoke
const CHASE_STOP_MULTIPLIER = 1.5; // Same as skeleton

// In BulletDudeStunnedState.ts
const KNOCKBACK_DISTANCE_PX = 100;
const KNOCKBACK_DURATION_MS = 200;

// In BulletDudeDyingState.ts
const DEATH_FADE_DURATION_MS = 1000;
const KNOCKBACK_DISTANCE_PX = 100;
const KNOCKBACK_DURATION_MS = 200;

// In BulletDudeBulletEntity.ts
const BULLET_MAX_DISTANCE_PX = 800;
const BULLET_DAMAGE = 10;
const BULLET_SCALE = 1.125; // 0.75 of original 1.5

// In BulletDudeAnimations.ts
const WALK_ANIMATION_FPS = 4; // Half speed (was 8)
```

## Files to Create

```
src/ecs/entities/bulletdude/
├── BulletDudeEntity.ts
├── BulletDudeDifficulty.ts
├── BulletDudeGuardState.ts
├── BulletDudeAlertState.ts
├── BulletDudeShootingState.ts
├── BulletDudeOverheatedState.ts
├── BulletDudeStunnedState.ts
├── BulletDudeDyingState.ts
├── BulletDudeAnimations.ts
└── BulletDudeBulletEntity.ts (or reuse existing bullet entity)

src/editor/
├── AddBulletDudeEditorState.ts
└── EditBulletDudeEditorState.ts
```

## Files to Modify

```
src/systems/level/LevelLoader.ts - Add LevelBulletDude type
src/scenes/GameScene.ts - Load bulletDudes from level
src/editor/DefaultEditorState.ts - Add BulletDude button, move buttons up
src/editor/EditorScene.ts - Add extractBulletDudes(), bulletDude states, log output
```

## Notes

- BulletDude uses player spritesheet (4x8 grid: col 0 = idle, cols 1-3 = walk pingpong)
- Guard state rotates clockwise through 8 directions with FOV checks
- Shooting state fires bullets with accuracy offset, emits shell casings
- Overheated state shows flames (30%) then smoke (70%), pathfinds toward player
- Stunned state applies 100px knockback with wall collision check
- Dying state is simple alpha fade (no particles)
- Editor defaults to easy difficulty, Down idle pose for ghost
- Spawner support via optional ID field
- Only takes damage from player melee (not bullets)
- Only damages player with bullets (not contact)
