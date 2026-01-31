# Testing Guide

## Overview

Automated browser tests using Puppeteer. Tests simulate real user input and verify game behavior.

## Running Tests

```bash
npm test                                              # Run all tests
./test/run-single-test.sh test/tests/test-name.js   # Run single test
```

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

Create `test/tests/test-my-feature.js`:

```javascript
import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

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
./test/run-single-test.sh test/tests/test-my-feature.js
```

## Available Helpers

### Player Commands (`test/interactions/player.js`)

```javascript
// Position
getPlayerPosition()                              // Returns {x, y}

// Movement
setPlayerInput(dx, dy, durationMs)              // Simulate movement
moveToRowHelper(targetRow, maxTimeMs)           // Move to specific row
moveToColHelper(targetCol, maxTimeMs)           // Move to specific column
moveToCellHelper(targetCol, targetRow, maxTimeMs) // Move to cell with stuck detection

// Combat
fireWeapon(aimDx, aimDy, durationMs)            // Simulate firing
getBulletCount()                                 // Count active bullets

// Setup
enableRemoteInput()                              // Add RemoteInputComponent to player
```

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
    const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));
    await new Promise(resolve => setTimeout(resolve, 50));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;
    return bulletCount > 0;
  }
);
```

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

## Adding Test to Suite

Edit `test/run-all-tests.sh`:

```bash
TESTS=(
  "test/tests/test-player-movement.js"
  "test/tests/test-shooting.js"
  "test/tests/test-my-feature.js"  # Add here
)
```

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
