# Attack Combo System Specification

## Overview
Replace gun-based combat with melee combo system: throwObject → slide → punch → bigPunch. Each phase must complete before next can start. Combo resets on damage to player or 1-second timeout. **Taking damage immediately interrupts the current attack animation and resets the combo.**

## Clarifications

### Rock Throw (throwObject):
- Rock checks for collision with enemies along its path
- First enemy hit becomes the locked-on target (even if rock hasn't reached max distance)
- Before locking on, verify enemy is reachable via pathfinding
- If enemy dies from rock damage, reset combo (no lock-on)
- If pathfinding fails, reset combo (enemy unreachable)
- Player can move freely while rock is in flight

### Lock-On Indicator:
- Simple blue circle above enemy's head
- Pulses/animates
- Appears when enemy is successfully locked on

### Slide Attack:
- Player is NOT invulnerable during slide
- If locked enemy dies before slide completes, reset combo
- Slide animation holds on last frame when close to enemy
- Slide deals 4 damage on hit, no knockback
- If slide misses enemy, reset combo
- Player cannot move during slide (locked in place)
- 2-second timeout - if enemy not reached, reset combo

### Melee Attacks (Punch & BigPunch):
- Melee range: 64 pixels
- Player faces enemy during attacks
- Enemy freezes once slide hits (until combo completes or resets)
- Player locked in place during punch animations
- If enemy dies during punch, reset combo
- Cannot queue attacks - must wait for each phase to complete
- Punch duration: 500ms
- BigPunch duration: 500ms

### BigPunch Knockback:
- Knockback distance: 200 pixels
- Only applies if enemy survives the hit
- If enemy dies, no knockback applied

### Damage Values:
- throwObject: 2 damage
- slide: 4 damage  
- punch: 8 damage
- bigPunch: 16 damage

## Phase 1: Remove Gun System

### Files to Modify
- `src/ecs/entities/player/PlayerEntity.ts`
- `src/scenes/GameScene.ts`

### Changes
1. Remove components:
   - `ProjectileEmitterComponent`
   - `AmmoComponent`
   - `OverheatSmokeComponent`
   - `ShellCasingComponent`
2. Remove `onFire` and `onShellEject` callbacks
3. Remove bullet/shell entity arrays from GameScene
4. Remove ammo HUD bar

## Phase 2: Update Player Sprites

### Files to Modify
- `src/assets/AssetRegistry.ts`
- `src/ecs/entities/player/PlayerEntity.ts`

### Changes
1. Register attacker sprite sheet:
```typescript
attacker: {
  key: 'attacker',
  path: 'assets/attacker/attacker-spritesheet.png',
  type: 'spritesheet',
  config: { frameWidth: 56, frameHeight: 56 }
}
```

2. Update player sprite to use 'attacker' texture
3. Update idle animations (row 0, frames 0-7 for 8 directions)

## Phase 3: Replace Aim Joystick with Attack Button

### Files to Modify
- `src/ecs/components/input/AimJoystickComponent.ts` (delete or repurpose)
- `src/ecs/components/ui/AimJoystickVisualsComponent.ts`
- `src/ecs/entities/hud/JoystickEntity.ts`

### Changes
1. Replace draggable aim joystick with fixed attack button
2. Position at 80% width, 75% height (same general area)
3. Visual: circular button with attack icon
4. Returns `isAttackPressed()` boolean
5. Space key also triggers attack

## Phase 4: Create Attack Combo Component

### New File: `src/ecs/components/combat/AttackComboComponent.ts`

```typescript
interface AttackComboComponentProps {
  scene: Phaser.Scene;
  grid: Grid;
  entityManager: EntityManager;
}

type ComboPhase = 'idle' | 'throwObject' | 'slide' | 'punch' | 'bigPunch';

class AttackComboComponent {
  private currentPhase: ComboPhase = 'idle';
  private lockedTarget: Entity | null = null;
  private phaseTimer: number = 0;
  private comboResetTimer: number = 0;
  private rockEntity: Entity | null = null;

  // Damage values
  private readonly THROW_DAMAGE = 2;
  private readonly SLIDE_DAMAGE = 4;
  private readonly PUNCH_DAMAGE = 8;
  private readonly BIG_PUNCH_DAMAGE = 16;

  // Timing constants
  private readonly COMBO_TIMEOUT_MS = 1000;
  private readonly SLIDE_TIMEOUT_MS = 2000;
  private readonly PUNCH_DURATION_MS = 500;
  private readonly BIG_PUNCH_DURATION_MS = 500;

  // Distance constants
  private readonly ROCK_MAX_DISTANCE_PX = 400;
  private readonly SLIDE_TRIGGER_DISTANCE_PX = 150;
}
```

### Methods
- `tryStartCombo()` - Called when attack button pressed
- `resetCombo()` - Called on damage or timeout
- `updateThrowPhase(delta)` - Handle rock throwing
- `updateSlidePhase(delta)` - Handle pathfinding + slide
- `updatePunchPhase(delta)` - Handle punch animation
- `updateBigPunchPhase(delta)` - Handle big punch + knockback

## Phase 5: Create Rock Projectile Entity

### New File: `src/ecs/entities/projectile/RockEntity.ts`

```typescript
interface CreateRockEntityProps {
  scene: Phaser.Scene;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  maxDistance: number;
  onHit: (enemy: Entity) => void;
  onComplete: () => void;
}
```

### Components
- `TransformComponent`
- `SpriteComponent` (rock.png, scaled to ~32x32)
- `RockProjectileComponent` (moves toward target, checks collision)
- `ShadowComponent`

## Phase 6: Create Lock-On Indicator

### New File: `src/ecs/components/ui/LockOnIndicatorComponent.ts`

```typescript
interface LockOnIndicatorProps {
  scene: Phaser.Scene;
  targetEntity: Entity;
}
```

### Behavior
- Small icon/sprite above enemy head
- Follows enemy transform
- Destroyed when combo resets or enemy dies

## Phase 7: Update Player States

### Files to Modify
- `src/ecs/entities/player/PlayerIdleState.ts`
- `src/ecs/entities/player/PlayerWalkState.ts`

### New States to Create
- `PlayerThrowState.ts` - Can move, plays throw animation
- `PlayerSlideState.ts` - Cannot move, pathfinding + slide
- `PlayerPunchState.ts` - Cannot move, melee attack
- `PlayerBigPunchState.ts` - Cannot move, melee attack

### State Transitions
- Idle/Walk → Throw (on attack press)
- Throw → Slide (on attack press after rock hits)
- Slide → Punch (on slide hit)
- Punch → BigPunch (on attack press)
- BigPunch → Idle (on complete)
- Any → Idle (on damage or timeout)

## Phase 8: Update Input Component

### Files to Modify
- `src/ecs/components/input/InputComponent.ts`

### Changes
- Replace `isFirePressed()` with `isAttackPressed()`
- Check both attack button and space key

## Phase 9: Handle Damage Reset

### Files to Modify
- `src/ecs/components/core/HealthComponent.ts`
- `src/ecs/entities/player/PlayerEntity.ts`

### Changes
- Add callback to HealthComponent: `onDamageTaken?: () => void`
- Player's HealthComponent calls `attackCombo.resetCombo()` on damage

## Phase 10: Update Collision System

### Files to Modify
- `src/ecs/systems/CollisionSystem.ts`

### Changes
- Rock collision with enemies
- Slide collision with locked target
- Punch/BigPunch collision with locked target (melee range check)

## Implementation Status

### ✅ Completed Phases

**Phase 1: Remove Gun System**
- Removed `ProjectileEmitterComponent`, `AmmoComponent`, `OverheatSmokeComponent`, `ShellCasingComponent`
- Removed `onFire` and `onShellEject` callbacks
- Removed ammo HUD bar
- Cleaned up unused imports

**Phase 2: Update Player Sprites**
- Registered attacker sprite sheet (56x56 frames)
- Updated player to use 'attacker' texture
- Implemented idle animations for 8 directions (row 0, frames 0-7)
- Registered rock asset

**Phase 3: Replace Aim Joystick with Attack Button**
- Created `AttackButtonComponent` - fixed position at 80% width, 75% height
- Responds to touch/click and space key
- Visual feedback on press (scale + tint)
- Replaced aim joystick in `JoystickEntity`
- Updated `InputComponent` with `isAttackPressed()` method

**Phase 4 & 5: Rock Projectile + Attack Combo (throwObject phase)**
- Created `RockProjectileComponent` - moves toward target, max 400px
- Created `createRockEntity()` - rock sprite with shadow and collision
- Created `AttackComboComponent` - manages combo state
- Rock collision detection along path
- Pathfinding check before lock-on
- Deals 2 damage on hit
- Resets if enemy dies or unreachable
- 1-second timeout to reset combo
- Player can move during throw
- Attack button triggers combo from idle state

### 🔄 Next Phases

**Phase 6: Lock-On Indicator** - Blue pulsing circle above locked enemy
**Phase 7: Slide State** - Pathfind to enemy, slide animation, 4 damage
**Phase 8: Punch State** - Melee attack, 8 damage, 500ms
**Phase 9: BigPunch State** - Melee attack, 16 damage, 200px knockback, 500ms
**Phase 10: Damage Reset** - Reset combo when player takes damage

## Implementation Order

1. **Phase 1** - Remove gun system (clean slate)
2. **Phase 2** - Update player sprites (visual foundation)
3. **Phase 3** - Replace aim joystick with attack button (input)
4. **Phase 5** - Create rock entity (first attack works)
5. **Phase 4** - Create AttackComboComponent (throwObject phase only)
6. **Phase 6** - Add lock-on indicator (visual feedback)
7. **Phase 7** - Add slide state + pathfinding
8. **Phase 7** - Add punch states
9. **Phase 9** - Add damage reset
10. **Phase 10** - Polish collision detection

## Testing Checklist

- [ ] Attack button triggers throw
- [ ] Rock flies toward nearest enemy
- [ ] Rock collision locks on enemy
- [ ] Lock-on indicator appears
- [ ] Slide pathfinds to enemy
- [ ] Slide animation triggers at 150px
- [ ] Punch deals damage
- [ ] BigPunch knocks back
- [ ] Combo resets on 1s timeout
- [ ] Combo resets on player damage
- [ ] Can't move during slide/punch/bigPunch
- [ ] Can move during throw

## Constants to Define

```typescript
// Damage
const THROW_DAMAGE = 2;
const SLIDE_DAMAGE = 4;
const PUNCH_DAMAGE = 8;
const BIG_PUNCH_DAMAGE = 16;

// Timing
const COMBO_TIMEOUT_MS = 1000;
const SLIDE_TIMEOUT_MS = 2000;
const PUNCH_DURATION_MS = 500;
const BIG_PUNCH_DURATION_MS = 500;

// Distance
const ROCK_MAX_DISTANCE_PX = 400;
const SLIDE_TRIGGER_DISTANCE_PX = 150;
const MELEE_RANGE_PX = 64;

// Knockback
const BIG_PUNCH_KNOCKBACK_FORCE = 500;
```
