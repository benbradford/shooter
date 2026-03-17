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
  ↓ overrides enemy state machine
EnemyFearState (new, shared)
  ↓ flee movement + visuals
```

## Data Flow

### Bark Activation
```
1. Player presses H / touches action button
2. PetAbilityComponent.tryAbility()
3. If dog selected → DogBarkAbility.activate()
4. DogBarkAbility finds nearest enemy within 400px of dog
5. Sets PetFollowComponent to bark mode (target = enemy)
6. PetFollowComponent walks dog toward enemy
7. When within 100px → DogBarkAbility.executeBark()
8. Bark animation plays ('once', ~600ms)
9. On bark frame (midpoint) → apply fear to enemies within 600px
10. After animation → resume follow mode
```

### Fear Application
```
1. DogBarkAbility gets all entities with 'enemy' tag
2. Filter: within 600px of dog, not 'bugbase' type, not destroyed, not already dying
3. For each affected enemy:
   a. Add FearComponent (or reset timer if already has one)
   b. StateMachine.enter('fear', { sourceX, sourceY })
   c. HitFlashComponent.flash(150) with white tint
   d. Add fear icon sprite above enemy using public/assets/pets/dog/dog/fear_icon.png
4. Bark wave visual expands from dog position
```

## Component Design

### DogBarkAbility

**Purpose**: Manages the full bark sequence as a state machine on the pet entity.

**States**: `idle` | `approaching` | `barking` | `recovering`

```typescript
// Constants
const ENEMY_DETECT_RANGE_PX = 400;
const BARK_RANGE_PX = 100;
const FEAR_RADIUS_PX = 600;
const FEAR_DURATION_MS = 4000;
const BARK_ANIM_DURATION_MS = 600;
const APPROACH_SPEED_PX_PER_SEC = 300;

export class DogBarkAbility implements Component {
  entity!: Entity;
  private state: 'idle' | 'approaching' | 'barking' | 'recovering' = 'idle';
  private targetEntity: Entity | null = null;
  private barkTimerMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {}

  update(delta: number): void {
    switch (this.state) {
      case 'approaching': this.updateApproaching(delta); break;
      case 'barking': this.updateBarking(delta); break;
      case 'recovering': this.state = 'idle'; break;
    }
  }

  activate(targetEntity: Entity): void {
    this.targetEntity = targetEntity;
    this.state = 'approaching';
    // PetFollowComponent paused via isBarking flag
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  getNearestEnemyInRange(entityManager: EntityManager): Entity | null {
    // Find closest enemy within ENEMY_DETECT_RANGE_PX of dog position
    // Exclude bugbase, destroyed, dying enemies
  }

  private updateApproaching(delta: number): void {
    // If target died, abort
    if (!this.targetEntity || this.targetEntity.isDestroyed) {
      this.state = 'idle';
      return;
    }
    // Move toward target, when within BARK_RANGE_PX → executeBark()
  }

  private executeBark(): void {
    this.state = 'barking';
    this.barkTimerMs = 0;
    // Face enemy, play bark animation
    // Apply fear to all enemies within FEAR_RADIUS_PX
    // Create bark wave visual
  }

  private updateBarking(delta: number): void {
    this.barkTimerMs += delta;
    if (this.barkTimerMs >= BARK_ANIM_DURATION_MS) {
      this.state = 'idle';
    }
  }

  private applyFearToNearbyEnemies(): void {
    const dogTransform = this.entity.require(TransformComponent);
    const enemies = this.scene.entityManager.getAll()
      .filter(e => e.tags.has('enemy') && !e.isDestroyed && e.type !== 'bugbase');

    for (const enemy of enemies) {
      const enemyTransform = enemy.require(TransformComponent);
      const dist = Math.hypot(
        enemyTransform.x - dogTransform.x,
        enemyTransform.y - dogTransform.y
      );
      if (dist <= FEAR_RADIUS_PX) {
        this.applyFear(enemy, dogTransform.x, dogTransform.y);
      }
    }
  }
}
```

**Key Design Decisions**:
- DogBarkAbility lives on the **pet entity**, not the player
- It directly controls the pet's movement during approach (overrides PetFollowComponent)
- Fear is applied at the moment the bark animation reaches its midpoint
- The component is only added when dog is the active pet

### FearComponent

**Purpose**: Attached to an enemy entity to make it flee. Self-removing after duration.

```typescript
const FEAR_SPEED_MULTIPLIER = 1.2;
const FEAR_DIRECTION_JITTER_RAD = 0.26; // ~15 degrees

export class FearComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  private readonly fearIcon: Phaser.GameObjects.Sprite | null = null;

  constructor(
    private readonly sourceX: number,
    private readonly sourceY: number,
    private readonly durationMs: number,
    private readonly scene: Phaser.Scene
  ) {}

  update(delta: number): void {
    this.elapsedMs += delta;
    if (this.elapsedMs >= this.durationMs) {
      this.endFear();
      return;
    }
    this.updateFearIcon();
  }

  resetTimer(): void {
    this.elapsedMs = 0;
  }

  private endFear(): void {
    // Remove fear icon
    // Transition enemy state machine back to default state
    // Remove self from entity
  }

  onDestroy(): void {
    this.fearIcon?.destroy();
  }
}
```

**Key Design Decisions**:
- FearComponent is **added dynamically** to enemies when feared, removed when fear ends
- It does NOT handle movement — that's the EnemyFearState's job
- It manages the fear icon sprite lifecycle
- `resetTimer()` allows re-fearing without creating duplicate components

### EnemyFearState (Shared IState)

**Purpose**: A single reusable state class that works for all enemy types.

```typescript
type FearStateData = {
  sourceX: number;
  sourceY: number;
  returnState: string; // state to return to after fear ends
};

export class EnemyFearState implements IState<FearStateData> {
  private sourceX = 0;
  private sourceY = 0;
  private returnState = 'idle';
  private elapsedMs = 0;
  private jitterAngle = 0;

  constructor(
    private readonly entity: Entity,
    private readonly grid: Grid,
    private readonly speedPxPerSec: number
  ) {}

  onEnter(props?: IStateEnterProps<FearStateData>): void {
    if (props?.data) {
      this.sourceX = props.data.sourceX;
      this.sourceY = props.data.sourceY;
      this.returnState = props.data.returnState;
    }
    this.elapsedMs = 0;
    this.jitterAngle = (Math.random() - 0.5) * FEAR_DIRECTION_JITTER_RAD * 2;
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;
    if (this.elapsedMs >= FEAR_DURATION_MS) {
      const sm = this.entity.require(StateMachineComponent);
      sm.stateMachine.enter(this.returnState);
      return;
    }

    // Calculate flee direction (away from source + jitter)
    const transform = this.entity.require(TransformComponent);
    const dx = transform.x - this.sourceX;
    const dy = transform.y - this.sourceY;
    const angle = Math.atan2(dy, dx) + this.jitterAngle;

    // Move using GridCollisionComponent (respects walls)
    const speed = this.speedPxPerSec * FEAR_SPEED_MULTIPLIER;
    const moveX = Math.cos(angle) * speed * (delta / 1000);
    const moveY = Math.sin(angle) * speed * (delta / 1000);

    // Apply movement through walk component or direct transform
    // Play walk animation facing flee direction
  }
}
```

**Key Design Decisions**:
- **Single shared class** for all enemy types — avoids 6 duplicate fear states
- Takes `speedPxPerSec` in constructor so each enemy flees at appropriate speed
- `returnState` parameter lets each enemy return to their correct default state
- Uses GridCollisionComponent for wall-respecting movement
- Jitter angle randomized once on enter, not per frame (smoother path)

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

**Bark animation details** (from metadata):
- 6 frames per direction, 8 directions
- Frame ranges: east 8-13, north 14-19, etc.
- Style: `'once'` (plays through once, holds last frame)
- Speed: 0.1s per frame = 600ms total

### PetFollowComponent Modification

Add a `isBarking` flag that pauses normal follow behavior:

```typescript
// New fields
private isBarking = false;

// In update():
if (this.isBarking || this.isHidden) return;

// New methods
setBarking(barking: boolean): void { this.isBarking = barking; }
getIsBarking(): boolean { return this.isBarking; }
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
    const target = barkAbility.getNearestEnemyInRange(entityManager);
    if (!target) return false;
    barkAbility.activate(target);
    this.cooldownMs = config.abilityCooldownMs;
    return true;
  }
  // ... fallback for other pets ...
}
```

### PetActionButtonComponent Modification

Add enemy proximity check for icon visibility:

```typescript
// In update():
if (config.id === 'dog') {
  const barkAbility = petEntity?.get(DogBarkAbility);
  const hasTarget = barkAbility?.getNearestEnemyInRange(entityManager) !== null;
  if (!hasTarget) {
    this.sprite.setAlpha(DISABLED_ALPHA); // 0.2
    return;
  }
}
```

## Visual Effects

### Bark Wave Effect

Created as a temporary Phaser Graphics object:

```typescript
function createBarkWave(scene: Phaser.Scene, x: number, y: number): void {
  const graphics = scene.add.graphics();
  graphics.setDepth(Depth.effects);
  let radius = 0;
  const maxRadius = FEAR_RADIUS_PX;
  const duration = 400;
  const startTime = scene.time.now;

  scene.events.on('update', function tick() {
    const elapsed = scene.time.now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    radius = maxRadius * progress;
    const alpha = 0.3 * (1 - progress);

    graphics.clear();
    graphics.lineStyle(2, 0xffffff, alpha);
    graphics.strokeCircle(x, y, radius);

    if (progress >= 1) {
      graphics.destroy();
      scene.events.off('update', tick);
    }
  });
}
```

### Fear Icon

A small sprite created above each feared enemy. we can use public/assets/pets/dog/dog/fear_icon.png for this, no need for manually created graphics

```typescript
function createFearIcon(scene: Phaser.Scene, enemy: Entity): Phaser.GameObjects.Sprite {
  const transform = enemy.require(TransformComponent);
  // Use a simple "!" or shock symbol — can be a small generated texture
  const icon = scene.add.sprite(transform.x, transform.y - 40, 'fear_icon');
  icon.setScale(0);
  icon.setDepth(Depth.effects);

  // Scale in animation
  scene.tweens.add({
    targets: icon,
    scaleX: 1.2, scaleY: 1.2,
    duration: 100,
    yoyo: true,
    onYoyo: () => { icon.setScale(1); }
  });

  return icon;
}
```

**Fear icon asset**: Add public/assets/pets/dog/dog/fear_icon.png to asset registry

## Integration with Enemy State Machines

Each enemy entity factory needs to register the `'fear'` state:

```typescript
// In createSkeletonEntity, createBugEntity, etc:
const fearState = new EnemyFearState(entity, grid, speedPxPerSec);
// Add to state machine states map:
states['fear'] = fearState;
```

**Return states by enemy type**:
| Enemy | Return State |
|-------|-------------|
| skeleton | 'idle' |
| bug | 'chase' |
| puma | 'threatening' |
| thrower | 'idle' |
| stalking_robot | 'patrol' |
| bulletDude | 'guard' |

**BugBase exclusion**: BugBase entities have type `'bugbase'` — filter by `entity.type !== 'bugbase'` when applying fear.

## Execution Flow: Complete Bark Sequence

```
1. Player presses H
2. PetAbilityComponent.tryAbility()
   2.1. Checks: dog selected, active, not on cooldown, not punching, not swimming, pet not too far
   2.2. Gets DogBarkAbility from pet entity
   2.3. Calls getNearestEnemyInRange() — finds closest enemy within 400px of dog
   2.4. If no enemy → return false (ability doesn't activate)
   2.5. Calls barkAbility.activate(targetEnemy)
   2.6. Sets cooldown to 3000ms
3. DogBarkAbility.activate()
   3.1. Sets state = 'approaching'
   3.2. Stores target enemy reference
   3.3. Sets PetFollowComponent.setBarking(true)
4. DogBarkAbility.updateApproaching(delta) [each frame]
   4.1. Check target still alive → if dead, abort to idle
   4.2. Calculate distance to target
   4.3. Move dog toward target at 300px/sec
   4.4. Play walk animation facing target
   4.5. When distance <= 100px → executeBark()
5. DogBarkAbility.executeBark()
   5.1. State = 'barking'
   5.2. Face target enemy
   5.3. Play bark_${direction} animation ('once')
   5.4. applyFearToNearbyEnemies()
   5.5. createBarkWave(scene, dogX, dogY)
6. applyFearToNearbyEnemies()
   6.1. Get all entities with 'enemy' tag
   6.2. Filter: within 600px, not bugbase, not destroyed
   6.3. For each: enter 'fear' state, flash white, show fear icon
7. DogBarkAbility.updateBarking(delta)
   7.1. Wait 600ms for animation to complete
   7.2. State = 'idle'
   7.3. PetFollowComponent.setBarking(false) → dog resumes following
8. EnemyFearState.onUpdate(delta) [each frame per feared enemy]
   8.1. Move away from bark source position
   8.2. Respect grid collision
   8.3. After 4000ms → return to default state
   8.4. FearComponent removes fear icon, removes self
```

## Prerequisite Analysis

### Existing Code Quality: GOOD

The pet system is well-structured with clear separation:
- PetFollowComponent handles movement
- PetAbilityComponent handles activation
- PetManager handles lifecycle

**No prerequisite refactors needed.** The existing architecture supports this feature cleanly:
- DogBarkAbility slots in as a new component on the pet entity
- FearComponent is a clean addition to enemies
- EnemyFearState follows the existing IState pattern
- PetFollowComponent just needs a `isBarking` flag

### Risk Areas

1. **Enemy state machine integration** — Each enemy has different states and return behaviors. Need to verify each enemy's state machine accepts a new 'fear' state without breaking existing transitions.

2. **GridCollisionComponent during fear** — Fear movement needs to respect walls. Need to verify enemies can use their existing GridCollisionComponent for flee movement.

3. **Bark animation timing** — The 'once' animation style needs to work correctly with our AnimationSystem. Need to verify it holds the last frame and doesn't loop.

## Performance Considerations

- DogBarkAbility.getNearestEnemyInRange() iterates all entities — called only when checking icon visibility and on ability press, not every frame
- FearComponent update is O(1) per feared enemy per frame — negligible
- Bark wave uses a single Graphics object — destroyed after 400ms
- Fear icons are simple sprites — one per feared enemy, max ~10 at once
