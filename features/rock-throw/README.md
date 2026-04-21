# Rock Throw Ability — Implementation Guide

## For New Kiro Sessions

### Quick Start
Say: "implement the rock throw ability from features/rock-throw/"

### What's Already Done
- [x] Feature design (design.md)
- [ ] Runtime analysis
- [ ] Failure analysis
- [ ] Task breakdown
- [ ] Implementation

### Key Documents (Read in Order)
1. README.md (this file)
2. design.md — Full design with state machine, components, data flow

### Critical Design Decisions
- Uses `ProjectileComponent` for wall/layer collision (proven pattern)
- Follows `DogBarkAbility` pattern for state machine on pet entity
- Movement lock via `WalkComponent` (same pattern as super punch)
- `PetFollowComponent.setBarking()` pauses pet follow (existing mechanism)
- Arrow indicator uses `Phaser.GameObjects.Graphics` (blue gradient, 30px)
- Rock arc is visual-only Y offset (like super punch rise), not transform change
- `PLAYER_THROW_OFFSETS` all 0,0 initially — will be tuned after implementation

### Key Patterns from Codebase
- **Pet ability routing:** `PetAbilityComponent.tryAbility()` → check pet ID → get ability component → activate
- **Pet pause:** `PetFollowComponent.setBarking(true/false)` 
- **Movement lock:** `WalkComponent` checks `isMovementLocked()` / `getChargeSpeedMultiplier()`
- **Projectile collision:** `ProjectileComponent` + `CollisionComponent` + `DamageComponent`
- **Player throw anim:** `throw_${Direction}`, 7 frames, 0.08s/frame, frames at indices 463-518
