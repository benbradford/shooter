# Dog Bark Ability

## Overview

The dog pet's special ability: walk toward the nearest enemy and bark, causing a fear state on nearby enemies for 4 seconds.

## Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **requirements.md** - What the system does
3. **design.md** - How it works
4. **tasks.md** - Implementation breakdown

## Critical Design Decisions

1. **DogBarkAbility lives on pet entity** — not the player
2. **EnemyFearState is shared** — single IState class for all enemy types
3. **FearComponent manages icon lifecycle** — create on add, destroy on remove
4. **Fear applied at bark start** — not midpoint, simpler and more responsive
5. **isBarking flag on PetFollowComponent** — pauses follow behavior during bark
6. **Frame-based enemies use onFlee callback** — bug and robot don't use Phaser anims
7. **BugBase immune** — stationary, excluded by entity ID check
8. **No particles** — deferred for polish, icon + wave + flash is sufficient

## Implementation Order

**Phase 1: Core Bark Ability** (2 hours)
- Bark animations in PetAnimations.ts
- isBarking flag on PetFollowComponent
- DogBarkAbility component
- Add to PetEntity, route from PetAbilityComponent

**Phase 2: Fear State** (1.5 hours)
- EnemyFearState shared IState
- FearComponent with icon management
- Add fear state to all 6 enemy types

**Phase 3: HUD & Assets** (30 minutes)
- Register bark_icon and fear_icon
- Update PetActionButtonComponent

**Phase 4: Testing** (1 hour)

**Total: ~5 hours**

## Files to Create

- `src/ecs/components/pet/DogBarkAbility.ts`
- `src/ecs/components/combat/FearComponent.ts`
- `src/ecs/entities/common/EnemyFearState.ts`

## Files to Modify

- `src/ecs/entities/pet/PetAnimations.ts`
- `src/ecs/components/pet/PetFollowComponent.ts`
- `src/ecs/entities/pet/PetEntity.ts`
- `src/ecs/components/pet/PetAbilityComponent.ts`
- `src/ecs/components/ui/PetActionButtonComponent.ts`
- `src/assets/AssetRegistry.ts`
- `src/main.ts`
- `src/ecs/entities/skeleton/SkeletonEntity.ts`
- `src/ecs/entities/bug/BugEntity.ts`
- `src/ecs/entities/puma/PumaEntity.ts`
- `src/ecs/entities/thrower/ThrowerEntity.ts`
- `src/ecs/entities/robot/StalkingRobotEntity.ts`
- `src/ecs/entities/bulletdude/BulletDudeEntity.ts`

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
