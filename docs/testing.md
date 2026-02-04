# Testing Guide

## Overview

Automated browser tests using Puppeteer with custom shell script runner. Tests simulate real user input and verify game behavior.

## Why Custom Test Runner (Not Jest)

We use a custom shell script approach instead of Jest for several reasons:

**Simplicity:**
- No complex configuration needed
- No experimental Node features (Jest ES modules support is experimental)
- Shell scripts are straightforward and easy to understand

**Reliability:**
- Direct Puppeteer control without abstraction layers
- jest-puppeteer server management is flaky
- Current approach works consistently across all platforms

**Flexibility:**
- Easy to run individual tests or all tests
- Simple to add new test files (auto-discovered by `find`)
- No framework lock-in

**Maintenance:**
- Fewer dependencies to manage
- No breaking changes from test framework updates
- Clear separation between test runner and test logic

The custom approach is ~100 lines of shell script vs hundreds of lines of Jest configuration and workarounds.

## Running Tests

```bash
# All tests
npm test                                    # Visible browser
npm run test:headless                       # Headless mode (faster)

# Single test file
npm run test:single test-ammo-system        # Visible browser
npm run test:headless:single test-ammo-system  # Headless mode

# Filter by keyword
npm run test:single test-ammo-system "refills"
npm run test:headless:single test-ammo-system "refills"

# Kill stuck dev server
npm run kill
```

**Examples:**
```bash
# Run all ammo tests in headless mode
npm run test:headless:single test-ammo-system

# Run only tests with "overheat" in the name
npm run test:single test-ammo-system "overheat"

# Run only tests with "fires once"
npm run test:headless:single test-ammo-system "fires once"
```

**Tip:** When fixing failing tests, run them one at a time using the keyword filter. This helps you focus on one issue at a time.

**⚠️ CRITICAL: Always run the test after making ANY change to verify it works.**

## Lessons Learned

### Test Isolation is Critical

Tests can fail due to state bleeding from previous tests. Always ensure clean state:

```javascript
// Wait for full ammo before starting test
await page.evaluate(() => waitForFullAmmo());
```

Without this, a test that fires bullets will leave the game with low ammo, causing the next test to fail.

### Don't Optimize Tests Prematurely

**Lesson:** Trying to speed up tests by reducing wait times or manipulating game state (like setting `maxAmmo = 3`) can introduce subtle bugs and test isolation issues.

**What happened:**
- Reduced `maxAmmo` from 25 to 3 to speed up overheat tests
- Tests passed individually but failed when run sequentially
- State leaked between tests (maxAmmo stayed at 3)
- Spent more time debugging than the original tests took to run

**Solution:** Keep tests simple and use real game values. If tests are slow:
1. Run individual tests during development (`npm run test:headless:single`)
2. Use headless mode for speed (`npm run test:headless`)
3. Only run full suite before commits

**Rule:** Prefer reliable tests over fast tests. A slow test that always works is better than a fast test that's flaky.

### Headless Mode for Speed

Use headless mode for faster execution:
- Development: Use visible browser to see what's happening
- CI/Automation: Use headless mode for speed
- Debugging: Use visible browser with keyword filter

```bash
# Fast headless execution
npm run test:headless:single test-ammo-system

# Visible for debugging
npm run test:single test-ammo-system "specific test"
```

### Real-Time Test Output

Tests now show a spinner while running and display results immediately:
- Spinner animation shows test is in progress
- Result appears as soon as test completes
- No waiting for entire file to finish
- Ctrl+C stops immediately and cleans up

### Export Game Constants

Never hardcode game values in tests. Export them and use dynamically:

```javascript
// In src/ecs/entities/player/PlayerEntity.ts
export const PLAYER_MAX_AMMO = 25;

// In test
const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
return ammo === maxAmmo - 1;  // Adapts to config changes
```

This prevents tests from breaking when you tune game balance.

### Single-Shot vs Continuous Fire

- `fireSingleShot(dx, dy)` - Fires exactly once (waits INITIAL_AIM_WAIT_TIME_MS + 50ms, releases before cooldown)
- `fireWeapon(dx, dy, duration)` / `holdFire(dx, dy, duration)` - Holds fire button for duration (fires multiple times)

Use the right helper for your test case.

### Debug One Test at a Time

When tests fail, use keyword filtering to run just one:

```bash
npm run test:single test-ammo-system "fires once"
```

This is much faster than running the entire suite repeatedly.

### Add State Management Helpers

Create helpers like `waitForFullAmmo()` to manage game state between tests. This is better than fixed delays because it waits exactly as long as needed.

## Creating a New Test

### 1. Create Test Level (if needed)

Create `public/levels/test/my-test.json`:

```json
{
  "width": 10,
  "height": 10,
  "playerStart": { "x": 5, "y": 5 },
  "cells": [
    {"col": 3, "row": 3, "layer": 1}
  ]
}
```

### 2. Create Test File

Create `test/tests/player/test-my-feature.js` (or other subdirectory):

```javascript
import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testMyFeature = test(
  {
    given: 'Initial state',
    when: 'Action performed',
    then: 'Expected result'
  },
  async (page) => {
    // Test logic - return true/false
    const result = await page.evaluate(() => {
      // Access game state
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player !== null;
    });
    return result === true;
  }
);

runTests({
  level: 'test/my-test',
  commands: ['test/interactions/player.js'],
  tests: [
    testMyFeature
  ],
  screenshotPath: 'tmp/test/screenshots/test-my-feature.png'
});
```

### 3. Run the Test

```bash
./test/run-single-test.sh test/tests/player/test-my-feature.js
```

## Available Helpers

### Player Commands (`test/interactions/player.js`)

```javascript
// Position
getPlayerPosition()                              // Returns {x, y}

// Movement - Pathfinding (Recommended)
moveToPathfindHelper(targetCol, targetRow, maxTimeMs) // A* pathfinding around obstacles
                                                       // Automatically navigates walls and uses stairs
                                                       // Use for complex navigation

// Movement - Independent Tests
moveToCellHelper(targetCol, targetRow, maxTimeMs) // Move to specific cell (diagonal)
                                                   // Use when tests are independent
                                                   // No obstacle avoidance

// Movement - Sequential Tests  
moveToRowHelper(targetRow, maxTimeMs)           // Move vertically to row
moveToColHelper(targetCol, maxTimeMs)           // Move horizontally to column
                                                 // Use when tests depend on previous position

// Movement - Manual Control
setPlayerInput(dx, dy, durationMs)              // Simulate movement for duration

// Combat
fireWeapon(aimDx, aimDy, durationMs)            // Simulate firing
getBulletCount()                                 // Count active bullets

// Setup
enableRemoteInput()                              // Add RemoteInputComponent to player
```

**When to use which movement helper:**

- **`moveToPathfindHelper(col, row)`** - Best for navigating around walls and obstacles
  - Uses A* pathfinding to find valid path
  - Automatically avoids walls and uses stairs for layer changes
  - Example: Moving to a cell blocked by walls
  - Note: Does not allow layer changes - must use stairs
  
- **`moveToCellHelper(col, row)`** - Independent tests where each test can move the player to any position
  - Example: Wall collision tests (each test moves to a different corner)
  - Player can move diagonally to reach target
  - No obstacle avoidance - will get stuck on walls
  
- **`moveToRowHelper(row)` / `moveToColHelper(col)`** - Sequential tests where each test depends on the player being at a specific position from the previous test
  - Example: Layer transition tests (player must be at transition cell from previous test)
  - Player moves only vertically or horizontally
  - Tests build on each other's final positions

### HUD Commands (`test/interactions/hud.js`)

```javascript
getJoystickVisuals()      // Movement joystick state
getAimJoystickVisuals()   // Aim joystick state
```

## Test Patterns

### Movement Test

```javascript
const testMoveUp = test(
  {
    given: 'Player in empty level',
    when: 'Player moves up',
    then: 'Player moves >20px upward'
  },
  async (page) => {
    const initialPos = await page.evaluate(() => getPlayerPosition());
    await page.evaluate(() => setPlayerInput(0, -1, 300));
    const finalPos = await page.evaluate(() => getPlayerPosition());
    return finalPos.y < initialPos.y && (initialPos.y - finalPos.y) > 20;
  }
);
```

### Wall Collision Test

```javascript
const testWallBlock = test(
  {
    given: 'Player at (6,5) surrounded by walls',
    when: 'Player tries to reach (7,3)',
    then: 'Player is blocked at (6,4)'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    const result = await page.evaluate(() => moveToCellHelper(7, 3, 1200));
    return !result.reached && result.col === 6 && result.row === 4;
  }
);
```

### Shooting Test

```javascript
const testShooting = test(
  {
    given: 'Player in empty level',
    when: 'Player fires up',
    then: 'At least one bullet spawns'
  },
  async (page) => {
    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));
    
    // Check multiple times during firing
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }
    
    await firePromise;
    return maxBulletCount > 0;
  }
);
```

**Why check max bullet count?** Bullets may be destroyed quickly (hitting walls, etc.), so checking at a single point in time may miss them. Checking the maximum count during the firing period ensures we detect bullets that existed even briefly.

## Best Practices

### Don't Duplicate Magic Numbers

**Always export constants from source code and use them in tests.** This prevents tests from breaking when you tune game values.

**DO ✅**
```typescript
// In src/ecs/entities/player/PlayerEntity.ts
export const PLAYER_MAX_AMMO = 25;

// In test
const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
const ammo = await page.evaluate(() => {
  const player = scene.entityManager.getFirst('player');
  return player.get(window.AmmoComponent).getCurrentAmmo();
});
return ammo === maxAmmo - 1;  // Test adapts to config changes
```

**DON'T ❌**
```typescript
// Hardcoded value in test
return ammo === 24;  // Breaks if PLAYER_MAX_AMMO changes
```

**Common constants to export:**
- `PLAYER_MAX_AMMO` - Max ammo capacity
- `INITIAL_AIM_WAIT_TIME_MS` - First-shot delay
- `PLAYER_FIRE_COOLDOWN_MS` - Time between shots
- `PLAYER_MAX_HEALTH` - Max health

**How to expose constants:**
1. Export from source file: `export const MY_CONSTANT = 100;`
2. Import in `src/main.ts`
3. Add to window in test mode: `(window as unknown as { MY_CONSTANT: number }).MY_CONSTANT = MY_CONSTANT;`
4. Use in tests: `const value = await page.evaluate(() => window.MY_CONSTANT);`

### Mark Test-Only Code

When adding methods or getters solely for testing, mark them with a comment:

```typescript
// Visible for testing
getCurrentAmmo(): number {
  return this.currentAmmo;
}
```

This signals that the method exists for test access, not production use.

## Dos and Don'ts

### ✅ DO

**Keep tests clean and focused:**
```javascript
// Just test definitions and runTests() call
const testFeature = test({ given, when, then }, async (page) => { ... });
runTests({ level, commands, tests, screenshotPath });
```

**Use helper functions:**
```javascript
// Use moveToCellHelper instead of manual movement
const result = await page.evaluate(() => moveToCellHelper(5, 5, 1200));
```

**Return boolean from test functions:**
```javascript
async (page) => {
  const result = await page.evaluate(() => someCheck());
  return result === expectedValue;  // true or false
}
```

**Use stuck detection for movement:**
```javascript
// moveToCellHelper exits early if player stops moving
const result = await page.evaluate(() => moveToCellHelper(7, 3, 1200));
return !result.reached && result.col === 6 && result.row === 4;
```

**Check existence, not deltas:**
```javascript
// ✅ Check if bullets exist during firing
const bulletCount = await page.evaluate(() => getBulletCount());
return bulletCount > 0;

// ❌ Don't compare before/after counts
const before = await page.evaluate(() => getBulletCount());
const after = await page.evaluate(() => getBulletCount());
return after > before;  // Affected by previous bullets
```

**Call enableRemoteInput() before using movement helpers:**
```javascript
await page.evaluate(() => enableRemoteInput());
const result = await page.evaluate(() => moveToCellHelper(5, 5));
```

### ❌ DON'T

**Don't add boilerplate to test files:**
```javascript
// ❌ Don't manually create browser, page, etc.
const browser = await puppeteer.launch(...);
const page = await browser.newPage();
// ... 50 lines of setup

// ✅ Use runTests() instead
runTests({ level, commands, tests, screenshotPath });
```

**Don't modify game state directly:**
```javascript
// ❌ Don't teleport or modify state
transform.x = 100;
health.currentHealth = 50;

// ✅ Simulate user input
await page.evaluate(() => setPlayerInput(1, 0, 300));
```

**Don't use fixed timeouts without stuck detection:**
```javascript
// ❌ Fixed timeout - slow and unreliable
await page.evaluate(() => setPlayerInput(1, 0, 1500));
await new Promise(resolve => setTimeout(resolve, 1550));

// ✅ Use moveToCellHelper with stuck detection
const result = await page.evaluate(() => moveToCellHelper(5, 5, 1200));
```

**Don't create manual test arrays:**
```javascript
// ❌ Manual array with name/fn objects
const tests = [
  { name: 'Test 1', fn: test1 },
  { name: 'Test 2', fn: test2 }
];

// ✅ Just pass test functions
runTests({
  tests: [test1, test2]
});
```

**Don't add section headers to output:**
```javascript
// ❌ Don't log section headers
console.log('=== My Test ===');

// ✅ Just return true/false - runTests() handles output
return result === expected;
```

**Don't forget to enable remote input:**
```javascript
// ❌ Will fail - RemoteInputComponent not added
const result = await page.evaluate(() => moveToCellHelper(5, 5));

// ✅ Enable first
await page.evaluate(() => enableRemoteInput());
const result = await page.evaluate(() => moveToCellHelper(5, 5));
```

## Common Pitfalls

### Player Not Moving

**Problem:** `moveToCellHelper()` returns immediately with `reached: false`

**Cause:** RemoteInputComponent not added to player

**Solution:**
```javascript
await page.evaluate(() => enableRemoteInput());
```

### Test Times Out

**Problem:** Test waits full timeout even though player is stuck

**Cause:** Using fixed timeouts instead of stuck detection

**Solution:** Use `moveToCellHelper()` which detects when player stops moving (500ms threshold)

### Bullets Not Spawning

**Problem:** `getBulletCount()` returns 0 even after firing

**Cause:** Not waiting for bullets to spawn

**Solution:**
```javascript
const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));
await new Promise(resolve => setTimeout(resolve, 50));  // Wait for spawn
const bulletCount = await page.evaluate(() => getBulletCount());
await firePromise;
```

### Test Passes Locally But Fails in CI

**Problem:** Timing-dependent tests fail intermittently

**Cause:** Fixed timeouts too short for slower CI machines

**Solution:** Use stuck detection instead of fixed timeouts

## Test Output Format

```
GIVEN: Player in empty level, WHEN: Player moves up, THEN: Player moves >20px in up direction - ✓ PASSED
GIVEN: Player at (6,5) surrounded by walls, WHEN: Player tries to reach (7,3), THEN: Player is blocked at (6,4) - ✓ PASSED

✓ ALL TESTS PASSED
```

Clean GWT statements with pass/fail indicators. No section headers, no verbose output.

## Test Organization

Tests are organized by entity type in subdirectories:

```
test/tests/
├── player/                    # Player-related tests
│   ├── test-player-movement.js
│   ├── test-player-transition.js
│   ├── test-shooting.js
│   ├── test-projectile-collision.js
│   └── test-wall-collision.js
└── (future: enemy/, projectile/, etc.)
```

The test runner uses `find` to recursively discover all `*.js` files in `test/tests/`, so tests are automatically included when added to any subdirectory.

## Adding Test to Suite

Tests are automatically discovered by `find test/tests -name "*.js"`. Just create your test file in the appropriate subdirectory and it will be included.

## Debugging Tests

**Run with visible browser:**
Tests run with `headless: false` by default - watch what happens.

**Add debug logs:**
```javascript
console.log('[TEST] Player position:', x, y);
```

**Take screenshots:**
Screenshots automatically saved to `tmp/test/screenshots/`

**Check game state:**
```javascript
const debug = await page.evaluate(() => {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const gridPos = player.require(window.GridPositionComponent);
  return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
});
console.log('[TEST] Player at:', debug);
```
