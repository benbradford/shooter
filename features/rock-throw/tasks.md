# Rock Throw Ability — Task Breakdown

## Phase 1: Infrastructure (Button Hold + Movement Lock)

### Task 1.1: Add ability hold detection to PetAbilityComponent
**File:** `src/ecs/components/pet/PetAbilityComponent.ts`
- [ ] Add `private abilityHeld: boolean = false`
- [ ] Add `isAbilityHeld(): boolean` method
- [ ] Add `setAbilityHeld(held: boolean)` method
- [ ] In `tryAbility()`, add rock routing (get `RockThrowAbility`, check `isActive()`, call `activate()`)

### Task 1.2: Wire touch button hold state
**File:** `src/ecs/components/input/PetActionButtonComponent.ts`
- [ ] On pointerdown: call `PetAbilityComponent.setAbilityHeld(true)` on player entity
- [ ] On pointerup: call `PetAbilityComponent.setAbilityHeld(false)` on player entity
- [ ] Wire keyboard H key hold state into `setAbilityHeld()` (check in update or via InputComponent)

### Task 1.3: Add throw movement lock to WalkComponent
**File:** `src/ecs/components/movement/WalkComponent.ts`
- [ ] Import PetManager and RockThrowAbility
- [ ] In update: check `RockThrowAbility.isPlayerLocked()` → zero movement input
- [ ] Allow facing direction updates when `RockThrowAbility.isAiming()` (joystick changes direction during aim)

### Task 1.4: Block punch during throw
**File:** `src/ecs/components/combat/AttackComboComponent.ts`
- [ ] In `tryStartPunch()`: check if rock throw is active via PetManager → return if active

**Dependencies:** None
**Estimated Time:** 1.5 hours

---

## Phase 2: Core Ability Component

### Task 2.1: Create RockThrowAbility component
**File:** `src/ecs/components/pet/RockThrowAbility.ts`
- [ ] Define state type: `'idle' | 'charging' | 'aiming' | 'throwing' | 'returning'`
- [ ] Define constants: `THROW_DISTANCE_PX`, `THROW_SPEED_PX_PER_SEC`, `THROW_DAMAGE`, `THROW_ARC_HEIGHT_PX`, `ROCK_RETURN_SPEED_PX_PER_SEC`, `ROCK_CHARGE_TWEEN_DURATION_MS`, `ROCK_DROP_DISTANCE_PX`, `ARROW_LENGTH_PX`, `PLAYER_THROW_OFFSETS`
- [ ] Constructor: takes `scene`, `grid`, `playerEntity` references
- [ ] `isActive(): boolean` — state !== 'idle'
- [ ] `isPlayerLocked(): boolean` — state === 'charging' || state === 'aiming'
- [ ] `isAiming(): boolean` — state === 'aiming'
- [ ] `activate(): void` — start charge state
- [ ] Store `lastKnownHealth` for damage polling
- [ ] Store references: `chargeTween`, `activeProjectile`, `arrowGraphics`

### Task 2.2: Implement charging state
- [ ] Play player `throw_${dir}` animation, freeze at frame 2
- [ ] Tween rock sprite from current position to player + offset (300ms)
- [ ] Each frame: check button held, check health change
- [ ] On tween complete + button held → transition to aiming
- [ ] On tween complete + button released → transition to throwing
- [ ] On button released before tween complete → kill tween, transition to throwing
- [ ] On damage → cancel (drop rock, transition to returning)

### Task 2.3: Implement aiming state
- [ ] Hold player at throw_${dir} frame 2
- [ ] Read joystick input for direction (8-dir for anim, continuous for arrow)
- [ ] On direction change: update animation, reposition rock to new offset
- [ ] Create and draw arrow Graphics each frame (30px, blue, arrowhead)
- [ ] On button release → destroy arrow, transition to throwing
- [ ] On damage → destroy arrow, cancel

### Task 2.4: Implement throwing state
- [ ] Continue throw animation from frame 2 to end
- [ ] Create RockProjectileEntity (Task 3.1)
- [ ] Hide pet rock sprite
- [ ] On projectile hit/land callback → capture position, transition to returning
- [ ] Guard: `if (this.state !== 'throwing') return;` in callback

### Task 2.5: Implement returning state
- [ ] Manual lerp rock sprite toward player position each frame
- [ ] Speed: ~600px/s (arrives in <500ms from max distance)
- [ ] On arrival (distance < 5px) → transition to idle
- [ ] Idle transition: unlock movement, resume PetFollowComponent, show rock sprite

### Task 2.6: Implement onDestroy cleanup
- [ ] Destroy active projectile entity
- [ ] Destroy arrow Graphics
- [ ] Kill charge tween
- [ ] Unlock player movement
- [ ] Resume PetFollowComponent

**Dependencies:** Task 1.1, 1.2
**Estimated Time:** 3 hours

---

## Phase 3: Rock Projectile Entity

### Task 3.1: Create RockProjectileEntity factory
**File:** `src/ecs/entities/pet/RockProjectileEntity.ts`
- [ ] TransformComponent at launch position
- [ ] SpriteComponent with rock idle frame texture
- [ ] ShadowComponent at ground level
- [ ] ProjectileComponent: direction, speed 500px/s, maxDistance 250px, grid, startLayer from player
- [ ] CollisionComponent: collidesWith ['enemy', 'breakable'], 20 damage
- [ ] DamageComponent(20)
- [ ] Custom arc component or inline: interpolate visualOffsetYPx from -50 to 0 over flight
- [ ] onWallHit callback → notify RockThrowAbility
- [ ] onMaxDistance callback → notify RockThrowAbility
- [ ] onHit callback → notify RockThrowAbility, destroy projectile next frame

### Task 3.2: Implement arc motion
- [ ] Track distance traveled as fraction of max distance
- [ ] Set sprite visualOffsetYPx = -sin(progress * π) * THROW_ARC_HEIGHT_PX
- [ ] Shadow stays at ground level (no offset)

**Dependencies:** Task 2.4
**Estimated Time:** 1.5 hours

---

## Phase 4: Integration

### Task 4.1: Add RockThrowAbility to pet entity
**File:** `src/ecs/entities/pet/PetEntity.ts`
- [ ] Import RockThrowAbility
- [ ] If config.id === 'rock': add RockThrowAbility component
- [ ] Add to update order (after PetFollowComponent, before AnimationComponent)

### Task 4.2: Wire PetAbilityComponent routing
**File:** `src/ecs/components/pet/PetAbilityComponent.ts`
- [ ] Add `else if (config.id === 'rock')` block
- [ ] Get RockThrowAbility from pet entity
- [ ] Check isActive(), call activate()

### Task 4.3: Export new components
**File:** `src/ecs/index.ts`
- [ ] Export RockThrowAbility

**Dependencies:** Phase 1, 2, 3
**Estimated Time:** 0.5 hours

---

## Phase 5: Polish & Testing

### Task 5.1: Arrow indicator visual
- [ ] Blue gradient line (light → dark blue)
- [ ] Small arrowhead at tip
- [ ] 30px length from player center
- [ ] Continuous angle from joystick (not locked to 8-dir)
- [ ] Depth above player

### Task 5.2: Manual testing
- [ ] Normal throw flow (charge → aim → throw → return)
- [ ] Quick throw (release during charge)
- [ ] Direction change during aim
- [ ] Throw hits enemy (20 damage applied)
- [ ] Throw hits breakable
- [ ] Throw hits wall (returns immediately)
- [ ] Cancel on player damage
- [ ] Punch blocked during throw
- [ ] Cooldown works after throw
- [ ] Touch controls (hold detection)
- [ ] Pet despawn during throw (no crash)

### Task 5.3: Build and lint
- [ ] `npm run build` passes
- [ ] `npx eslint src --ext .ts` passes

**Dependencies:** Phase 4
**Estimated Time:** 1 hour

---

## Total Estimated Time: ~7.5 hours

## Critical Path
Task 1.1 → Task 2.1 → Task 2.2 → Task 2.3 → Task 2.4 → Task 3.1 → Task 4.1 → Task 5.2

## Risk Areas
- Arrow indicator perspective (may need iteration to look good)
- Touch hold detection (cross-scene communication)
- Arc motion visual quality (may need tuning)
- PLAYER_THROW_OFFSETS tuning (all 0,0 initially)
