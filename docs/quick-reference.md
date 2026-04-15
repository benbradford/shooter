# Quick Reference Guide

## ⚠️ MANDATORY: After Every Code Change ⚠️

```bash
npm run build                # MUST pass with zero errors
```

**Only run linter when explicitly asked or before committing code.**

## Android Deployment

**Only deploy to Android when user explicitly asks: "build for android" or "deploy to android"**

**ALWAYS run npm run build first, then copy:**

```bash
npm run build
rm -rf android/app/src/main/assets/public/*
cp -r dist/* android/app/src/main/assets/public/
```

Then rebuild in Android Studio.

## Level Transitions

Level transitions work automatically via exit triggers. The system:
- Unloads previous level assets (except core assets and enemy textures)
- Loads new level assets
- Preserves player health, coins, world state
- Filters runtime textures (UUIDs, gradients, tilesets) from unload
- Destroys entities before transition to clean up references

**Key implementation (March 2026):**
- WorldState persists across transitions (only loads from file once)
- URL parameter only used on first load (clears spawn position to use level's playerStart)
- Runtime textures never unloaded (water animations, tilesets)
- Enemy textures never unloaded (have global animations, small size)
- Entities destroyed in LoadingScene.init() before scene.stop()
- Fade uses timeout (500ms) instead of camera callback (more reliable)
- Vignette texture key: 'vignette' (not 'vin')

**Testing:** See `test/tests/loading/` for comprehensive tests including round trips

## Player Combat System

**Attack Button:** Fixed at 89% camera width, 79% camera height. Touch/click or Space to punch.

**Punch Mechanics:**
- Range: 128px, Damage: 20, Duration: 250ms
- Hitbox spawns 150ms into animation
- Finds nearest enemy, player faces them
- Respects layer boundaries (can't hit different layers unless on stairs)

**Hold-to-Repeat:**
- Tap: Single punch, can move
- Hold: Freezes on frame 5 with shake effect, can spin to aim, movement locked
- Release: Hitbox + particles fire, animation completes
- Prepares for future super-punch feature

**Slide Ability:**
- Press H or tap pet action button
- 250px slide at 400px/s, invulnerable during slide
- 3 second cooldown
- Button alpha: 0.9 unpressed, 1.0 pressed, 0.3 cooldown

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
- `npc.playAnim(animKey, repeatType)` - Play custom animation ("once" waits, "repeat" loops)
- `player.look(direction)` - Change player facing
- `player.moveTo(col, row, speed)` - Pathfind player to cell
- `player.teleportTo(col, row)` - Instant move (bypasses pathfinding)
- `setFlag(name, value)` - Set world state flag
- `getFlag(name)` - Get flag value as string (returns `""` if not set)
- `isFlagCondition(name, condition, value)` - Check flag condition
- `saveState()` - Save world state to profile file
- `coins.get()` / `coins.spend(n)` / `coins.obtain(n)` - Coin management
- Inline colors: `<red>`, `<green>`, `<purple>`, `<gold>`, `<cyan>`
- Newlines: `<newline/>`

**⚠️ CRITICAL: NPC Interaction Setup — Two-Part Requirement**

Each interaction needs BOTH:
1. Entry in NPC's `interactions` array (picks which script based on flag conditions)
2. A matching `interaction` entity with `createOnAnyEvent` (loads and runs the Lua file)

Without #2, the lips icon shows but nothing happens. See `entity-creation-system.md` for full example.

**⚠️ `getFlag` returns a string.** Use `tonumber()` in Lua for numeric comparisons.

**NPC Properties in JSON:**
- `assets`: Spritesheet key — `npc1`, `village_old_man`, `village_girl`, `village_wizard`
- `direction`: Facing direction — `"Down"`, `"Left"`, `"UpRight"`, etc., or `"facePlayer"` to always face the player
- `scale`: Optional size multiplier (default 1)
- `name`: Optional display name for dialogue
- `interactions`: Array of interaction objects with name, flag conditions, position overrides

**Adding a new NPC spritesheet:**
1. Place 8 rotation PNGs in `public/assets/npc/{name}/rotations/` (east, north-east, north-west, north, south-east, south-west, south, west)
2. Generate spritesheet: `montage rotations/{east,north-east,north-west,north,south-east,south-west,south,west}.png -tile 8x1 -geometry {W}x{H}+0+0 -background none {name}_spritesheet.png`
3. Register in `src/assets/AssetRegistry.ts` with key, path, type `'spritesheet'`, config `{ frameWidth, frameHeight }`
4. Add asset group: `{name}: ['{name}'] as const` in `ASSET_GROUPS`
5. The asset loader auto-detects NPC assets from level JSON — no other changes needed

**Editor:** Open editor → Entity tool → npc → click to place. Select NPC to edit assets, direction (including facePlayer), name, and interactions.

## Adding Assets

**Background textures (for cells in editor):**
1. Add image to `public/assets/cell_drawables/`
2. Register in `src/assets/AssetRegistry.ts` (key, path, type: `'image'`)
3. Add key to `editor` asset group array in `AssetRegistry.ts`
4. Add key to `BACKGROUND_TEXTURE_KEYS` in `editor/panels/TexturePicker.ts`

**Spritesheets (enemies, player, etc.):**
1. Add sprite sheet to `public/assets/`
2. Register in `src/assets/AssetRegistry.ts`
3. Add to appropriate group in `src/assets/AssetLoader.ts`

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

Triggers fire events when player walks into them. Use editor: Entity tool → trigger → select cells → Add Trigger.

## Pet System

**Enable pets:** Set WorldState flags (`pet_rock_collected`, `pet_selected`)
**Controls:** H key triggers pet ability
**Behavior:** Pet follows using smooth delta-based movement, stops within 128px, teleports if >800px, hides in water
**Movement:** Always uses pathfinding on layer 0, speed lerps between run (300px/s) and wander (60px/s)
**Available pets:** rock (4-dir), dog (8-dir)

See [Pet System](./pets-quick-ref.md) for details.

## Companion (Guide Fragment)

**Enable:** Set WorldState flag `companion_active` to `"true"`
**Sprite:** `narry.png` — floating crystal construct
**Behavior:** Follows ahead-right of player using lerp-based smooth movement. Overshoots slightly when player stops, then corrects. After 2s idle, starts orbiting the player (restless). Teleports if >600px away.
**Visuals:** Soft white-cyan additive glow behind sprite. Dual trail (cyan outer + white inner dots). Subtle alpha flicker every 3-8s.
**Coexists with pet:** Yes, independent system.

**Key files:**
- `src/systems/CompanionManager.ts` — Singleton, flag-activated spawning
- `src/ecs/entities/companion/CompanionEntity.ts` — Entity factory
- `src/ecs/components/companion/CompanionFollowComponent.ts` — Movement logic
- `src/ecs/components/companion/CompanionTrailComponent.ts` — Cyan+white particle trail
- `src/ecs/components/companion/CompanionGlowComponent.ts` — Glow + flicker

## Debug Controls

- **G** - Toggle grid debug (layers, transitions, triggers)
- **C** - Toggle collision boxes
- **P** - Toggle punch targeting mode
- **V** - Toggle HUD visibility
- **Y** - Save world state
- **R** - Reload state from file and reset scene
- **E** - Enter level editor (standalone: `http://localhost:5173/editor/`)
- **H** - Pet ability (if pet active)

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

Player only: After 3 seconds without damage, regens at 20 HP/sec. Regen timer accumulates at 0.3× speed while moving, 1× while still.

## Hit Flash Effect

Entities flash when taking damage. Color customizable (default red, green for bugs).

**Critical:** HitFlashComponent must be BEFORE SpriteComponent in update order.

## Water System

- Water blocks movement unless `canSwim` flag is `"true"` in world state
- Player swims at 70% speed when canSwim enabled
- Uses larger collision box (64×64) to prevent sprite overlap
- Ripples every 150ms, shadow fades to 30% alpha
- River current applies force, stops near blockers
- Water + blocked = impassable obstacles
- Water + bridge = walk over at full speed
- Per-level water config: `rippleSpritesheet` and `splashParticle` in background JSON

## Touch Joystick

- Movement: 9% from left, 45% from top (activates in left 45%, bottom 70%)
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
