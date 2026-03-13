# Quick Reference Guide

## ⚠️ MANDATORY: After Every Code Change ⚠️

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

## Player Combat System

**Attack Button:** Fixed at 85% camera width, 85% camera height. Touch/click or Space to punch.

**Punch Mechanics:**
- Range: 128px, Damage: 20, Duration: 250ms
- Hitbox spawns 150ms into animation
- Finds nearest enemy, player faces them
- Respects layer boundaries (can't hit different layers unless on stairs)

**Hold-to-Repeat:**
- Tap: Single punch, can move
- Hold: Auto-repeats every 250ms after first completes
- Movement locked during repeat punches
- Release: Returns to idle

**Slide Ability:**
- Press H or tap slide button
- 250px slide at 400px/s, invulnerable during slide
- 3 second cooldown
- Button alpha: 0.7 unpressed, 0.9 pressed, 0.3 cooldown

**Debug Mode (Press P):**
- Toggle `mustFaceEnemy` (false = 128px radius, true = 108° FOV cone)
- Press C to visualize FOV cone

## NPC System

**Interaction Range:** 80px from NPC center to player collision box center

**Lips Icon:** Appears when player is in range of interactable NPC, replaces punch icon

**Lua Helpers:**
- `faceEachOther()` - NPCs and player face each other (auto-waits 16ms for velocity to stop)
- `restoreDirections()` - Restore original facing directions
- `npc.name()` - Returns NPC's name from JSON (or "NPC")
- `player.name()` - Returns "Player"
- `npc.look(direction)` - Change NPC facing ("down", "up_left", etc.)
- `player.look(direction)` - Change player facing

**NPC Properties in JSON:**
- `assets`: Spritesheet key (e.g., "npc1")
- `direction`: Facing direction ("Down", "Left", etc.)
- `scale`: Optional size multiplier (default 1)
- `name`: Optional display name for dialogue
- `interactions`: Array of interaction objects with name, flag conditions, position overrides

**Editor:** Press E → Add → NPC → Select asset → Click to place. Click NPC to edit direction (8-direction grid) and interactions (JSON textarea).

## Adding Assets

1. Add sprite sheet to `public/assets/`
2. Register in `src/assets/AssetRegistry.ts`
3. Add to `src/assets/AssetLoader.ts` default assets list

## Creating Entities

1. Create factory function in `src/entityType/`
2. Add necessary components
3. Set update order (order matters!)

## Entity Positioning

**Key Principle:** Derive all values from `grid.cellSize` to minimize magic numbers.

**Two Collision Boxes:**
1. **Grid Collision** - For wall/grid collision (GridPositionComponent)
   - **CRITICAL:** Must be centered (`offsetX: 0`) to prevent layer crossing
   - Height ≤ 50% of cell size
2. **Entity Collision** - For entity-to-entity (CollisionComponent)
   - Use negative offsets to center: `-size / 2`

**Common sizes:**
- Small (robot): `width: 32, height: 16`
- Medium (player): `width: 48, height: 32`
- Large (boss): `width: 64, height: 64`

## Creating Components

1. Define props interface - all required, no defaults
2. Implement Component interface with props-based constructor
3. Export from `src/ecs/index.ts`

## Adding Triggers

Triggers fire events when player walks into them. Use editor: Press E → Trigger button → select cells → Add Trigger.

## Debug Controls

- **G** - Toggle grid debug (layers, transitions, triggers)
- **C** - Toggle collision boxes
- **P** - Toggle punch targeting mode
- **V** - Toggle HUD visibility
- **Y** - Save world state
- **E** - Enter level editor

## Managing Entities

Use EntityManager - all entities in one place. Query by type, automatic cleanup of destroyed entities.

## Projectile Collision

**See grid-and-collision.md for complete rules.**

Key: Walls never block bullets. Bullets blocked by platforms based on layer and stair traversal direction.

## Layer Collision Helper

Use `canPlayerHitEnemy()` for player attacks across layers:
- Player on stairs → Always hits
- Same layer → Hits
- Different layer, not on stairs → Doesn't hit

## Health Regeneration

Player only: After 3 seconds without damage, regens at 20 HP/sec.

## Hit Flash Effect

Entities flash when taking damage. Color customizable (default red, green for bugs).

**Critical:** HitFlashComponent must be BEFORE SpriteComponent in update order.

## Water System

- Player swims at 70% speed
- Uses larger collision box (64×64) to prevent sprite overlap
- Ripples every 150ms, shadow fades to 30% alpha
- River current applies force, stops near blockers
- Water + blocked = impassable obstacles
- Water + bridge = walk over at full speed

## Touch Joystick

- Movement: 20% from left, 75% from top
- Aim: 80% from left, 50% from top
- Recalculate positions every frame until first interaction (Android fix)

## Sprite Sheets

**Attacker** (player): 672×2072, 56×56 frames
- Frames 0-7: Idle (alphabetical order, NOT Direction enum order)
- Frames 8-55: Cross-punch
- Frames 56-87: Walking
- Frames 116-163: Slide

See `attacker-spritesheet-reference.md` for complete mapping.

## Component Update Order

**Standard order:**
1. TransformComponent
2. HitFlashComponent (before sprite)
3. SpriteComponent
4. InputComponent
5. WalkComponent
6. GridCollisionComponent
7. StateMachineComponent
8. AnimationComponent

## Troubleshooting

### Player Spawning at Wrong Position
**Cause:** GridCollisionComponent initializes previousX/Y to (0,0), thinks player is moving from origin.
**Fix:** Component now initializes to actual starting position on first frame.

### Overheat System Not Working
**Cause:** Multiple issues with canFire() checks and overheat lock.
**Fix:** Added `isOverheated` flag that locks gun until fully reloaded.

### Sprite Shattering Effect
Divide sprite into 3×3 grid, use physics-based motion with randomness. Use absolute position calculation to prevent rotation affecting trajectory.

### Coin and Medipack Pickups
- Coins: Physics-based, fly to HUD, 15s lifetime
- Medipacks: Gradual healing (50 HP/sec for 2s), overheal up to 200, 15s lifetime
- Overheal: 1.5× movement speed, 2× punch speed, decays at 5 HP/sec

### Particle Effects
- Use physics-based motion (velocity + gravity), not sine waves
- Set depth based on context (behind/in front of player)
- Use simple phase management, not StateMachine

### Varied Particle Textures
Sample 6 random pieces from center 40% of texture, create runtime spritesheet.

## Performance Tips

- Use sprite sheets
- Limit entities updated per frame
- Object pooling for frequently spawned entities
- Profile with browser DevTools
- Compress assets with `sips -Z <size>`
