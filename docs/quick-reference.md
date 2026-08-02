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
- Preserves player health, coins, world state, facing direction
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

## Fixed Camera Levels

Levels can use a fixed camera that doesn't follow the player. Set `fixedCamera` in level JSON:

```json
{ "fixedCamera": { "centerCol": 15, "centerRow": 10 } }
```

Camera centers on the specified cell and stays there. Editor: Level Info panel → Fixed Camera checkbox + center col/row inputs.

## Player Combat System

**Attack Button:** Fixed at 89% camera width, 79% camera height. Touch/click or Space to punch.

**Punch Mechanics:**
- Range: 128px, Damage: 20, Duration: 250ms
- Hitbox spawns 150ms into animation
- Finds nearest enemy, player faces them
- Direction normalized to unit length (consistent reach on all input devices)
- Respects layer boundaries (can't hit different layers unless on stairs)
- Cancelled if player starts water jump mid-punch; blocked during water jump

**Hold-to-Charge:**
- Tap: Single punch, can move
- Hold (without `hasSuperPunch`): Single punch only, must release and press again for another
- Hold (with `hasSuperPunch`): Freezes on frame 5 with shake effect, charge bar appears above player
- Charge only enters if button was held continuously (releasing and re-pressing won't trigger charge)
- During charge: Player can move at 25% speed, facing direction locked, plays `walking_punch` anim if moving
- Charge bar: Horizontal line (64px) grows from center, yellow→red color, pulses when full
- Release (< 1s): Normal punch, movement locked for punch duration, plays `punch` anim
- Release (≥ 1s + `hasSuperPunch` flag): Super punch — `uppercut` anim at half speed, 3× damage (60), 72×72 hitbox, extravagant particles, movement fully locked during animation
- After release: PlayerIdleState/PlayerWalkState force-replay idle/walk animation (via `wasPunching` flag) to prevent getting stuck on punch frame

**Super Punch:**
- Requires: Hold punch ≥ 1 second AND WorldState flag `hasSuperPunch` = `"true"`
- Animation: `uppercut_${dir}` at half speed
- Damage: 60 (3× normal), Hitbox: 72×72px (vs 44×44 normal)
- Particles: `SuperPunchParticlesComponent` — white/yellow/orange directional burst + radial ring
- Sound: `superpunch.mp3`
- Movement and new punches blocked for full duration
- Charge indicator: `ChargeCircleEffect` (actually a horizontal bar) — destroyed on release regardless of charge level
- Rise effect: Player sprite rises 25px in a sine arc during the uppercut, using `SpriteComponent.visualOffsetYPx`

**Key files:**
- `src/ecs/components/combat/AttackComboComponent.ts` — hold tracking, super punch dispatch
- `src/ecs/components/combat/ChargeCircleEffect.ts` — charge bar visual (line + particles)
- `src/ecs/components/visual/SuperPunchParticlesComponent.ts` — super punch particle effects

**⚠️ `SpriteComponent.visualOffsetYPx`:** Visual-only Y offset that doesn't affect transform, camera, shadow, or collision. Any component that directly sets `sprite.y` (like `WaterEffectComponent`) must add `sprite.visualOffsetYPx` to respect it.

**Slide Ability:**
- Press P or tap pet action button
- Invulnerable during slide
- Has cooldown (button dims during cooldown)

## NPC System

**Interaction Range:** 80px from NPC center to player collision box center

**Lips Icon:** Appears when player is in range of interactable NPC, replaces punch icon

**Lua Helpers:**
- `say(name, text, speed, timeout?)` - Show speech box (timeout defaults to 10000ms if omitted)
- `wait(ms)` - Pause between lines
- `faceEachOther()` - NPCs and player face each other (auto-waits 16ms for velocity to stop)
- `restoreDirections()` - Restore original facing directions
- `celebrate()` - Player power-up animation with directional spin
- `npc.name()` - Returns NPC's name from JSON (or "NPC")
- `player.name()` - Returns "Player"
- `npc.look(direction)` - Change NPC facing ("down", "up_left", etc.)
- `npc.playAnim(animKey, repeatType)` - Play custom animation ("once" waits, "repeat" loops)
- `player.look(direction)` - Change player facing
- `player.moveTo(col, row, speed)` - Pathfind player to cell
- `player.teleportTo(col, row)` - Instant move (bypasses pathfinding)
- `player.punch(direction)` - Force punch in direction, waits for completion
- `player.playAnim(name, repeatType, direction, startFrame?, endFrame?)` - Play player animation
- `setFlag(name, value)` - Set world state flag
- `getFlag(name)` - Get flag value as string (returns `""` if not set)
- `isFlagCondition(name, condition, value)` - Check flag condition
- `saveState()` - Save world state to profile file
- `raiseEvent(eventName)` - Raise a game event (queued — executes in sequence with other commands, triggers createOnAnyEvent entities)
- `coins.get()` / `coins.spend(n)` / `coins.obtain(n)` - Coin management
- `showSpecialItem(itemType)` — Display special item graphic at top-center of screen (scale 2, pulsing, sparkles). Auto-hides when interaction ends. Item types: `mushroom`, `boots`, `max_health_increase`, `bandage`, `autoheal`, `push_strength`
- `hideSpecialItem()` — Manually hide the special item display (with tween-out animation)
- `fadeOut(durationMs)` — Camera fade to black (queued)
- `fadeIn(durationMs)` — Camera fade from black (queued)
- `calculateDirection(fromX, fromY, toX, toY)` — Returns direction string between two points (e.g., `"down_left"`)
- `speech.backgroundColor(color)` / `speech.textColor(color)` — Customize speech box colors for subsequent `say()` calls
- Text directives: `<collectible>`, `<warning>`, `<gold>`, `<success>`, `<hint>`
- Newlines: `<newline/>`

**Lua Runtime Architecture:**
- `src/systems/LuaRuntime.ts` — Orchestrator: executes Lua scripts, processes command queue, manages special item display
- `src/systems/lua-api/types.ts` — Command type union and direction maps
- `src/systems/lua-api/PlayerAPI.ts` — Registers `player.*`, `calculateDirection`, `celebrate`
- `src/systems/lua-api/NpcAPI.ts` — Registers `npc.*`, `faceEachOther`, `restoreDirections`
- `src/systems/lua-api/WorldAPI.ts` — Registers `setFlag`, `getFlag`, `saveState`, `isFlagCondition`, `raiseEvent`
- `src/systems/lua-api/UIAPI.ts` — Registers `wait`, `say`, `coins.*`, `speech.*`, `fadeOut/In`, `showSpecialItem/hideSpecialItem`

**Player animation names:** `powerup`, `pickup`, `push`, `slide`, `uppercut`, `throw`, `punch`, `walk`, `run`, `death`, `swim`, `fall`, `idle`
**Directions:** `"down"`, `"up"`, `"left"`, `"right"`, `"up_left"`, `"up_right"`, `"down_left"`, `"down_right"`

**⚠️ CRITICAL: NPC Interaction Setup — Two-Part Requirement**

Each interaction needs BOTH:
1. Entry in NPC's `interactions` array (picks which script based on flag conditions)
2. A matching `interaction` entity with `createOnAnyEvent` (loads and runs the Lua file)

Without #2, the lips icon shows but nothing happens. See `entity-creation-system.md` for full example.

**⚠️ `getFlag` returns a string.** Use `tonumber()` in Lua for numeric comparisons.

**NPC Properties in JSON:**
- `assets`: Spritesheet key — `npc1`, `village_old_man`, `village_girl`, `village_wizard`, `old_village_lady`
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

## Pushable System

**Push engagement:** Player walks into pushable → `GridCollisionComponent.blockedByPushable` detects the blocking entity → walk/idle state checks perpendicular alignment (`PUSH_ALIGNMENT_DIVISOR`) → enters push state. Requires `canPush` WorldState flag = `"true"`.

**Push mechanics:**
- Cardinal directions only (up/down/left/right)
- Player must be within central portion of box on perpendicular axis to engage
- Joystick toward pushable = stay in contact; joystick away or released = disengage
- Attack button triggers the actual push (one cell at a time)
- Push animation freezes on first frame during contact, plays during movement (`setTimeScale(0/1)`)
- Player moves exactly `cellSize` pixels in push direction at same speed as box
- **Sounds**: Plays random `drag1` or `drag2` sound once per cell push. Plays `click1` on push_lock.
- **push_lock cells**: If a pushable lands on a cell with the `push_lock` property, it becomes permanently immovable, persists across level transitions, and the player immediately disengages
- **Platform pushing**: Pushables can be pushed onto same-layer platform cells. Pushing down off a platform into a wall triggers a gravity fall to the nearest lower-layer cell. Player disengages on fall. Crate's layer updates on landing so it can be pushed again.

**Key patterns from implementation:**
- `GridCollisionComponent.blockedByPushable` — set when movement blocked by GridCellBlocker entity, cleared each frame
- **Proactive detection:** When player is already adjacent to a pushable and presses toward it, GridCollisionComponent probes the cell beyond the collision box edge to detect the GridCellBlocker (avoids requiring the player to walk away and back)
- `GridCollisionComponent.syncPreviousPosition()` — must be called after teleporting/offsetting an entity to prevent snap-back
- Per-direction position offsets (`PUSH_POSITION_OFFSETS`) and shadow offsets (`PUSH_SHADOW_OFFSETS`) applied on push enter, reversed on exit
- Shadow uses stack pattern: `pushOffset()` on enter, `popOffset()` on exit

**⚠️ Common pitfalls:**
- **Cardinal direction detection uses dominant-axis, not strict equality** — `CARDINAL_DOMINANCE_RATIO = 3` means one axis must be >3× the other. This is required for touch joystick which always has both axes non-zero. Strict `dx !== 0 && dy !== 0` checks will break push on touch controls.
- After moving an entity programmatically (disable GridCollision → move → re-enable), always call `syncPreviousPosition()` with the final position before re-enabling
- `AttackButtonComponent.setIconOverride(null)` must force-reset the texture — clearing the override alone doesn't trigger re-render if `currentIcon` matches

## Hole Entity

Holes are visual pits that trigger a hop animation then level transition (like exit but with hop).

**Behavior:** Player walks onto hole cell → 300ms hop animation (sine arc + shrink to 30%) → level transition fires

**Level JSON:**
- `texture`: Default `'hole_with_roots'`
- `targetLevel`, `targetCol`, `targetRow`: Same as exit
- `transformOverride`: Optional `{ scaleX, scaleY, offsetX, offsetY }` for scaling the sprite

**Drop-in on destination:** Player falls from above with gravity easing → plays landing animation → movement enabled. Pet (if active) falls alongside in idle south pose. Persists across death/restart (cleared only by normal exits). GridCollisionComponent disabled for both player and pet during drop to prevent getting stuck on walls.

## Laser Entity

Stationary beam emitter that fires a continuous beam at an arbitrary angle.

**Behavior:** Beam raycasts every frame from emitter center along angle, stops at walls/platforms/blockers/pushables/breakables/other lasers. Acts as an impassable barrier for the player.

**Player:** 3 damage per hit (50ms cooldown), pushes player perpendicular to beam so they can't walk through. Hit flash on damage.

**Enemies:** Instant kill — triggers death state animation (not just destroy).

**Toggle:** World state flag `{entityId}_laser_on` (configurable). `"false"` = off, `"true"` or unset = on. Works with levers, triggers, Lua scripts.

**Destruction:** When destroyed via `onDestroyEvent`, tracked in `destroyedEntities` — won't respawn on re-entry. Base swaps to `laser_base_destroyed.png`.

**Visual:** 3-layer beam (red outer glow, white inner core, pulsing orange overlay) + impact spark particles at endpoint.
Base sprite (`laser_base_only.png`) stays static, nozzle sprite (`laser_nozzle.png`) overlays and rotates to match angle.

**Editor:** Entity tool → laser → click to place. Select to edit angle (0°=up, 90°=right), flag name, and destroy event.

**Key files:**
- `src/ecs/entities/laser/LaserEntity.ts` — Entity factory
- `src/ecs/components/laser/LaserBeamComponent.ts` — All beam logic

## Moving Tile Entity

A platform-sized entity that follows a scripted path (wait/move steps). Players and pets riding the tile are carried along automatically.

**Behavior:** Tile loops through a script of `waitMs` and `moveTo` steps. Entities standing on the tile's footprint are carried by the same delta each frame. Occupancy is grid-snapped (per-cell) so the movement validator special-cases boarding and leaving.

**Water interaction:** A moving tile overrides the underlying cell's rules — the player stays on the tile even when it crosses water cells. When the player steps off a tile onto water (and can't swim), movement is blocked.

**Key patterns:**
- `GridMovementValidator` checks `findMovingTileCovering()` to allow movement onto and off of tiles
- Rider carry uses `TransformComponent` delta + `GridCollisionComponent.syncPreviousPosition()` to prevent snap-back
- Tile occupancy stored in grid cells; `coversCell()` handles geometric check for between-cell positions

**Script format (level JSON):**
```json
"script": [
  { "waitMs": 1000 },
  { "moveTo": { "col": 10, "row": 5 }, "speedCellsPerSec": 3 },
  { "waitMs": 500 },
  { "moveTo": { "col": 5, "row": 5 }, "speedCellsPerSec": 2 }
]
```

**Key files:**
- `src/ecs/components/moving-tile/MovingTileComponent.ts` — Platform movement, occupancy, rider carry
- `src/ecs/components/moving-tile/MovingTileScript.ts` — Script types and parser
- `src/ecs/entities/moving-tile/MovingTileEntity.ts` — Entity factory
- `src/ecs/components/movement/GridMovementValidator.ts` — Boarding/leaving logic

**⚠️ Water pitfall:** Tile occupancy is grid-snapped and can lag behind the tile's pixel position. When a rider is carried between cell boundaries, the validator must check both the old and new center cells for the riding tile — otherwise water cells in between will incorrectly block the rider. The fix checks `ridingTile.coversCell()` geometrically, not just grid occupancy.

**⚠️ Rider detection pitfall:** Grid cell occupancy is coarser than pixel position. A player standing *near* (but not on) the tile can have their collision box registered in the tile's cell. `carryRiders()` must do a geometric check (rider center within tile pixel bounds) — not just cell occupancy — to avoid pulling nearby players onto the tile when it starts moving.

**⚠️ Ripple suppression:** `WaterRippleComponent` checks `GridCollisionComponent.onMovingTile` to suppress ripples while riding. Without this, ripples appear under the player/tile as it crosses water cells even though the player isn't swimming.

**Depth:** `Depth.movingTile` (-39) — renders between cell textures and edge graphics.

**Tests:** `test/tests/player/test-moving-tile.js`

## Adding Assets

**Background textures (for cells in editor):**
1. Add image to `public/assets/cell_drawables/`
2. Register in `src/assets/AssetRegistry.ts` (key, path, type: `'image'`)
3. Add key to `editor` asset group array in `AssetRegistry.ts`
4. Add key to `BACKGROUND_TEXTURE_KEYS` in `editor/panels/TexturePicker.ts`

**Spritesheets (enemies, player, etc.):**
1. Add sprite sheet to `public/assets/`
2. Register in `src/assets/AssetRegistry.ts`
3. Add to appropriate group in `src/assets/AssetRegistry.ts`

**Sound effects:**
1. Place MP3 in `public/assets/sounds/`
2. Register in `AssetRegistry.ts` with `type: 'audio'`
3. Add key to appropriate asset group (core for universal sounds, enemy group for enemy-specific)
4. Play via `SoundManager` — entity factories call `getInstance()` and pass to components via props

**Music:**
1. Place MP3 in `public/assets/music/`
2. Register in `AssetRegistry.ts` with `type: 'audio'` (e.g., `btr_overworld`, `btr_wilds`, `btr_tonal`)
3. Reference in level JSON: `"music": "btr_overworld"` at the top level
4. Played automatically by `MusicManager` after the level loads — no per-level wiring needed

**MusicManager:**
- Singleton at `src/systems/MusicManager.ts` — manages background music playback
- `play(scene, key | null)` — switches track. Same key as currently playing → no-op (seamless across level transitions). `null` → stops music. Loops at volume 0.5 by default.
- `stop()` — stops any current music
- Title music: `BootScene` plays `btr_music` via `MusicManager` after asset load
- Level music: `GameScene.createGameScene()` calls `MusicManager.play(this, levelData.music ?? null)` after `preloadLevelAssets` + `waitForLoad()`
- Editor: `EditorScene` (separate Phaser scene) does not play music — no explicit stop needed
- Music asset is loaded per-level via `preloadLevelAssets` (and `AssetManifest.fromLevelData` for `LoadingScene` transitions)
- Music files in `assets/music/*` are skipped by `SoundManager`'s native SoundPool preload (streamed via Phaser instead)

**SoundManager:**
- Singleton at `src/systems/SoundManager.ts` — wraps all SFX playback (not music)
- Components receive SoundManager via props (entity factories call `getInstance()` and pass it through)
- On Android: uses native `SoundPool` via Capacitor plugin (~30ms latency vs ~300ms Web Audio) — skips `assets/music/*` paths
- On web: delegates to `game.sound.play()` (Phaser Web Audio, no change)
- Initialized in BootScene and GameScene (covers all entry paths)
- Per-sound cooldown: 50ms — prevents overlapping duplicate sounds

**Sound loading rules:**
- `core` group: Always loaded (punch, splash, coin, shimmer sounds)
- Enemy groups: Only loaded when that enemy type is in the level (e.g., skeleton sounds in `skeleton` group)
- `breakables` group: Only loaded when level has breakable entities

**⚠️ Audio gotchas:**
- `AssetLoader.loadAsset()` checks `scene.cache.audio.exists(key)` to skip already-loaded audio
- `AssetLoadCoordinator` skips audio assets during texture verification (audio isn't a texture)
- Both checks are required or level transitions fail with "Failed to load assets"

## Creating Entities

1. Create factory function in `src/ecs/entities/{type}/`
2. Add necessary components
3. Set update order (order matters!)
4. Register factory in `src/systems/entity-factories/`
5. **Editor integration (MANDATORY):**
   - Add type to `ENTITY_TYPES` in `editor/panels/Toolbar.ts`
   - Add default data in `EditorBridge.addEntity()`
   - Add label in `CanvasInteraction.ts` labelMap
   - Add extraction logic in `EditorBridge.extractEntities()`
   - Add form fields in `editor/panels/ContextPanel.ts`
6. **System interaction checklist** — verify against each:
   - Water: Does this entity cross water? → `GridMovementValidator`, `WaterRippleComponent`, `WaterEffectComponent` need awareness
   - Void/platforms: Does it cross gaps? → `JumpComponent`, layer checks
   - Player riding: Can the player stand on it? → rider detection (geometric, not just cell occupancy), `onMovingTile` flag, suppress ripples/water effects
   - Editor: Does it have a visual? → `SpriteComponent` must apply overrides in constructor (editor never calls `update()`)
   - Death/destroy: Does it have `HealthDropOnDeathComponent`? → Check `scene.scene.key !== 'editor'` before dropping loot
   - Collision clamping: Does it constrain player movement? → Check all edge cases (`canSwim`, `canJump`, etc.)

**⚠️ Lesson (moving tile, July 2026):** New entity types that interact with terrain (water, void, platforms) will have bugs in EVERY system that makes assumptions about what the player is standing on. Anticipate these interactions upfront rather than discovering them one at a time.

**⚠️ WorldState flag naming:** Flags that persist must be **level-scoped** to prevent collisions when the same entityId exists in multiple levels. Pattern: `${levelName}_${entityId}_eventname` (e.g. `grass_overworldnw_bell2_rung`). Without the level prefix, ringing a bell in one level would mark it as rung in all levels.

**⚠️ EntityIds are immutable in the editor.** Once an entity is placed, its ID cannot be changed via the editor UI. If an entityId needs to change (e.g., to add a level prefix for flag scoping), it must be edited directly in the level JSON file. Don't suggest "just rename the entityId" as a fix — it's not a UI-accessible operation.

## Adding Cell Properties

When adding a new cell property (e.g. `tileDeath`):
1. Add to `CellProperty` type in `src/systems/grid/CellData.ts`
2. Add to `CELL_PROPERTIES` array in `editor/panels/Toolbar.ts`

That's it — the editor auto-generates checkboxes from these. If you add the type but forget the editor array, the property works in code but is invisible in the editor.

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
**Controls:** P key triggers pet ability
**Behavior:** Pet follows using smooth delta-based movement, stops within 128px, teleports if >800px, hides in water
**Movement:** Always uses pathfinding on player's current layer, speed lerps between run and wander
**Available pets:** rock (4-dir), dog (8-dir), bubble (shield)

See [Pet System](./pets-quick-ref.md) for details.

## Companion (Guide Fragment)

**Enable:** Set WorldState flag `hasCompanion` to `"true"`
**Sprite:** `narry.png` — floating crystal construct
**Behavior:** Follows ahead-right of player using lerp-based smooth movement with gentle perpendicular swerve for natural motion. Overshoots slightly when player stops, then corrects. After 2s idle, starts orbiting the player (restless). Teleports if >600px away.
**Visuals:** Soft white-cyan additive glow behind sprite. Dual trail (cyan outer + white inner dots). Subtle alpha flicker.
**Coexists with pet:** Yes, independent system.

**Key files:**
- `src/systems/CompanionManager.ts` — Singleton, flag-activated spawning
- `src/ecs/entities/companion/CompanionEntity.ts` — Entity factory
- `src/ecs/components/companion/CompanionFollowComponent.ts` — Movement logic
- `src/ecs/components/companion/CompanionTrailComponent.ts` — Cyan+white particle trail
- `src/ecs/components/companion/CompanionGlowComponent.ts` — Glow + flicker

## Cheat Profile

The profile select screen has a 4th "Cheat" slot that starts with all abilities unlocked:
- `canPunch`, `canSwim`, `canJump`, `canPush`, `hasSuperPunch`, `hasCompanion`, `hasAutoHeal` = `"true"`
- `pet_rock_collected`, `pet_dog_collected`, `pet_bubble_collected` = `"true"`, `pet_selected` = `"dog"`
- Starts in `house3_interior`

Useful for testing combat, pets, companion, and super punch without progression.

## Debug Controls

- **G** - Toggle grid debug (layers, transitions, triggers)
- **C** - Toggle collision boxes
- **M** - Toggle music on/off (persists across sessions)
- **H** - Set player health to max
- **P** - Toggle punch targeting mode
- **V** - Toggle HUD visibility
- **Y** - Save world state
- **R** - Reload state from file and reset scene
- **E** - Enter level editor (standalone: `http://localhost:5173/editor/`)
- **P** - Pet ability (if pet active)

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

**Requires:** WorldState flag `hasAutoHeal` = `"true"`

**Visual:** Red vignette overlay pulses proportional to missing health (only visible when `hasAutoHeal` is active).

## Hit Flash Effect

Entities flash when taking damage. Color customizable (default red, green for bugs).

**Critical:** HitFlashComponent must be BEFORE SpriteComponent in update order.

## Water System

- Water blocks movement unless `canSwim` flag is `"true"` in world state
- Player swims at 70% speed when canSwim enabled
- Entry/exit uses JumpComponent (same jump animation as void/platform jumps, single cell, all 8 directions)
- Entry: jump lands on water cell, plays swim animation immediately (no landing phase)
- Exit: validates target cell is dry land, falls back to cardinal if diagonal target is water
- Exit jump always lands at cell center (prevents collision box offset shift from pushing `currentCell` into adjacent water)
- Pushes a centered swimming collision box (`offsetX: 0, offsetY: 0, width: 48, height: 32`) on water entry, pops on exit (uses `GridPositionComponent.pushCollisionBox/popCollisionBox` stack)
- **Collision box offset pitfall:** Swimming box has `offsetY: 0`, normal box has `offsetY: 24`. On exit, the 24px shift can push `currentCell` into the row below if the player isn't centered. The cell-center landing fix addresses this.
- **Visual-center water check (north movement):** When walking north without `canSwim`, `GridMovementValidator` blocks if the visual-center cell (above the collision box) is water. Without this check, the player's collision box would sit south of the visual sprite and allow walking onto water from below.
- Sprite masking: Player sprite is clipped at the water edge boundary so the lower body doesn't render below the water surface. Mask updates when player moves to a new cell.
- Ripples every 150ms, shadow fades to 30% alpha
- River current applies force, stops near blockers
- Water + blocked = impassable obstacles
- Water + bridge = walk over at full speed
- Per-level water config: `rippleSpritesheet` and `splashParticle` in background JSON

## Void Cells

- Blocks player and enemy movement but not projectiles
- Requires `canJump` WorldState flag to be `"true"` for jump ability
- When player walks into a void cell, they are blocked and the HUD attack button changes to a **jump icon** (`jump_icon.png`)
- Player presses the jump button to jump over exactly 1 void cell (cardinal only) if landing cell is same layer, walkable, unblocked
- If landing cell is also void/invalid, player jumps into the void cell and **falls**: sprite shrinks to 0 over 600ms, drifts down 20px, shadow hidden, then respawns at last safe position with 10 HP penalty
- Jump phases: takeoff (180ms, stationary) → flight (300ms, sine arc + movement) → landing (180ms, stationary)
- Sound: `jump_hup` plays on takeoff
- Player invulnerable during jump
- Pet sync-jumps with player: tweens to landing cell center with sine arc, matching player's jump duration. On fall jumps, pet shrinks/falls in sync then teleports to player's respawn cell
- Pathfinder treats void as impassable (no jump-over routing)
- Punch is suppressed while jump icon is showing (`InputComponent.isAttackPressed()` returns false when icon override is `'jump'`)
- Key file: `src/ecs/components/movement/JumpComponent.ts` (orchestrator), `JumpDetector.ts` (detection logic), `JumpAnimator.ts` (animation phases)

## Platform Jump-Down

- When player is on a platform cell and walks toward a wall or lower-layer cell, they are blocked and the **jump icon** appears
- Player presses the jump button to jump off the platform
- **South**: If adjacent cell is a wall (perspective), jumps over it to the cell beyond. Landing position offset 20px north
- **North**: Jumps to adjacent lower cell. Landing position offset 20px north
- **Left/Right**: Jumps to adjacent lower cell. Landing position offset 40px south (only when dropping to lower ground, not same-layer platform-to-platform)
- **Gap jumping** (e.g., `1-0-1`): If adjacent cell is lower layer but the cell beyond is a platform at same or lower layer, jumps over the gap to land on the far platform
- Landing on void triggers the fall sequence (shrink + respawn + 10 HP)
- Landing on water: `WaterEffectComponent` handles water entry automatically on next frame
- Landing position auto-nudged away from adjacent higher-layer cells to prevent collision box overlap
- Stairs are never jumped to (preserves normal stair transition behavior)
- Detection: `JumpDetector.detect()` — uses player input direction, collision box center, and edge proximity check

## Touch Joystick

- Movement: 9% from left, 45% from top (activates in left 45%, bottom 70%)
- Aim: 80% from left, 50% from top
- Recalculate positions every frame until first interaction (Android fix)

## Sprite Sheets

**Attacker** (player): 672×3696, 56×56 frames
- Frames 0-7: Idle (alphabetical order, NOT Direction enum order)
- Frames 8-55: Cross-punch
- Frames 56-111: Falling back death
- Frames 112-183: Jumping
- Frames 184-190: Landing (south only)
- Frames 191-230: Picking up
- Frames 231-302: Power up
- Frames 303-350: Pull object
- Frames 351-398: Pushing
- Frames 399-446: Running
- Frames 447-494: Sliding
- Frames 495-550: Surprise uppercut
- Frames 551-582: Walking
- Frames 583-638: Throw object
- Frames 639-690: Breaststroke (raw)
- Frames 691-742: Swimming (blue tint)
- Frames 743-782: Walking punch

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

### Entity Sprites Wrong Size in Editor
**Cause:** `EditorScene.update()` does not call `entityManager.update()`, so component `update()` methods never fire. Any visual property that's only applied in `update()` (like `scaleXOverride`) won't take effect.
**Fix:** `SpriteComponent` constructor now applies `scaleXOverride`/`scaleYOverride` immediately at construction, not just in `update()`. If adding new visual properties to components, ensure initial state is set in the constructor — don't rely on `update()` for the editor.

### Player Spawning at Wrong Position
**Cause:** GridCollisionComponent initializes previousX/Y to (0,0), thinks player is moving from origin.
**Fix:** Component now initializes to actual starting position on first frame.

### Sprite Shattering Effect
Divide sprite into 3×3 grid, use physics-based motion with randomness. Use absolute position calculation to prevent rotation affecting trajectory. Rotation decays exponentially over time (not constant speed) — uses `decayingRotationAngleDeg()` from `src/utils/ShardRotation.ts`.

### Coin and Medipack Pickups
- Coins: Physics-based with spin (direction matches emit velocity, decays exponentially via `scaleX` squash), fly to HUD on collection, 15s lifetime
- Medipacks: Mushroom sprite, gradual healing (50 HP/sec for 2s), overheal up to 200, 15s lifetime
- Small mushrooms: Instant 20 HP heal (capped at max health — no overheal), 40px collection distance, 300ms spawn delay, 15s lifetime (fades after 10s)
- Enemy health drops: Enemies have a per-type chance to drop small mushrooms on death. Uses `HealthDropOnDeathComponent`. Chances defined in `ENEMY_DROP_CHANCES` in `enemyFactories.ts`.
- Overheal: 1.5× movement speed, 2× punch speed, decays at 5 HP/sec

### Particle Effects
- Use physics-based motion (velocity + gravity), not sine waves
- Set depth based on context (behind/in front of player)
- Use simple phase management, not StateMachine

### Varied Particle Textures
Sample 6 random pieces from center 40% of texture, create runtime spritesheet.

## Performance Tips

- Use zero-alloc `Into` coordinate helpers in hot paths (see `docs/grid-and-collision.md`)
- Use `CachedFlag` for WorldState flag checks in `update()` methods
- Compress assets with `sips -Z <size>`
