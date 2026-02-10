# Skeleton Enemy Implementation Spec

## Overview
Add a skeleton enemy that walks toward the player using pathfinding, stops periodically to idle, and throws bone projectiles when in range.

## Difficulty Configuration

```typescript
export const SKELETON_DIFFICULTY_CONFIG = {
  easy: {
    health: 60,
    speedPxPerSec: 90,
    attackRangePx: 250,
    attackCooldownMs: 3000
  },
  medium: {
    health: 90,
    speedPxPerSec: 130,
    attackRangePx: 300,
    attackCooldownMs: 2000
  },
  hard: {
    health: 120,
    speedPxPerSec: 170,
    attackRangePx: 400,
    attackCooldownMs: 1500
  }
} as const;
```

## Assets

**Spritesheet:** `public/assets/skeleton/skeleton-spritesheet.png` (48x48 frames, 6 cols × 28 rows)
- Idle: Rows 0-7 (1 frame, 8 directions)
- Walk: Rows 8-15 (4 frames, 8 directions)
- Jab: Rows 16-23 (3 frames, 8 directions)

**Projectile:** `public/assets/skeleton/bone-small.png`

## State Machine

### States
1. **Idle** - Standing still, plays idle animation
2. **Walk** - Pathfinding toward player, plays walk animation
3. **Attack** - Stops moving, plays jab animation, throws bone
4. **Hit** - Takes damage, applies knockback, plays hit flash
5. **Death** - Explodes into bone particles

### State Transitions
- Idle → Walk: After random duration (500-1000ms)
- Walk → Idle: Every 3-5 seconds for ~500ms (random)
- Walk → Attack: Player in range and cooldown ready
- Attack → Walk: Attack animation complete
- Any → Hit: Takes damage
- Hit → Walk: After hit duration (300ms)
- Any → Death: Health ≤ 0

## Components

### Core
- `TransformComponent` - Position, rotation, scale
- `SpriteComponent` - Skeleton sprite
- `AnimatedSpriteComponent` - Animation playback
- `ShadowComponent` - Shadow below skeleton
- `GridPositionComponent` - Grid cell tracking
- `GridCollisionComponent` - Wall collision
- `HealthComponent` - HP tracking
- `HitFlashComponent` - Damage feedback
- `KnockbackComponent` - Knockback on hit
- `CollisionComponent` - Entity collision (takes damage from player projectiles)
- `DamageComponent` - Damage dealt to player on contact
- `StateMachineComponent` - State management
- `DifficultyComponent<SkeletonDifficulty>` - Difficulty settings

### AI
- `PathfindingComponent` - A* pathfinding to player (8-direction)
- `AttackCooldownComponent` - Tracks time between attacks

## Bone Projectile

### Properties
- Speed: 250 px/s
- Max distance: 400px
- Damage: 10
- Rotation: Clockwise if dirX > 0, counter-clockwise if dirX < 0
- Destroyed by walls
- Destroyed on player hit

### Components
- `TransformComponent`
- `SpriteComponent` (bone-small texture)
- `ProjectileComponent` (handles movement, wall collision, max distance)
- `CollisionComponent` (damages player on hit)
- `DamageComponent` (10 damage)
- `RotatingProjectileComponent` (rotates sprite based on direction)

## Death Particle Effect

When skeleton dies:
1. Create 8-12 bone particles at skeleton position
2. Each bone flies outward in random direction (biased toward damage direction)
3. Bones rotate while flying
4. Bones fade out over 800ms
5. Use `bone-small.png` texture

## Level Data Structure

```typescript
export type LevelSkeleton = {
  col: number;
  row: number;
  difficulty: SkeletonDifficulty;
  id?: string; // Optional - for spawner system
}

export type LevelData = {
  // ... existing fields
  skeletons?: LevelSkeleton[];
}
```

## Editor Integration

### Add Mode
- Button: "Skeleton" in `DefaultEditorState`
- State: `AddSkeletonEditorState`
- Ghost sprite follows mouse, snaps to grid
- Click to place skeleton at cell
- Default difficulty: easy

### Edit Mode
- State: `EditSkeletonEditorState`
- Click skeleton to edit
- UI panel shows difficulty buttons (Easy/Medium/Hard)
- Click skeleton again to enter move mode
- ID input field for spawner integration

### Extraction
- `EditorScene.extractSkeletons()` - Converts skeleton entities to `LevelSkeleton[]`
- Called in `getCurrentLevelData()`

## Implementation Phases

### Phase 1: Basic Structure
- [ ] Register skeleton assets in `AssetRegistry.ts`
- [ ] Add to `AssetLoader.ts` default assets
- [ ] Create `SkeletonDifficulty` type and config
- [ ] Create `DifficultyComponent<SkeletonDifficulty>`
- [ ] Add `LevelSkeleton` to `LevelData` in `LevelLoader.ts`

### Phase 2: Skeleton Entity
- [ ] Create `src/skeleton/SkeletonEntity.ts` factory function
- [ ] Add all core components (transform, sprite, health, collision, etc.)
- [ ] Set up collision boxes (grid + entity)
- [ ] Configure update order
- [ ] Add shadow component

### Phase 3: Animation System
- [ ] Create animation helper for skeleton spritesheet
- [ ] Idle animation (1 frame per direction)
- [ ] Walk animation (4 frames per direction)
- [ ] Jab animation (3 frames per direction)
- [ ] Integrate with `AnimatedSpriteComponent`

### Phase 4: State Machine - Idle & Walk
- [ ] Create `SkeletonIdleState` - plays idle animation, random duration
- [ ] Create `SkeletonWalkState` - pathfinding, walk animation, periodic idle pauses
- [ ] Implement random idle pauses (3-5 sec intervals, 500ms duration)
- [ ] Test pathfinding and movement

### Phase 5: Attack State & Bone Projectile
- [ ] Create `SkeletonAttackState` - stops moving, plays jab, throws bone
- [ ] Create `BoneProjectileEntity.ts` factory
- [ ] Create `RotatingProjectileComponent` - rotates sprite based on direction
- [ ] Implement attack range check (from difficulty config)
- [ ] Implement attack cooldown
- [ ] Test bone throwing and collision

### Phase 6: Hit & Death States
- [ ] Create `SkeletonHitState` - knockback, hit flash, return to walk
- [ ] Create `SkeletonDeathState` - bone particle explosion
- [ ] Implement death particle effect (8-12 bones, random directions, fade out)
- [ ] Test damage and death

### Phase 7: Editor Integration
- [ ] Create `AddSkeletonEditorState` - ghost sprite, click to place
- [ ] Create `EditSkeletonEditorState` - difficulty buttons, ID input, move mode
- [ ] Add "Skeleton" button to `DefaultEditorState`
- [ ] Add click detection for skeleton entities
- [ ] Implement `extractSkeletons()` in `EditorScene`

### Phase 8: Level Loading & Spawner Support
- [ ] Load skeletons from level JSON in `GameScene.spawnEntities()`
- [ ] Skip skeletons with IDs in game mode (spawner-only)
- [ ] Store ID on skeleton entity for editor extraction
- [ ] Test save/load cycle
- [ ] Test spawner integration

### Phase 9: Manual Testing
- [ ] Test all difficulty levels in-game
- [ ] Test pathfinding around walls
- [ ] Test attack range and cooldown
- [ ] Test bone projectile collision
- [ ] Test death particle effect
- [ ] Test editor placement and editing
- [ ] Test save/load with IDs
- [ ] Run build + lint

## Constants

```typescript
// In SkeletonEntity.ts
const SKELETON_SCALE = 2;
const SKELETON_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const SKELETON_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const SKELETON_SHADOW_PROPS = { scale: 1.5, offsetX: 0, offsetY: 40 };
const SKELETON_KNOCKBACK_FRICTION = 0.88;
const SKELETON_KNOCKBACK_FORCE_PX = 400;
const HIT_DURATION_MS = 300;
const IDLE_MIN_DURATION_MS = 500;
const IDLE_MAX_DURATION_MS = 1000;
const WALK_IDLE_PAUSE_MIN_MS = 3000;
const WALK_IDLE_PAUSE_MAX_MS = 5000;
const WALK_IDLE_PAUSE_DURATION_MS = 500;

// In BoneProjectileEntity.ts
const BONE_SPEED_PX_PER_SEC = 250;
const BONE_MAX_DISTANCE_PX = 400;
const BONE_DAMAGE = 10;
const BONE_SCALE = 1.5;
const BONE_ROTATION_SPEED_DEG_PER_SEC = 360;

// In SkeletonDeathState.ts
const DEATH_PARTICLE_COUNT_MIN = 8;
const DEATH_PARTICLE_COUNT_MAX = 12;
const DEATH_PARTICLE_SPEED_MIN_PX_PER_SEC = 100;
const DEATH_PARTICLE_SPEED_MAX_PX_PER_SEC = 200;
const DEATH_PARTICLE_LIFESPAN_MS = 800;
```

## Files to Create

```
src/skeleton/
├── SkeletonEntity.ts
├── SkeletonIdleState.ts
├── SkeletonWalkState.ts
├── SkeletonAttackState.ts
├── SkeletonHitState.ts
├── SkeletonDeathState.ts
└── BoneProjectileEntity.ts

src/ecs/components/
└── visual/RotatingProjectileComponent.ts

src/editor/
├── AddSkeletonEditorState.ts
└── EditSkeletonEditorState.ts
```

## Files to Modify

```
src/assets/AssetRegistry.ts - Register skeleton + bone assets
src/assets/AssetLoader.ts - Add to default assets
src/systems/level/LevelLoader.ts - Add LevelSkeleton type
src/scenes/GameScene.ts - Load skeletons from level
src/editor/DefaultEditorState.ts - Add Skeleton button
src/editor/EditorScene.ts - Add extractSkeletons(), skeleton states
src/ecs/index.ts - Export RotatingProjectileComponent
```

## Notes

- Skeleton uses 8-direction pathfinding (diagonal movement allowed)
- Random idle pauses add unpredictability to movement
- Attack range varies by difficulty (250/300/400px)
- Bone rotation direction based on throw direction (clockwise right, counter-clockwise left)
- Death particle effect uses same bone texture as projectile
- Editor defaults to easy difficulty
- Spawner support via optional ID field
