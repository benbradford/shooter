# Pet System - Quick Reference

## Enabling Pets

Set WorldState flags in `public/states/default.json`:

```json
{
  "flags": {
    "pet_dog_collected": "true",
    "pet_selected": "dog"
  }
}
```

Available pets: `"rock"` (4-dir, 48x48) or `"dog"` (8-dir, 32x32)

## Controls

- **P key** or tap pet action button — Trigger pet ability
- Pet follows automatically using pathfinding

## Dog Bark Ability

**Activation:** P key or tap pet action button (works with or without enemies nearby)

**Flow with enemy:** Dog pathfinds to nearest enemy → barks → bark effect + sound → enemies within 400px enter fear state for 4 seconds

**Flow without enemy:** Dog barks on the spot in its current facing direction → bark effect + sound (no fear applied)

**Bark effect:** Cyan expanding ring (15→156px, 300ms, Cubic.Out), inner pulse, echo ring (80ms delay), particle burst (15 cyan particles)

**Sound:** `bark.mp3` plays on every bark

**Fear Effects:**
- Enemies flee at 0.6× speed with zig-zag movement (direction changes every 300ms)
- Blue tint pulses between `0x8888ff` and white
- Fear icon particles emit around enemy (small, fading, floating upward)

**Fear Immunity:** BugBase (stationary, can't flee)

**Post-Fear Behavior:**
- Enemies return to chase/idle state (never attack/jumping/recover)
- Bugs have 1.5s attack cooldown after fear ends
- Active hops cancelled when fear applied

**HUD:** Bark icon shown when dog selected, only dims during cooldown or swimming

## Following Behavior

**States:** `idle` → `following` → `wandering_move` / `wandering_pause`

- **Following** (>192px): Runs toward player using pathfinding, run animation (speed scales 300–500px/s based on distance)
- **Wandering** (<128px): Alternates between slow walks to random nearby points (0.6-1.5s) and pauses (0.8-2s), walk animation
- **Speed transition:** 500ms lerp between run speed (300px/s) and wander speed (60px/s)
- **Teleport:** If >800px away, teleports to player
- **Water:** Pet rides on player's back when swimming, matches player direction, resumes follow on exit

## ⚠️ Pathfinding Pitfalls (Critical)

### Always Use Pathfinding for Movement

**Never fall back to direct movement (`moveToward` toward player/target) when pathfinding returns null.** The dog will run straight through walls. If no path found, wait and retry.

### Always Pathfind on Layer 0

**Hardcode layer 0** in `findPath()` calls. If the dog reads the layer from its current cell and happens to be near a wall (layer 1), the pathfinder starts from layer 1 and can't find a path to the player on layer 0. Use `allowLayerChanges: false`.

```typescript
// ✅ CORRECT
pathfinder.findPath(startCol, startRow, goalCol, goalRow, 0, false, true);

// ❌ WRONG - reads layer from cell, may be layer 1 near walls
const layer = grid.getCell(col, row)?.layer ?? 0;
pathfinder.findPath(startCol, startRow, goalCol, goalRow, layer, true, true);
```

### GridCollisionComponent + Pathfinding Interaction

The pet has `GridCollisionComponent` for wall collision. This works correctly as long as:
- Pathfinding avoids walls (it does)
- No direct movement fallback bypasses the pathfinder

### Target Selection by Path Distance, Not Pixel Distance

For bark targeting, use **path length** (cells) not **pixel distance**. An enemy 100px away through a wall is unreachable, but an enemy 300px away around a corner is reachable.

```typescript
// ✅ CORRECT - checks actual reachability
const path = pathfinder.findPath(dogCell, enemyCell, 0, false, true);
if (path && path.length <= MAX_CELLS) { /* targetable */ }

// ❌ WRONG - ignores walls and layers
if (Math.hypot(dx, dy) < RANGE_PX) { /* targetable */ }
```

### Non-Resumable States After Fear

When applying fear, never return to aggressive/transitional states. These cause enemies to resume mid-attack (e.g., puma completes a jump from far away):

```typescript
const NON_RESUMABLE_STATES = new Set(['attack', 'jumping', 'recover', 'standup', 'threatening']);
```

## Rock Throw Ability

**Activation:** P key or tap pet action button (hold to aim)

**Flow:** Press → rock tweens to player hand (throw anim frame 2) → hold to aim (arrow indicator, joystick changes direction) → release to throw → rock arcs 250px, 20 damage → lands (1s idle) → returns to player via lerp

**States:** `idle` → `charging` → `aiming` → `throwing` → `landed` → `returning` → `idle`

**During charge/aim:** Player movement locked, facing locked (except during aim where joystick changes direction). Punch blocked.

**Wall collision:** Rock stops moving forward but completes its arc, landing at the wall boundary. Blocked areas and platforms also stop the rock.

**Water landing:** Splash particle effect + sound, rock hidden until return.

**Cancel on damage:** If player takes damage during charge/aim, rock drops 20px and returns.

**Re-throw during return:** Pressing the pet button while the rock is returning interrupts the return and immediately starts a new throw sequence.

**Button disabled:** Pet action button is disabled (dimmed) during flight (`throwing`) and landing cooldown (`landed`). Enabled during return for re-throw.

**Cooldown:** Starts after rock returns to player (not on activation).

**Key constants:** `THROW_DISTANCE_PX = 250`, `THROW_SPEED_PX_PER_SEC = 500`, `THROW_DAMAGE = 20`, `THROW_ARC_HEIGHT_PX = 20`

**Per-direction offsets:** `PLAYER_THROW_OFFSETS` defines `{ x, y, z }` per Direction — `z: 1` renders rock in front of player, `z: -1` behind.

## Architecture

- **PetManager** — Singleton, spawns pets based on WorldState
- **PetFollowComponent** — Pathfinding follow, wander state machine, speed lerp
- **PetAbilityComponent** — Routes ability activation to pet-specific component
- **DogBarkAbility** — Bark state machine (idle → approaching → barking), fear application
- **RockThrowAbility** — Throw state machine (idle → charging → aiming → throwing → landed → returning)
- **RockArcComponent** — Projectile arc motion + wall collision
- **FearComponent** — Dynamic component added/removed from enemies, manages tint + particles
- **EnemyFearState** — Shared IState for all enemy types, zig-zag flee movement
- **PetActionButtonComponent** — HUD button, swaps icon per pet type

## Key Files

- `src/systems/PetManager.ts` — Pet lifecycle
- `src/ecs/entities/pet/PetEntity.ts` — Entity factory
- `src/ecs/entities/pet/PetConfig.ts` — Pet registry (rock, dog)
- `src/ecs/entities/pet/PetAnimations.ts` — Animation map creation (idle, walk, run, bark)
- `src/ecs/components/pet/PetFollowComponent.ts` — Following + wander logic
- `src/ecs/components/pet/PetAbilityComponent.ts` — Ability routing
- `src/ecs/components/pet/DogBarkAbility.ts` — Bark ability + fear application
- `src/ecs/components/combat/FearComponent.ts` — Fear visual effects + timer
- `src/ecs/entities/common/EnemyFearState.ts` — Shared flee state
- `features/pets/dog/bark/` — Design docs and tasks
