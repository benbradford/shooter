# Pet System - Requirements

## Overview

Pets are companion entities that follow the player around the world. The player can collect pets, select one active pet at a time, and use pet-specific abilities via a repurposed action button. Pets use pathfinding to follow the player and play directional idle/walk animations.

## Phase 1: Core Pet Entity & Following

### 1.1 Pet Entity Type

**Purpose**: Define pet as a new entity type that follows the player

**Properties**:
- `type`: `'pet'` — not spawned from level JSON; spawned programmatically based on WorldState flags
- Each pet has a spritesheet with metadata defining animation frame ranges
- Pets have NO collision (player and enemies walk through them)
- Pets have NO grid position component (they move freely in world space)
- Pets render at `Depth.player - 1` (behind player)

**Acceptance Criteria**:
- Pet entity spawns at player position
- Pet renders with correct spritesheet
- Pet does not block movement
- Pet does not interact with collision system

### 1.2 Pet Following Behavior

**Purpose**: Pet follows the player using pathfinding

**Behavior**:
- Pet uses `Pathfinder` to navigate toward the player
- Speed matches player walk speed (`300 px/sec`)
- When within 30px of player center, pet stops and enters idle pose
- Path recalculates every 500ms while following
- Pet faces the direction of travel while walking
- Pet faces the player while idle

**Direction Mapping**:
- Rock: 4 directions only (east, north, south, west). Map 8-direction `Direction` enum to nearest 4-direction equivalent.
- Dog: 8 directions (east, north, north-east, north-west, south, south-east, south-west, west)

**Acceptance Criteria**:
- Pet follows player smoothly
- Pet stops within 30px of player
- Pet plays walk animation while moving
- Pet plays breathing-idle animation while stopped
- Direction matches movement direction

### 1.3 Pet Too Far Away

**Purpose**: Handle pet getting left behind

**Behavior**:
- Pet tries to stay within 128px of player
- If pet is > 800px from player center, teleport to player position instantly
- Pet enters idle state after teleport

**Acceptance Criteria**:
- Pet teleports when distance exceeds 800px
- Pet appears at player position after teleport
- Pet enters idle state after teleport

### 1.4 Pet Animations

**Purpose**: Play correct animations from spritesheet metadata

**Animation Sources** (from `*_spritesheet_metadata.json`):

**Rock** (48x48 frames, 4 directions):
- `breathing-idle`: 4 frames per direction (east/north/south/west)
- `walking`: 5 frames per direction

**Dog** (32x32 frames, 8 directions):
- `breathing-idle`: 8 frames per direction (all 8 directions)
- `walk`: 8 frames per direction

**Acceptance Criteria**:
- Animations created from metadata frame ranges
- Correct animation plays for current state and direction
- Smooth transitions between idle and walk

## Phase 2: Pet Selection & HUD

### 2.1 Pet Collection via WorldState

**Purpose**: Track which pets the player has collected

**WorldState Flags**:
- `pet_rock_collected`: `"true"` / `"false"` (or absent)
- `pet_dog_collected`: `"true"` / `"false"` (or absent)
- `pet_selected`: `"rock"` / `"dog"` / `""` (empty = none selected)

**Behavior**:
- On level load, check flags to determine available pets
- Spawn active pet entity if one is selected
- Persist selection across level transitions

**Acceptance Criteria**:
- Flags read correctly from WorldState
- Pet spawns on level load if selected
- Selection persists across transitions

### 2.2 Pet Selection Carousel (HUD)

**Purpose**: Allow player to cycle through collected pets

**Layout**:
- Single pet icon visible on screen at top-center
- If player has multiple pets, show left/right scroll arrows
- Clicking arrows cycles through collected pets
- Only one pet visible at a time; others are off-screen

**Controls**:
- Two small arrow buttons at top of screen (left/right of pet icon)
- Left arrow: cycle to previous pet
- Right arrow: cycle to next pet
- Arrows only visible if player has > 1 pet

**Icon Behavior**:
- Icon is small pet portrait sprite
- Selected icon is fully opaque
- When cycling, old icon slides off-screen, new icon slides in

**Acceptance Criteria**:
- Carousel shows selected pet icon
- Cycling changes visible icon
- Arrow buttons only show when multiple pets collected
- Smooth slide animation when cycling

### 2.3 Pet Swap Animation

**Purpose**: Animate pet entity swap when selection changes

**Behavior**:
- Deselected pet: rises quickly upward off screen (tween y, alpha → 0, ~300ms)
- New pet: descends from above to player position (tween y, alpha 0 → 1, ~300ms)
- During swap animation, pet ability is disabled

**Acceptance Criteria**:
- Old pet fades out upward
- New pet fades in downward
- No pet ability during transition
- Smooth visual transition

## Phase 3: Action Button Repurpose

### 3.1 Replace Slide with Pet Action

**Purpose**: Repurpose the H-key / slide action for pet abilities

**Current**: `InputComponent.isSlidePressed()` → `SlideAbilityComponent.trySlide()`
**New**: `InputComponent.isPetActionPressed()` → `PetAbilityComponent.tryAbility()`

**Behavior**:
- H key triggers pet ability instead of slide
- Each pet has a unique cooldown
- For now: `console.log('[PET] <petName> ability activated!')`
- Cooldown shown on action icon (same pattern as slide cooldown)

**Ability Disabled When**:
- Player is punching
- Player is swimming
- Pet is > 250px from player

**Acceptance Criteria**:
- H key triggers pet ability
- Cooldown prevents spam
- Console log confirms activation
- Slide ability removed from player
- Button disabled when punching, swimming, or pet too far

### 3.2 Pet Action Icon

**Purpose**: Show pet-specific icon on HUD for ability activation

**Behavior**:
- Replaces slide icon position/behavior
- Icon changes based on selected pet
- Shows cooldown overlay (radial or opacity)
- Fades out when disabled (punching, swimming, or pet > 250px)

**Acceptance Criteria**:
- Icon matches selected pet
- Cooldown visual feedback
- Fades when unavailable

## Phase 4: Water Interaction

### 4.1 Pet Hides in Water

**Purpose**: Pets cannot follow player into water

**Behavior**:
- When player enters water (swimming state), active pet rises up off screen (same as deselect animation)
- Pet action icon fades out
- When player exits water, pet descends back to player position
- Pet does NOT pathfind through water cells

**Acceptance Criteria**:
- Pet disappears when player swims
- Pet reappears when player exits water
- Action icon disabled during water
- Pet avoids water cells in pathfinding

## Non-Requirements (Deferred)

- Pet special power implementation (just console.log for now)
- Finding/collecting pets in the world (use WorldState flags manually)
- Pet combat interactions (pets don't take or deal damage)
- Editor integration for pets
- Pet persistence across save/load (beyond WorldState flags)

## Files to Create

- `src/ecs/entities/pet/PetEntity.ts` — Factory function
- `src/ecs/entities/pet/PetAnimations.ts` — Animation creation from metadata
- `src/ecs/components/pet/PetFollowComponent.ts` — Pathfinding follow behavior
- `src/ecs/components/pet/PetAbilityComponent.ts` — Ability cooldown stub
- `src/systems/PetManager.ts` — Singleton managing active pet, selection, spawning
- `src/ecs/components/ui/PetCarouselComponent.ts` — HUD carousel for pet selection
- `src/ecs/components/ui/PetActionButtonComponent.ts` — HUD action button for pet ability

## Files to Modify

- `src/assets/AssetRegistry.ts` — Add pet asset groups
- `src/assets/AssetLoader.ts` — Load pet assets
- `src/scenes/GameScene.ts` — Initialize PetManager, spawn pet
- `src/scenes/HudScene.ts` — Add pet carousel and action button
- `src/ecs/entities/hud/JoystickEntity.ts` — Add pet UI components
- `src/ecs/entities/player/PlayerEntity.ts` — Remove SlideAbilityComponent, add PetAbilityComponent
- `src/ecs/entities/player/PlayerIdleState.ts` — Replace slide with pet ability
- `src/ecs/entities/player/PlayerWalkState.ts` — Replace slide with pet ability
- `src/ecs/entities/player/PlayerStateHelpers.ts` — Replace handleSlideInput with handlePetAbilityInput
- `src/ecs/components/input/InputComponent.ts` — Replace isSlidePressed with isPetActionPressed
- `src/systems/WorldState.ts` — (no change needed, uses existing flags system)
