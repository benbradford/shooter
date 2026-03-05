# Updating Enemy Spritesheets - SOP

This guide covers the complete process for updating enemy spritesheets with new animations.

## Lessons Learned from Thrower Update

### What Went Wrong

1. **Frame size mismatch** - AssetRegistry had wrong frameWidth/frameHeight (48×48 vs 56×56)
2. **Direction order confusion** - Assumed standard game order, but files were alphabetically sorted
3. **Animation creation location** - Created animations in GameScene instead of entity factory
4. **Missing direction mapping** - No clear mapping between Direction enum and alphabetical indices
5. **State constructor changes** - Had to update multiple state constructors to pass playerEntity

### Root Causes

- **No verification step** - Didn't verify spritesheet dimensions matched AssetRegistry
- **Assumed directory order** - Didn't check actual directory listing before generating
- **Inconsistent pattern** - Didn't follow skeleton's pattern of creating animations in entity factory
- **No automated checks** - Manual process prone to human error

## Improved Process

### 1. Verify Source Files

**Before generating anything:**

```bash
# Check frame dimensions
sips -g pixelWidth -g pixelHeight public/assets/{enemy}/anims/rotations/south.png

# Check directory order (CRITICAL - will be alphabetical)
ls public/assets/{enemy}/anims/animations/

# Count frames per animation
for dir in public/assets/{enemy}/anims/animations/*/south; do 
  echo "$dir: $(ls $dir | wc -l) frames"
done
```

### 2. Update AssetRegistry FIRST

**Before generating spritesheet:**

```typescript
// src/assets/AssetRegistry.ts
{enemy}: {
  key: '{enemy}',
  path: 'assets/{enemy}/{enemy}_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 56, frameHeight: 56 }  // ← VERIFY THIS MATCHES SOURCE
},
```

### 3. Generate Spritesheet

**Use alphabetical directory order:**

```javascript
// scripts/generate-{enemy}-spritesheet.mjs
const DIRECTIONS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];
```

**Not game direction order:**
```javascript
// ❌ WRONG - this is game order, not file order
const DIRECTIONS = ['south', 'south-east', 'east', ...];
```

### 4. Create Layout Documentation

**Document the alphabetical order explicitly:**

```markdown
## Direction Order

**CRITICAL:** Frames are in ALPHABETICAL order (not standard game direction order):

1. East
2. North
3. North-East
4. North-West
5. South
6. South-East
7. South-West
8. West
```

### 5. Create Animation File with Direction Mapping

**Pattern to follow (from ThrowerAnimations.ts):**

```typescript
import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

// Alphabetical order (how sprite sheet is organized)
const ALPHABETICAL_DIRS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

// Map Direction enum to alphabetical index
const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 4, // south
  [Direction.Down]: 4, // south
  [Direction.Up]: 1, // north
  [Direction.Left]: 7, // west
  [Direction.Right]: 0, // east
  [Direction.UpLeft]: 3, // north-west
  [Direction.UpRight]: 2, // north-east
  [Direction.DownLeft]: 6, // south-west
  [Direction.DownRight]: 5, // south-east
};

export function create{Enemy}Animations(scene: Phaser.Scene): void {
  if (scene.anims.exists('{enemy}_idle_east')) {
    return; // Already created
  }
  
  ALPHABETICAL_DIRS.forEach((dir, index) => {
    // Create animations using index...
  });
}

export function get{Enemy}AnimKey(animType: string, direction: Direction): string {
  const index = DIR_TO_INDEX[direction];
  const dirName = ALPHABETICAL_DIRS[index];
  return `{enemy}_${animType}_${dirName}`;
}
```

### 6. Call Animation Creation in Entity Factory

**Not in GameScene:**

```typescript
// In {Enemy}Entity.ts
import { create{Enemy}Animations } from './{Enemy}Animations';

export function create{Enemy}Entity(props: Create{Enemy}Props): Entity {
  const { scene, ... } = props;
  
  create{Enemy}Animations(scene); // ← Create here, not in GameScene
  
  // ... rest of entity creation
}
```

### 7. Update States to Use Helper Function

**All states should use the helper:**

```typescript
import { get{Enemy}AnimKey } from './{Enemy}Animations';

onEnter(): void {
  const dir = dirFromDelta(dx, dy);
  const animKey = get{Enemy}AnimKey('idle', dir);
  sprite.sprite.play(animKey);
}
```

### 8. Verify and Test

**Checklist:**
- [ ] Frame size in AssetRegistry matches source files
- [ ] Spritesheet generated with correct dimensions
- [ ] Layout doc shows alphabetical order
- [ ] Direction mapping created
- [ ] Helper function exported
- [ ] All states use helper function
- [ ] Animations created in entity factory (not GameScene)
- [ ] Build passes
- [ ] Test in-game: idle, walk, attack, hit, death animations

## Automation Opportunities

### What Should Be Automated

The entire process from "update thrower spritesheet" to working game should be automated:

**Input:** `npm run update-spritesheet thrower public/assets/thrower/anims`

**Automated steps:**
1. **Detect frame size** - Read dimensions from first rotation frame
2. **Scan animations** - Discover all animation directories and frame counts
3. **Verify AssetRegistry** - Check if frameWidth/frameHeight match, update if needed
4. **Generate spritesheet** - Create PNG with correct grid layout
5. **Generate layout doc** - Create/update spritesheet-layout.md with frame indices
6. **Generate/update animations file** - Create {Enemy}Animations.ts with:
   - Alphabetical direction array
   - DIR_TO_INDEX mapping
   - Animation creation function with correct frame ranges
   - Helper function for getting animation keys
7. **Scan state files** - Find all {Enemy}*State.ts files
8. **Update state imports** - Add `import { get{Enemy}AnimKey } from './{Enemy}Animations';`
9. **Update animation calls** - Replace hardcoded keys with helper function calls
10. **Verify entity factory** - Ensure `create{Enemy}Animations(scene)` is called
11. **Run build and lint** - Verify everything compiles
12. **Report** - Show summary of changes and any manual steps needed

### Script Structure

```javascript
// scripts/update-spritesheet.mjs
import { detectFrameSize } from './lib/frame-detector.mjs';
import { scanAnimations } from './lib/animation-scanner.mjs';
import { generateSpritesheet } from './lib/spritesheet-generator.mjs';
import { updateAssetRegistry } from './lib/asset-registry-updater.mjs';
import { generateAnimationsFile } from './lib/animations-generator.mjs';
import { updateStateFiles } from './lib/state-updater.mjs';

async function updateSpritesheet(enemyName, sourceDir) {
  // 1. Detect and validate
  const frameSize = await detectFrameSize(sourceDir);
  const animations = await scanAnimations(sourceDir);
  
  // 2. Update AssetRegistry
  await updateAssetRegistry(enemyName, frameSize);
  
  // 3. Generate spritesheet
  await generateSpritesheet(enemyName, sourceDir, animations, frameSize);
  
  // 4. Generate documentation
  await generateLayoutDoc(enemyName, animations, frameSize);
  
  // 5. Generate/update animations file
  await generateAnimationsFile(enemyName, animations);
  
  // 6. Update state files
  await updateStateFiles(enemyName);
  
  // 7. Verify
  await runBuildAndLint();
  
  console.log('✓ Spritesheet update complete');
}
```

### Benefits of Automation

- **Consistency** - Same process every time, no human error
- **Speed** - 30 seconds instead of 30 minutes
- **Documentation** - Auto-generated docs always match code
- **Confidence** - Automated verification catches issues immediately
- **Scalability** - Easy to update multiple enemies

### Implementation Priority

1. **High priority** - Spritesheet generation and layout doc (already done)
2. **Medium priority** - Animation file generation with correct indices
3. **Low priority** - State file updates (requires AST parsing)

## Current Manual Steps

Until automation is complete, follow this checklist:

1. Verify frame size matches AssetRegistry
2. Check directory order is alphabetical
3. Generate spritesheet with script
4. Create/update layout doc manually
5. Update {Enemy}Animations.ts with correct frame indices
6. Ensure animations created in entity factory
7. Update all state files to use helper function
8. Build and test

**Time estimate:** 15-20 minutes per enemy

## Common Pitfalls

### ❌ Assuming Directory Order
**Don't assume** directories are in game direction order. Always check with `ls`.

### ❌ Wrong Frame Size in AssetRegistry
**Always verify** frameWidth/frameHeight matches source files before generating.

### ❌ Creating Animations in GameScene
**Follow skeleton pattern** - create in entity factory, not scene.

### ❌ Hardcoded Animation Keys
**Use helper function** - don't hardcode `{enemy}_idle_south` everywhere.

### ❌ No Direction Mapping
**Always create** DIR_TO_INDEX mapping for alphabetical order.

## Quick Reference

**Check frame size:**
```bash
sips -g pixelWidth -g pixelHeight public/assets/{enemy}/anims/rotations/south.png
```

**Check directory order:**
```bash
ls public/assets/{enemy}/anims/animations/
```

**Generate spritesheet:**
```bash
node scripts/generate-{enemy}-spritesheet.mjs
```

**Verify spritesheet:**
```bash
sips -g pixelWidth -g pixelHeight public/assets/{enemy}/{enemy}_spritesheet.png
```

**Test:**
```bash
npm run build && npx eslint src --ext .ts
```
