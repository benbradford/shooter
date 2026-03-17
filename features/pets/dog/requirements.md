# Dog Bark Ability - Requirements

## Overview

The dog pet's special ability: walk toward the nearest enemy and bark, causing a fear state on nearby enemies. Enemies in fear flee from the dog for 4 seconds.

## Clarifying Questions & Answers (Assumed)

1. **Does the dog walk to the enemy or bark from current position?** → Dog walks toward nearest enemy, stops within bark range, then barks
2. **Can the player move while the dog is barking?** → Yes, the dog acts independently during the bark sequence
3. **What happens if the target enemy dies mid-approach?** → Dog barks anyway
4. **Does the bark interrupt the dog's follow behavior?** → Yes, bark takes priority; dog resumes following after bark completes
5. **Can bark be used again while dog is mid-bark?** → No, cooldown starts after bark animation completes
6. **Does fear stack if barked at twice?** → No, resets the 4-second timer
7. **What if enemy is already in a death state?** → Skip, don't apply fear to dying enemies
8. **Does the dog need line-of-sight to enemies?** → No, pure distance check, but pathfinder should be used to ensure the dog doesn't get stuck on geometry whilst trying to approach the enemy
9. **What's the bark animation duration?** → 6 frames at ~10fps = ~600ms
10. **Does the 400px check use dog position or player position?** → Dog position (the icon visibility check uses dog-to-nearest-enemy distance)

## Phase 1: Dog Bark Ability Core

### 1.1 Ability Activation

**Purpose**: Replace the placeholder `console.log` in PetAbilityComponent with actual dog bark behavior

**Behavior**:
- When H key pressed / action button touched (existing trigger)
- Check: dog pet is selected AND active AND not on cooldown
- Check: nearest enemy within 400px of dog's current position
- If no enemy in range → ability does not activate, icon hidden
- If enemy in range → dog enters bark sequence

**Acceptance Criteria**:
- Ability only activates when enemy within 400px of dog
- HUD icon hidden when no enemy in range (alpha 0.2)
- HUD icon uses `public/assets/pets/dog/dog/bark_icon.png`
- 3-second cooldown after bark completes

### 1.2 Dog Bark Sequence

**Purpose**: Dog walks to nearest enemy and plays bark animation

**Sequence**:
1. Dog stops following player
2. Dog walks toward nearest enemy (using direct movement, same speed as follow)
3. When within 100px of target → dog stops, faces enemy
4. Dog plays bark animation (`bark_${direction}`, 'once' style, ~600ms)
5. Fear applied to all enemies within 600px of dog at moment of bark
6. Dog resumes following player

**Acceptance Criteria**:
- Dog walks smoothly toward target enemy
- Bark animation plays once through (6 frames)
- Fear radius is 600px from dog position at bark time
- Dog returns to follow behavior after bark

### 1.3 Bark Icon on HUD

**Purpose**: Show bark-specific icon instead of generic pet icon

**Behavior**:
- Load `bark_icon.png` from `public/assets/pets/dog/dog/bark_icon.png`
- Show on PetActionButtonComponent when dog is selected
- Alpha 0.2 when no enemy in 400px range OR on cooldown
- Alpha 0.4 when available (enemy in range, off cooldown)
- Alpha 0.9 when pressed

**Acceptance Criteria**:
- Icon changes based on selected pet
- Visibility reflects enemy proximity

## Phase 2: Fear State

### 2.1 FearComponent

**Purpose**: Generic component that makes an entity flee from a source position

**Behavior**:
- Stores: source position (where bark happened), duration (4000ms), elapsed time
- When active: overrides enemy state machine → enemy moves away from source position
- Movement: enemy walks in opposite direction from source at 1.2x their normal speed
- Adds slight random offset to direction (±15°) for natural zig-zag
- Respects grid collision (walls, blocked cells)
- After duration expires: enemy returns to their normal state

**Affected enemy types** (have `'enemy'` tag, excluding bugbase):
- bug, skeleton, puma, thrower, stalking_robot, bulletDude

**NOT affected**:
- bugbase (stationary, no movement)

**Acceptance Criteria**:
- Enemies flee away from bark source
- Movement respects walls/collision
- Fear lasts exactly 4 seconds
- Enemy resumes normal behavior after fear ends
- BugBase is immune

### 2.2 Fear State Integration with Enemy State Machines

**Purpose**: Each enemy type needs a fear state in their state machine

**Approach**: Add a `'fear'` state to each enemy's StateMachine that:
- Plays the enemy's walk animation (facing away from source)
- Moves the entity away from the fear source using GridCollisionComponent
- After 4 seconds, transitions back to the enemy's default idle/patrol state

**Acceptance Criteria**:
- Each affected enemy type has a fear state
- Transition to fear interrupts current behavior
- Transition out of fear returns to appropriate state

## Phase 3: Visual Feedback

### 3.1 Fear Icon Above Enemy

**Purpose**: Show a shock/fear icon above frightened enemies

**Behavior**:
- Pale yellow jagged "shock" sprite above enemy head using public/assets/pets/dog/dog/fear_icon.png
- Scale animation: 0 → 120% → 100% over 200ms on appear
- Subtle jitter while active (±1px random offset per frame)
- Fade out over 300ms when fear ends
- Positioned above enemy sprite, does not overlap

**Acceptance Criteria**:
- Icon clearly visible above each feared enemy
- Smooth appear/disappear animations
- Does not obscure gameplay

### 3.2 Bark Wave Effect

**Purpose**: Visual feedback connecting dog bark to enemy reaction

**Behavior**:
- Expanding circular ring centered on dog when bark fires
- White/grey color, slight transparency (alpha 0.3 → 0)
- Expands from 0 to 600px radius over 400ms then disappears
- Uses Phaser Graphics (circle stroke, no texture needed)

**Acceptance Criteria**:
- Ring expands from dog position
- Matches fear radius visually
- Fades out cleanly

### 3.3 White Flash on Fear Apply

**Purpose**: Brief flash on enemies when fear is first applied

**Behavior**:
- Use existing HitFlashComponent pattern with white tint (0xffffff)
- Flash duration: 150ms
- Single flash, no repeat

**Acceptance Criteria**:
- Brief white flash on each affected enemy
- Does not interfere with existing hit flash (red)

## Non-Requirements (Deferred)

- Particle effects (dust/sweat) — can add later for polish
- Screen shake — too disruptive for a pet ability
- Desaturation/tint during fear — adds complexity, icon is sufficient
- Fear immunity cooldown — enemies can be feared again immediately after recovery

## Files to Create

- `src/ecs/components/pet/DogBarkAbility.ts` — Bark sequence logic
- `src/ecs/components/combat/FearComponent.ts` — Generic fear state
- `src/ecs/entities/common/EnemyFearState.ts` — Shared fear state for enemy state machines

## Files to Modify

- `src/ecs/components/pet/PetAbilityComponent.ts` — Route to DogBarkAbility
- `src/ecs/entities/pet/PetAnimations.ts` — Add bark animation creation
- `src/ecs/components/pet/PetFollowComponent.ts` — Add bark mode (stop following, walk to target)
- `src/ecs/entities/pet/PetConfig.ts` — Add bark-related config
- `src/ecs/components/ui/PetActionButtonComponent.ts` — Enemy proximity check for icon visibility
- `src/assets/AssetRegistry.ts` — Add bark_icon asset
- Enemy entity files (skeleton, bug, puma, thrower, robot, bulletDude) — Add fear state to state machines

## Success Criteria

- [ ] Dog walks toward nearest enemy when ability activated
- [ ] Dog plays bark animation facing the enemy
- [ ] Enemies within 600px enter fear state and flee for 4 seconds
- [ ] BugBase is immune to fear
- [ ] Fear icon appears above frightened enemies
- [ ] Bark wave ring expands from dog
- [ ] White flash on feared enemies
- [ ] HUD icon shows bark_icon.png, hidden when no enemy in range
- [ ] 3-second cooldown between barks
- [ ] Dog resumes following player after bark
- [ ] Enemies respect collision while fleeing
- [ ] Build and lint pass with zero errors
