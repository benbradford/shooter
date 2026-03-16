# Pet System Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the pet system from features/pets/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [ ] Phase 0: Remove slide ability
- [ ] Phase 1: Core pet entity & animations
- [ ] Phase 2: PetManager & GameScene integration
- [ ] Phase 3: HUD components
- [ ] Phase 4: Water interaction
- [ ] Phase 5: Testing

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **requirements.md** - What the system does
3. **design.md** - How it works
4. **tasks.md** - Implementation breakdown

### Critical Design Decisions

1. **No collision** - Pets are ghost-like, player and enemies walk through them
2. **Custom AnimationSystem** - Uses our own Animation/AnimationSystem (frame index strings), NOT Phaser's scene.anims. Matches player entity pattern.
3. **Metadata-driven animations** - Frame ranges read from `*_spritesheet_metadata.json` at runtime
4. **Direction mapping** - Rock (4-dir) maps 8 Direction enum values to 4 cardinal directions. Dog uses all 8.
5. **PetManager singleton** - Central coordinator for pet lifecycle, selection, spawning
6. **Replaces slide** - SlideAbilityComponent removed entirely, replaced by PetAbilityComponent
7. **Always-loaded assets** - Pet spritesheets are small (~24KB total), loaded as core assets
8. **WorldState flags** - `pet_rock_collected`, `pet_dog_collected`, `pet_selected` control availability
9. **Pathfinder following** - Recalculates path every 500ms, stops within 30px of player
10. **Water hides pet** - Pet rises off screen when player enters water, descends back on exit

### Implementation Order

**Phase 0: Remove Slide** (1 hour)
- Remove SlideAbilityComponent from player
- Replace with PetAbilityComponent stub
- Update PlayerIdleState, PlayerWalkState, PlayerStateHelpers

**Phase 1: Core Pet Entity** (2.5 hours)
- PetConfig registry
- PetAnimations from metadata
- PetFollowComponent (pathfinding)
- PetEntity factory
- Asset registration

**Phase 2: PetManager & Integration** (1.5 hours)
- PetManager singleton
- GameScene integration
- PetAbilityComponent

**Phase 3: HUD Components** (2 hours)
- PetCarouselComponent (icon cycling)
- PetActionButtonComponent (ability trigger)
- JoystickEntity integration

**Phase 4: Water Interaction** (30 minutes)
- Detect water entry/exit
- Hide/show pet with tweens

**Phase 5: Testing** (1.5 hours)
- Manual testing all features

### Success Criteria

- [ ] Pet spawns at player position on level load
- [ ] Pet follows player using pathfinding
- [ ] Pet stops within 128px and plays idle animation
- [ ] Pet teleports if > 800px away
- [ ] Pet plays walk animation while following
- [ ] 4-direction mapping works for rock
- [ ] 8-direction mapping works for dog
- [ ] Pet ability disabled when punching, swimming, or pet > 250px away
- [ ] Pet hides when player enters water
- [ ] Pet reappears when player exits water
- [ ] Carousel shows single icon with scroll arrows (if > 1 pet)
- [ ] Cycling slides icons in/out smoothly
- [ ] H key logs pet ability message with cooldown
- [ ] Pet persists across level transitions
- [ ] Slide ability fully removed
- [ ] Build and lint pass with zero errors

### Files to Create

- `src/ecs/entities/pet/PetConfig.ts`
- `src/ecs/entities/pet/PetAnimations.ts`
- `src/ecs/entities/pet/PetEntity.ts`
- `src/ecs/components/pet/PetFollowComponent.ts`
- `src/ecs/components/pet/PetAbilityComponent.ts`
- `src/systems/PetManager.ts`
- `src/ecs/components/ui/PetCarouselComponent.ts`
- `src/ecs/components/ui/PetActionButtonComponent.ts`

### Files to Modify

- `src/assets/AssetRegistry.ts`
- `src/assets/AssetLoader.ts`
- `src/scenes/GameScene.ts`
- `src/scenes/HudScene.ts`
- `src/ecs/entities/hud/JoystickEntity.ts`
- `src/ecs/entities/player/PlayerEntity.ts`
- `src/ecs/entities/player/PlayerIdleState.ts`
- `src/ecs/entities/player/PlayerWalkState.ts`
- `src/ecs/entities/player/PlayerStateHelpers.ts`
- `src/ecs/components/input/InputComponent.ts`
- `src/ecs/components/movement/WalkComponent.ts`

### Common Pitfalls

1. **Don't use Phaser's scene.anims** - Use our custom AnimationSystem with frame index strings
2. **Don't add GridPositionComponent** - Pets move freely in world space
3. **Don't add collision components** - Pets are ghost-like
4. **Cache metadata JSON** - Fetch once, reuse across level transitions
5. **Track water state transitions** - Compare current vs previous frame, not just current state
6. **Direction mapping for 4-dir** - Diagonals map to nearest cardinal (DownRight → east, UpLeft → west, etc.)

Good luck! 🚀
