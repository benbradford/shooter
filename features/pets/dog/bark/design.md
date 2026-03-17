# Dog Bark Ability - Design

## Architecture Overview

```
PetAbilityComponent (player entity)
  ↓ tryAbility()
DogBarkAbility (new, on pet entity)
  ↓ manages bark sequence
PetFollowComponent (modified)
  ↓ bark mode: walk to target, then bark
AnimationComponent
  ↓ plays bark_${direction} animation
FearComponent (new, added to each affected enemy)
  ↓ manages fear icon + timer
EnemyFearState (new, shared IState)
  ↓ flee movement away from source
```

## Data Flow

### Bark Activation
```
1. Player presses H / touches action button
2. PetAbilityComponent.tryAbility()
3. If dog selected → DogBarkAbility.activate()
4. DogBarkAbility finds nearest enemy within 400px of dog
5. Sets PetFollowComponent.isBarking = true
6. Dog walks toward enemy (direct movement, 300px/sec)
7. When within 100px → DogBarkAbility.executeBark()
8. Bark animation plays ('once', ~600ms)
9. At bark start → apply fear to enemies within 600px
10. After animation completes → resume follow mode
```

### Fear Application
```
1. DogBarkAbility gets all entities with 'enemy' tag
2. Filter: within 600px of dog, not bugbase entity ID, not destroyed
3. For each affected enemy:
   a. If already has FearComponent → resetTimer()
   b. Else → add FearComponent + enter 'fear' state
   c. HitFlashComponent.flash(150) with white tint
4. Bark wave graphic expands from dog position
```

## Component Design

### DogBarkAbility

**Purpose**: Manages the bark sequence on the pet entity.

**States**: `idle` | `approaching` | `barking`

```typescript
const ENEMY_DETECT_RANGE_PX = 400;
const BARK_RANGE_PX = 100;
const FEAR_RADIUS_PX = 600;
const FEAR_DURATION_MS = 4000;
const BARK_ANIM_DURATION_MS = 600;
const APPROACH_SPEED_PX_PER_SEC = 300;
const FEAR_SPEED_MULTIPLIER = 1.2;
const FEAR_DIRECTION_JITTER_RAD = 0.26; // ~15 degrees
```

**Key Design Decisions**:
- Lives on the **pet entity**, not the player
- Controls pet movement during approach (overrides PetFollowComponent via `isBarking` flag)
- Fear applied at the start of bark animation (not midpoint — simpler, more responsive)
- If target dies mid-approach, dog aborts and returns to follow mode

**Implementation**:
```typescript
export class DogBarkAbility implements Component {
  entity!: Entity;
  private state: 'idle' | 'approaching' | 'barking' = 'idle';
  private targetEntity: Entity | null = null;
  private barkTimerMs = 0;
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;

  activate(targetEntity: Entity): void {
    this.targetEntity = targetEntity;
    this.state = 'approaching';
    // Set PetFollowComponent.isBarking = true
  }

  isActive(): boolean { return this.state !== 'idle'; }

  getNearestEnemyInRange(): Entity | null {
    // Find closest enemy within ENEMY_DETECT_RANGE_PX of dog
    // Exclude: bugbase IDs, destroyed, entities in death state
  }

  update(delta: number): void {
    switch (this.state) {
      case 'approaching': updateApproaching(delta); break;
      case 'barking': updateBarking(delta); break;
    }
  }
}
```

**Approaching state**: Move dog toward target using direct movement (same pattern as PetFollowComponent.moveToward). When within BARK_RANGE_PX, transition to barking.

**Barking state**: Play bark animation, apply fear, create bark wave. After BARK_ANIM_DURATION_MS, return to idle and clear isBarking flag.

### FearComponent

**Purpose**: Attached dynamically to enemy entities. Manages fear timer and fear icon sprite.

```typescript
export class FearComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  private fearIcon: Phaser.GameObjects.Sprite | null = null;
  private readonly sourceX: number;
  private readonly sourceY: number;
  private readonly durationMs: number;
  private readonly scene: Phaser.Scene;
  private readonly returnState: string;

  resetTimer(): void { this.elapsedMs = 0; }

  update(delta: number): void {
    this.elapsedMs += delta;
    // Jitter fear icon ±1px
    if (this.elapsedMs >= this.durationMs) {
      this.endFear();
    }
  }

  onDestroy(): void {
    this.fearIcon?.destroy();
  }
}
```

**Key Design Decisions**:
- FearComponent is added/removed dynamically — NOT always present
- Manages its own fear icon sprite lifecycle (create on construct, destroy on end/destroy)
- `resetTimer()` for re-fearing without duplicating
- `endFear()` transitions state machine back to `returnState`, removes self from entity

**Fear icon behavior**:
- Created from `fear_icon` texture, positioned above enemy sprite
- Scale tween: 0 → 1.2 → 1.0 over 200ms on appear
- ±1px random jitter per frame while active
- Alpha tween 1 → 0 over 300ms on fear end, then destroy

### EnemyFearState (Shared IState)

**Purpose**: Single reusable state for all enemy types. Handles flee movement.

```typescript
export class EnemyFearState implements IState {
  private fleeAngle = 0;
  private elapsedMs = 0;

  constructor(
    private readonly entity: Entity,
    private readonly grid: Grid,
    private readonly baseSpeedPxPerSec: number,
    private readonly animPrefix: string // e.g. 'skeleton_walk_', 'puma_running_'
  ) {}

  onEnter(): void {
    // Read sourceX/sourceY from entity's FearComponent
    // Calculate flee angle = atan2(entityY - sourceY, entityX - sourceX) + random jitter
    // Play walk animation facing flee direction
  }

  onUpdate(delta: number): void {
    // Move away from source at baseSpeed * 1.2
    // Use transform directly (GridCollisionComponent handles wall blocking)
    // After FEAR_DURATION_MS → transition to returnState via FearComponent.endFear()
    // (FearComponent.update() handles the timer and calls endFear)
  }
}
```

**Key Design Decisions**:
- Takes `animPrefix` in constructor so each enemy type provides its own walk animation key pattern
- Movement: calculates flee direction once on enter (with ±15° jitter), moves in that direction
- Does NOT manage the timer — FearComponent handles duration and calls endFear()
- Wall collision: moves via transform, GridCollisionComponent in the entity's update order handles blocking
- Speed: `baseSpeedPxPerSec * 1.2` for slightly faster flee

**Per-enemy integration**:

| Enemy | animPrefix | baseSpeed | returnState | Notes |
|-------|-----------|-----------|-------------|-------|
| skeleton | `skeleton_walk_` | config.speedPxPerSec | `idle` | Uses Phaser anims |
| bug | N/A | speed | `chase` | Uses frame-based anims, fear state sets frames directly |
| puma | `puma_running_` | config.pxPerSecond | `resting` | Uses Phaser anims |
| thrower | `thrower_running_` | config.speedPxPerSec | `idle` | Uses Phaser anims |
| stalking_robot | N/A | 150 | `patrol` | Uses custom frame logic |
| bulletDude | `bulletdude_walk_` | 100 | `guard` | Uses Phaser anims |

**Bug and Robot special handling**: These enemies use frame-based animation (not Phaser's `sprite.play()`). The EnemyFearState needs a callback or flag to handle this. Simplest approach: pass an optional `onFlee(direction: Direction)` callback that each enemy type can use to set the correct animation frame.

### Bark Wave Effect

Temporary Phaser Graphics object:

```typescript
function createBarkWave(scene: Phaser.Scene, x: number, y: number): void {
  const graphics = scene.add.graphics();
  graphics.setDepth(Depth.effects);
  
  let radiusPx = 0;
  const maxRadiusPx = 600;
  const durationMs = 400;
  let elapsedMs = 0;
  
  scene.events.on('update', function tick(_time: number, delta: number) {
    elapsedMs += delta;
    const progress = Math.min(elapsedMs / durationMs, 1);
    radiusPx = maxRadiusPx * progress;
    const alpha = 0.3 * (1 - progress);
    
    graphics.clear();
    graphics.lineStyle(3, 0xffffff, alpha);
    graphics.strokeCircle(x, y, radiusPx);
    
    if (progress >= 1) {
      scene.events.off('update', tick);
      graphics.destroy();
    }
  });
}
```

### Bark Animation Integration

**PetAnimations.ts modification**: Add bark animations to the animation map.

```typescript
// In createPetAnimationMap(), after idle and walk:
if (metadata.animations['bark']) {
  for (const dir of ALL_DIRECTIONS) {
    const metaDir = dirMap[dir];
    const barkData = metadata.animations['bark'][metaDir];
    if (barkData) {
      const barkFrames = rangeToFrameStrings(barkData.start, barkData.end);
      animMap.set(`bark_${dir}`, new Animation(barkFrames, 'once', 0.1));
    }
  }
}
```

### PetFollowComponent Modification

Add `isBarking` flag:

```typescript
private isBarking = false;

update(delta: number): void {
  if (this.isBarking || this.isHidden) return;
  // ... existing follow logic
}

setBarking(barking: boolean): void { this.isBarking = barking; }
```

### PetAbilityComponent Modification

Route dog ability to DogBarkAbility:

```typescript
tryAbility(): boolean {
  // ... existing checks ...
  const petEntity = petManager.getActivePetEntity();
  if (config.id === 'dog') {
    const barkAbility = petEntity?.get(DogBarkAbility);
    if (!barkAbility || barkAbility.isActive()) return false;
    const target = barkAbility.getNearestEnemyInRange();
    if (!target) return false;
    barkAbility.activate(target);
    this.cooldownMs = config.abilityCooldownMs;
    return true;
  }
  console.log(`[PET] ${config.id} ability activated!`);
  return true;
}
```

### PetActionButtonComponent Modification

Add enemy proximity check for icon visibility:

```typescript
// In update(), when dog is selected:
// Check if DogBarkAbility.getNearestEnemyInRange() returns non-null
// If no target → alpha 0.2 (disabled)
// Also swap texture to 'bark_icon' when dog selected
```

### PetEntity Modification

Add DogBarkAbility when creating dog pet:

```typescript
if (config.id === 'dog') {
  entity.add(new DogBarkAbility(scene, grid));
  // Add to update order before AnimationComponent
}
```

### Asset Registration

Add to AssetRegistry.ts core assets:
- `bark_icon`: `public/assets/pets/dog/dog/bark_icon.png`
- `fear_icon`: `public/assets/pets/dog/dog/fear_icon.png`

### Enemy Entity Modifications

Each affected enemy entity file needs:
1. Import EnemyFearState
2. Add `fear` state to StateMachine constructor
3. Pass appropriate animPrefix, baseSpeed, returnState

Example for skeleton:
```typescript
const stateMachine = new StateMachine({
  // ... existing states ...
  fear: new EnemyFearState(entity, grid, config.speedPxPerSec, 'skeleton_walk_'),
}, 'rise');
```

For bug (frame-based animation):
```typescript
fear: new EnemyFearState(entity, grid, speed, '', (dir) => {
  // Set bug frame based on direction
}),
```

## Prerequisite Refactors

None required. The existing architecture supports this cleanly:
- StateMachine.hasState() can check if fear state exists
- Components can be added/removed dynamically
- PetFollowComponent already has a clean pause mechanism (isHidden)

## Performance Considerations

- Bark wave: single Graphics object, destroyed after 400ms
- Fear icons: one sprite per feared enemy, max ~10 at once
- EnemyFearState: simple trig calculation once on enter, then linear movement
- No per-frame allocations in hot path

## Edge Cases

1. **Target dies mid-approach**: DogBarkAbility checks `targetEntity.isDestroyed` each frame, aborts if true
2. **Dog hidden (water)**: PetAbilityComponent already blocks ability when pet is hidden
3. **Multiple barks**: FearComponent.resetTimer() prevents duplicate components
4. **Enemy already dying**: Filter out entities in death/dying state when applying fear
5. **No path to enemy**: Use direct movement (same as PetFollowComponent fallback)
6. **Fear ends during knockback**: Enemy returns to returnState, knockback continues independently
