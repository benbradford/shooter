# Rock Throw Ability — Design

## Overview

The rock pet gains a throw ability. Player presses pet ability button → enters throw-charge state → aims with joystick → releases to launch rock as a projectile. Rock damages enemies/breakables on hit, collides with walls, and returns to player after landing or hitting.

## State Machine

```
idle → charging → aiming → throwing → returning → idle
```

### States

**idle**: Normal pet follow behavior. Ability button triggers transition to `charging`.

**charging**: 
- Player plays `throw_${dir}` frames 0→2, pauses at frame 2
- Rock tweens from current position to player + `PLAYER_THROW_OFFSETS[dir]` (< 500ms)
- Movement locked, facing locked to current direction
- If button released before rock arrives → skip to `throwing`
- If button still held when rock arrives → transition to `aiming`

**aiming**:
- Player holds frame 2 of `throw_${dir}`
- Movement locked, but joystick changes player facing direction (8-dir for animation, continuous angle for arrow)
- When direction changes: update `throw_${newDir}` frame 2, move rock to new offset
- Draw directional arrow (30px, blue gradient, points in joystick direction — continuous angle, not 8-dir locked)
- On button release → transition to `throwing`

**throwing**:
- Continue throw animation from frame 2 to frame 6
- Launch rock as projectile: 250px distance in facing direction
- Rock has shadow underneath, starts 50px above shadow, arcs down to shadow level at destination
- Uses `ProjectileComponent` for wall/platform collision
- Uses `CollisionComponent` for enemy/breakable hits (20 damage)
- On hit or max distance → transition to `returning`

**returning**:
- Rock tweens back to player collision box position (< 500ms)
- On arrival → transition to `idle`, resume pet follow

### Cancellation

If player takes damage during `charging` or `aiming`:
- Detected by polling `HealthComponent.getHealth()` each frame (store `lastKnownHealth`, compare)
- Rock drops 20px down from current position (quick tween)
- Transition to `returning`

## Mutual Exclusion

**Punch vs Throw:** `AttackComboComponent.tryStartPunch()` must check if rock throw is active and refuse to start a punch. `PetAbilityComponent.tryAbility()` already checks `isPunching()`.

## Button Hold Detection

`PetActionButtonComponent` sets `abilityHeld` flag on `PetAbilityComponent` (player entity) via pointer events. `RockThrowAbility` reads this flag each frame via the player entity reference. Keyboard H key state also feeds into this flag via `InputComponent`.

`PetAbilityComponent` exposes:
- `isAbilityHeld(): boolean` — true while button/key is held
- `setAbilityHeld(held: boolean)` — called by PetActionButtonComponent and InputComponent

## Cleanup (onDestroy)

`RockThrowAbility.onDestroy()` MUST:
1. Destroy active projectile entity (if exists, store reference)
2. Destroy arrow Graphics (if exists)
3. Kill active tweens (charge tween, via `tween.stop()`)
4. Unlock player movement
5. Resume PetFollowComponent (`setBarking(false)`)

All tween `onComplete` callbacks and projectile callbacks must guard: `if (this.entity.isDestroyed) return;`

## Return Mechanism

Use manual lerp in `update()` instead of Phaser tween for return. Lerps toward `playerTransform` position each frame, handling player movement during return. Arrives when distance < threshold (e.g., 5px).

## Double Notification Guard

Projectile `onHit` and `onMaxDistance` can both fire same frame. State machine guards: `if (this.state !== 'throwing') return;` in the notification handler.

## Components

### RockThrowAbility (new)
**File:** `src/ecs/components/pet/RockThrowAbility.ts`
**On:** Pet entity (rock)

State machine for the throw lifecycle. Manages:
- State transitions
- Rock sprite positioning during charge/aim
- Arrow graphics during aim
- Launching the projectile entity
- Return tween

**Interface** (matches DogBarkAbility pattern):
```typescript
isActive(): boolean  // true when state !== 'idle'
activate(): void     // called by PetAbilityComponent
update(delta): void  // state machine tick
```

### Player Integration

**Movement lock:** `RockThrowAbility` exposes `isPlayerLocked(): boolean` (true during charging/aiming). `WalkComponent` checks this via the pet entity (accessed through `PetManager`).

Alternative (simpler): Add a `throwLocked` flag on `WalkComponent` that `RockThrowAbility` sets/clears directly via the player entity reference.

**Animation control:** `RockThrowAbility` directly controls player's `AnimationComponent` during charging/aiming (plays throw anim, freezes frame). Restores control on exit.

**Direction updates:** During aiming, reads joystick input from player's `InputComponent` to update facing. Uses `dirFromDelta()` for 8-dir animation selection, raw angle for arrow direction.

### Rock Projectile Entity (new)
**File:** `src/ecs/entities/pet/RockProjectileEntity.ts`

Created when throw launches. Components:
- `TransformComponent` — position
- `SpriteComponent` — rock texture (same spritesheet, idle frame)
- `ShadowComponent` — shadow at ground level
- `ProjectileComponent` — wall/layer collision, 250px max distance
- `CollisionComponent` — enemy/breakable hit detection, 20 damage
- `DamageComponent(20)` — damage value

**Arc motion:** Separate from ProjectileComponent. A custom component or inline logic that interpolates Y offset from -50px to 0 over the flight distance (sine or linear).

### Arrow Indicator
- `Phaser.GameObjects.Graphics` owned by `RockThrowAbility`
- Drawn each frame during `aiming` state
- 30px line from player center in joystick direction
- Blue gradient (light blue → darker blue), 2-3px wide
- Arrowhead at tip
- Destroyed on state exit

## Constants

```typescript
const THROW_DISTANCE_PX = 250;
const THROW_SPEED_PX_PER_SEC = 500;  // 250px / 0.5s
const THROW_DAMAGE = 20;
const THROW_ARC_HEIGHT_PX = 50;
const ROCK_RETURN_DURATION_MS = 400;
const ROCK_CHARGE_TWEEN_DURATION_MS = 300;
const ROCK_DROP_DISTANCE_PX = 20;
const ARROW_LENGTH_PX = 30;

const PLAYER_THROW_OFFSETS: Record<Direction, { x: number; y: number }> = {
  [Direction.None]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: -10 },
  [Direction.Up]: { x: 0, y: 10 },
  [Direction.Left]: { x: 5, y: 0 },
  [Direction.Right]: { x: -5, y: 0 },
  [Direction.UpLeft]: { x: 3, y: 7 },
  [Direction.UpRight]: { x: -3, y: 7 },
  [Direction.DownLeft]: { x: 3, y: -7 },
  [Direction.DownRight]: { x: -3, y: -7 },
};
```

## Data Flow

### Activation
```
PetAbilityComponent.tryAbility()
  → checks config.id === 'rock'
  → gets RockThrowAbility from pet entity
  → calls activate()
  → sets cooldown
```

### During Charge/Aim
```
RockThrowAbility.update(delta)
  → reads player InputComponent for joystick direction
  → updates player animation (throw_${dir} frame 2)
  → positions rock sprite at player + offset
  → draws arrow (aim state only)
  → checks if ability button still held (via PetAbilityComponent or InputComponent)
```

### Launch
```
RockThrowAbility → creates RockProjectileEntity
  → ProjectileComponent handles movement + wall collision
  → CollisionComponent handles enemy/breakable hits
  → Arc component handles Y offset (visual only)
  → On hit/land: destroy projectile, start return tween
```

### Return
```
RockThrowAbility
  → tweens rock sprite from landing position to player
  → on complete: resume PetFollowComponent, set state to idle
```

## Button Hold Detection

`PetAbilityComponent` currently fires on press. Need to track hold state:
- `isAbilityHeld(): boolean` — reads from `PetActionButtonComponent` or keyboard H key
- `RockThrowAbility` checks this each frame during charging/aiming

## Files to Create
- `src/ecs/components/pet/RockThrowAbility.ts` — main ability component
- `src/ecs/entities/pet/RockProjectileEntity.ts` — projectile entity factory

## Files to Modify
- `src/ecs/components/pet/PetAbilityComponent.ts` — add rock routing, hold detection (`isAbilityHeld()`, `setAbilityHeld()`)
- `src/ecs/entities/pet/PetEntity.ts` — add RockThrowAbility to rock pet, add to update order
- `src/ecs/components/movement/WalkComponent.ts` — check throw lock
- `src/ecs/components/pet/PetFollowComponent.ts` — already has setBarking() for pause (reuse)
- `src/ecs/components/input/PetActionButtonComponent.ts` — call `setAbilityHeld()` on pointer down/up
- `src/ecs/components/combat/AttackComboComponent.ts` — block punch during active throw

## Edge Cases
- Player takes damage during charge/aim → cancel, drop rock, return
- Rock hits wall immediately (thrown into adjacent wall) → return immediately
- Rock thrown over water → lands on water cell (no special behavior yet)
- Ability button pressed while rock is returning → ignored (isActive() = true)
- Player dies during throw → rock entity destroyed with pet
- Pet despawned during throw → onDestroy cleans up projectile, graphics, tweens, unlocks player
- Punch attempted during throw → blocked by AttackComboComponent guard
- Double projectile notification (hit + max distance same frame) → state machine guard
- Return targets moving player → manual lerp tracks live position
