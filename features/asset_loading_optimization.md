# Asset Loading Optimization - Summary

## Changes Made

Fixed asset loading to only load assets when they're actually needed by the level.

### 1. Core Assets Cleanup (`AssetLoader.ts`)

**Before:** `preloadAssets()` had a hardcoded `coreAssets` array with 30+ assets including entity-specific sprites.

**After:** Uses `ASSET_GROUPS.core` which only includes truly universal assets:
- `vignette` - Always needed
- `shadow` - Always needed
- `coin` - Always needed (pickups)
- `medi_pack` - Always needed (pickups)

### 2. Entity-Specific Loading

Assets now only load when their entity type exists in `level.entities`:

- **skeleton** → loads `skeleton`, `bone_small`
- **thrower** → loads `thrower`, `grenade`
- **floating_robot** → loads `floating_robot`, `exclamation`, `fireball`, `fire`, `robot_hit_particle`
- **bug_base** → loads `bug_base`, `base_destroyed`, `bug`
- **bullet_dude** → loads `bullet_dude_sprite`, `rock`, `bullet_default`, `bullet_default_shell`, `smoke`
- **breakable** → loads `dungeon_vase`, `pillar`

### 3. Background Texture Loading

Background textures only load when referenced in level JSON:

- `background.floor_texture` → loads that texture
- `background.wall_texture` → loads that texture
- `background.stairs_texture` → loads that texture
- `background.platform_texture` → loads that texture
- `background.path_texture` → loads that texture
- `background.water.sourceImage` → loads that texture + `water_ripple` + `water_splash`
- `cells[].backgroundTexture` → loads that texture

### 4. Water Effects

Water-related assets (`water_ripple`, `water_splash`) now only load when water is present in the level:
- Checks `background.water` or `background.water_texture`
- Automatically adds ripple and splash assets

## Impact

**Before:**
- Every level loaded 30+ assets regardless of need
- `stone_floor`, `water2` loaded even if not used
- All enemy sprites loaded even if not present

**After:**
- Minimal levels (no enemies, no water): ~8 assets
- Typical levels: 15-20 assets
- Complex levels (many enemies, water): 25-30 assets

## Testing

Load different levels and check console for `[AssetLoader] Loaded N textures:` message.

Example:
- Level with no enemies, no water → Should load ~8 textures
- Level with skeletons + water → Should load skeleton assets + water assets
- Level with breakables → Should load breakable assets only if breakable entities exist
