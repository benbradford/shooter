# Testing Guide

## Overview

The game uses Puppeteer for automated browser-based testing. Tests simulate real user input and verify game behavior without modifying game state directly.

## Test Structure

```
test/
├── helpers/
│   └── gwt-helper.js          # Given-When-Then output helper
├── interactions/
│   ├── player.js              # Player interaction commands
│   └── hud.js                 # HUD interaction commands
├── tests/
│   ├── test-player-movement.js
│   ├── test-shooting.js
│   └── test-wall-collision.js
├── run-all-tests.sh           # Run all tests
└── run-single-test.sh         # Run single test

public/levels/test/
└── test-wall-collision.json   # Test-specific level files
```

## Running Tests

**Run all tests:**
```bash
npm test
```

**Run all tests (verbose):**
```bash
./test/run-all-tests.sh -v
```

**Run single test:**
```bash
./test/run-single-test.sh test/tests/test-player-movement.js
```

The script automatically starts the dev server, runs the test, and stops the server.

**⚠️ CRITICAL: After modifying any test, you MUST run it to verify it works.**

**Test output:**
- ✓ TEST PASSED - Test succeeded
- ✗ TEST FAILED - Test failed
- Screenshots saved to `tmp/test/screenshots/`

## Creating a New Test

### 1. Create Test Level (if needed)

Create a level file in `public/levels/test/`:

```json
{
  "width": 10,
  "height": 10,
  "playerStart": {
    "x": 5,
    "y": 5
  },
  "cells": [
    {"col": 3, "row": 3, "layer": 1},
    {"col": 4, "row": 3, "layer": 1}
  ]
}
```

### 2. Create Test File

Create `test/tests/test-your-feature.js`:

```javascript
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');

(async () => {
  // Define test expectations
  outputGWT({
    title: 'Your Feature Test',
    given: 'Initial state description',
    when: 'Action performed',
    then: 'Expected outcome'
  });
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,720']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // Capture test logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TEST]')) {
      console.log(text);
    }
  });
  
  // Load game with test level
  await page.goto('http://localhost:5173/?test=true&level=test/your-level', { 
    waitUntil: 'networkidle2' 
  });
  
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  // Inject interaction commands
  await page.evaluate(playerCommands);
  
  // Perform test actions
  const initialState = await page.evaluate(() => getPlayerPosition());
  
  await page.evaluate(() => setPlayerInput(0, -1, 500));
  await new Promise(resolve => setTimeout(resolve, 550));
  
  const finalState = await page.evaluate(() => getPlayerPosition());
  
  // Assert results
  const success = finalState.y < initialState.y;
  
  if (success) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-your-feature.png' });
  await browser.close();
  
  process.exit(success ? 0 : 1);
})();
```

### 3. Using outputGWT

**Single when/then:**
```javascript
outputGWT({
  title: 'Player Movement Test',
  given: 'A player in an empty 10x10 level',
  when: 'The player receives movement input',
  then: 'The player should move in the correct direction'
});
```

**Multiple when/then pairs:**
```javascript
outputGWT({
  title: 'Wall Collision Test',
  given: 'Player is surrounded by a 5x5 wall box',
  when: [
    'Player fires bullets in all 8 directions',
    'Player moves in diagonal circle'
  ],
  then: [
    'All bullets are blocked by walls',
    'Player movement is blocked by walls'
  ]
});
```

### 4. Add to Test Suite

Edit `test/run-all-tests.sh`:

```bash
TESTS=(
  "test/tests/test-player-movement.js"
  "test/tests/test-shooting.js"
  "test/tests/test-wall-collision.js"
  "test/tests/test-your-feature.js"  # Add here
)
```

### 5. Run the Test

```bash
./test/run-single-test.sh test/tests/test-your-feature.js
```

## Test Architecture

### Remote Input System

Tests use `RemoteInputComponent` to simulate user input without polluting game code:

**Enabled when:** `?test=true` URL parameter is present

**API:**
- `setWalk(x, y, isPressed)` - Simulate movement joystick (x, y are -1 to 1, isPressed is boolean)
- `setAim(x, y, isPressed)` - Simulate aim joystick (x, y are -1 to 1, isPressed is boolean)
- `getWalkInput()` - Get walk state `{x, y, isPressed}`
- `getAimInput()` - Get aim state `{x, y, isPressed}`
- `getWalkPointerState()` - Get simulated pointer positions for walk joystick HUD
- `getAimPointerState()` - Get simulated pointer positions for aim joystick HUD

**How it works:**
- RemoteInputComponent is added to the player entity when tests call `enableRemoteInput()`
- InputComponent checks for RemoteInputComponent first, before checking keyboard/touch input
- Visual HUD components (JoystickVisualsComponent, AimJoystickVisualsComponent) also check RemoteInputComponent
- This allows tests to verify both gameplay logic AND visual HUD behavior

**Example:**
```javascript
// Simulate walking up for 300ms
remoteInput.setWalk(0, -1, true);
await new Promise(resolve => setTimeout(resolve, 300));
remoteInput.setWalk(0, 0, false);
```

### Test Commands

Reusable commands are in `test/commands/`:

**player.js:**
- `getPlayerPosition()` - Returns `{x, y}`
- `setPlayerInput(dx, dy, durationMs)` - Simulate movement
- `fireWeapon(aimDx, aimDy, durationMs)` - Simulate firing
- `getBulletCount()` - Count active bullets
- `enableRemoteInput()` - Add RemoteInputComponent to player

**hud.js:**
- `getJoystickVisuals()` - Get movement joystick HUD state (position, alpha, visibility)
- `getAimJoystickVisuals()` - Get aim joystick HUD state (position, alpha, visibility)

**Example usage:**
```javascript
const initialPos = await page.evaluate(() => getPlayerPosition());
await page.evaluate(() => setPlayerInput(0, -1, 300));
const finalPos = await page.evaluate(() => getPlayerPosition());

// Verify HUD updates
const hudState = await page.evaluate(() => getJoystickVisuals());
console.log(`HUD alpha: ${hudState.outerCircle.alpha}`);
```

## Writing Tests

### Test Template

```javascript
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');

(async () => {
  outputGWT({
    title: 'Your Test Name',
    given: 'Initial state description',
    when: 'Action performed',
    then: 'Expected outcome'
  });
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,720']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // Capture test logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TEST]')) {
      console.log(text);
    }
  });
  
  // Navigate and wait for game
  console.log('Navigating to game...');
  await page.goto('http://localhost:5173/?test=true&level=test/your-level', { 
    waitUntil: 'networkidle2' 
  });
  
  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  // Inject commands
  await page.evaluate(playerCommands);
  
  // Perform test actions
  const initialState = await page.evaluate(() => getPlayerPosition());
  
  await page.evaluate(() => setPlayerInput(0, -1, 500));
  await new Promise(resolve => setTimeout(resolve, 550));
  
  const finalState = await page.evaluate(() => getPlayerPosition());
  
  // Assert results
  const success = finalState.y < initialState.y;
  
  if (success) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-name.png' });
  
  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }
  
  process.exit(success ? 0 : 1);
})();
```

### Position-Based Movement Helpers

For smooth, reliable movement testing, use position-based helpers that move to specific pixel coordinates:

```javascript
// Move to specific row (vertical movement)
async function moveToRow(page, targetRow, maxTimeMs = 5000) {
  const cellSize = 64;
  const targetY = targetRow * cellSize + cellSize / 2 - 10; // Slightly above center
  const threshold = 5; // Must be within 5px
  const startTime = Date.now();
  
  const startPos = await page.evaluate(() => getPlayerPosition());
  const dy = targetY - startPos.y;
  const dirY = dy > 0 ? 1 : -1;
  
  let checkCount = 0;
  let lastY = startPos.y;
  let stuckCount = 0;
  
  while (Date.now() - startTime < maxTimeMs) {
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const currentPos = await page.evaluate(() => getPlayerPosition());
    checkCount++;
    
    // Detect if stuck (not moving)
    if (Math.abs(currentPos.y - lastY) < 1) {
      stuckCount++;
      if (stuckCount > 40) { // Stuck for 200ms
        await page.evaluate(() => setPlayerInput(0, 0, 0));
        return false;
      }
    } else {
      stuckCount = 0;
      lastY = currentPos.y;
    }
    
    // Re-apply input every 100ms to maintain movement
    if (checkCount % 20 === 0) {
      page.evaluate((y) => setPlayerInput(0, y, 10000), dirY);
    }
    
    if (Math.abs(currentPos.y - targetY) < threshold) {
      await page.evaluate(() => setPlayerInput(0, 0, 0));
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    }
  }
  
  await page.evaluate(() => setPlayerInput(0, 0, 0));
  return false;
}

// Move to specific column (horizontal movement)
async function moveToCol(page, targetCol, maxTimeMs = 5000) {
  // Similar implementation for horizontal movement
}
```

**Key features:**
- **5ms check interval**: Fast enough to catch target position
- **Re-apply input every 100ms**: Maintains movement despite momentum/friction
- **Stuck detection**: Exits early if blocked by walls (200ms without movement)
- **5px threshold**: Ensures player reaches cell center, not just enters cell

**Why position-based instead of cell-based:**
- More reliable - no overshooting
- Smoother movement
- Better control over exact positioning
- Can target specific positions within cells (e.g., slightly above center to avoid collision box overlap)

### Test Principles

**1. Don't Confound Tests**
- Never modify game state directly (e.g., `transform.x += 100`)
- Always simulate user input via RemoteInputComponent
- Let game physics and systems work naturally

**❌ Bad:**
```javascript
// Directly modifying position
transform.x += 100;
```

**✅ Good:**
```javascript
// Simulating user input
remoteInput.setWalk(1, 0, true);
await wait(1000);
remoteInput.setWalk(0, 0, false);
```

**2. Everything Driven by User Input**
- Movement: `setWalk(x, y, isPressed)`
- Aiming: `setAim(x, y, isPressed)`
- No shortcuts or teleportation

**3. Get Feedback from Game State**
- Read component values: `getPlayerPosition()`, `getBulletCount()`
- Don't assume behavior - verify it
- Check state before and after actions

**4. Wait for Game to Update**
- Game runs at 60 FPS
- Actions take time (movement, firing, cooldowns)
- Use `await new Promise(resolve => setTimeout(resolve, ms))`

**5. Test One Thing**
- Each test should verify one behavior
- Keep tests focused and simple
- Name tests clearly: `test-player-movement.js`, `test-shooting.js`

**6. Check Existence, Not Deltas**
- When testing if bullets fired, check if `bulletCount > 0` during firing
- Don't compare before/after counts (previous bullets may still exist)
- Example:
  ```javascript
  // ✅ Good: Check if bullets exist
  const duringBullets = await page.evaluate(() => getBulletCount());
  const passed = duringBullets > 0;
  
  // ❌ Bad: Compare counts (affected by previous bullets)
  const initialBullets = await page.evaluate(() => getBulletCount());
  const duringBullets = await page.evaluate(() => getBulletCount());
  const passed = duringBullets > initialBullets;
  ```

**7. Re-apply Input to Maintain Movement**
- Player momentum/friction can cause movement to stop
- Re-apply input every 100ms (every 20 checks at 5ms intervals)
- Prevents player from stopping before reaching target
- Example:
  ```javascript
  if (checkCount % 20 === 0) {
    page.evaluate((x) => setPlayerInput(x, 0, 10000), dirX);
  }
  ```

**8. Detect When Stuck**
- Check if player position hasn't changed for 200ms
- Exit early instead of waiting for timeout
- Faster tests and clearer failure messages
- Example:
  ```javascript
  if (Math.abs(currentPos.x - lastX) < 1) {
    stuckCount++;
    if (stuckCount > 40) { // 200ms at 5ms checks
      return false; // Player is stuck
    }
  }
  ```

## Getting Feedback from Game

### Reading Component Values

Access game state via `window.game`:

```javascript
function getPlayerHealth() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const health = player.require(window.HealthComponent);
  return health.getRatio();
}
```

### Counting Entities

```javascript
function getEnemyCount() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  return scene.entityManager.getByType('robot').length;
}
```

### Checking Entity State

```javascript
function isPlayerMoving() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const walk = player.components.find(c => c.constructor.name === 'WalkComponent');
  return walk.isMoving();
}
```

## Adding New Tests

### 1. Create Test File

Create `test/test-your-feature.js` using the template above.

### 2. Add to Test Suite

Edit `test/run-all-tests.sh`:

```bash
TESTS=(
  "test/test-player-movement.js"
  "test/test-shooting.js"
  "test/test-your-feature.js"  # Add here
)
```

### 3. Add Commands (if needed)

If you need new commands, add to `test/commands/`:

```javascript
// test/commands/enemy.js
function getEnemyCount() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  return scene.entityManager.getByType('robot').length;
}
```

Then inject in your test:

```javascript
const enemyCommands = readFileSync('test/commands/enemy.js', 'utf-8');
await page.evaluate(enemyCommands);
```

### 4. Expose Components (if needed)

If you need to access new components, expose them in `main.ts`:

```typescript
import { TransformComponent, RemoteInputComponent, YourComponent } from "./ecs";

if (params.get('test') === 'true') {
  (window as unknown as { YourComponent: typeof YourComponent }).YourComponent = YourComponent;
}
```

**Critical:** Also export the component from `src/ecs/index.ts`:

```typescript
export { YourComponent } from './components/category/YourComponent';
```

## Verifying HUD Visual Components

### HUD Test Pattern

Tests can verify that HUD visual components update correctly:

```javascript
// Get HUD state
const hudState = await page.evaluate(() => getJoystickVisuals());

// Verify alpha transitions
console.log(`Initial alpha: ${hudState.outerCircle.alpha}`); // Should be 0.3
console.log(`Pressed alpha: ${hudState.outerCircle.alpha}`); // Should be 1.0

// Verify position changes
console.log(`Inner circle moved: ${hudState.innerCircle.x !== hudState.outerCircle.x}`);
```

### HUD Command Implementation

HUD commands use `entity.get(ComponentClass)` to access visual components:

```javascript
function getJoystickVisuals() {
  const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
  const joystickEntity = hudScene.joystickEntity;
  const visuals = joystickEntity.get(window.JoystickVisualsComponent);
  
  return {
    outerCircle: {
      x: visuals.outerCircle.x,
      y: visuals.outerCircle.y,
      alpha: visuals.outerCircle.alpha
    },
    innerCircle: {
      x: visuals.innerCircle.x,
      y: visuals.innerCircle.y,
      alpha: visuals.innerCircle.alpha
    }
  };
}
```

**Key points:**
- Access HUD entities via scene reference (e.g., `hudScene.joystickEntity`)
- Use `entity.get(window.ComponentClass)` to get component instance
- Component classes must be exposed on `window` in `main.ts`
- Return plain objects (not Phaser objects) for serialization

## Example Tests

### Movement Test

**What it tests:** Player moves when walk input is active

**How:**
1. Get initial position
2. Simulate upward movement for 1 second
3. Get final position
4. Verify Y decreased (moved up)

**Assertion:**
```javascript
const movedUp = finalPos.y < initialPos.y;
const distanceMoved = initialPos.y - finalPos.y;
const success = movedUp && distanceMoved > 50;
```

### Shooting Test

**What it tests:** Weapon fires bullets when aim is active

**How:**
1. Count bullets (should be 0)
2. Simulate firing for 1 second
3. Count bullets while firing
4. Verify bullets > 0

**Assertion:**
```javascript
const bulletsFired = duringBullets - initialBullets;
const success = bulletsFired > 0;
```

## Common Patterns

### Waiting for Actions

```javascript
// Start action
const actionPromise = page.evaluate(() => setPlayerInput(0, -1, 1000));

// Wait for effect
await new Promise(resolve => setTimeout(resolve, 100));

// Check state
const state = await page.evaluate(() => getPlayerPosition());

// Wait for action to complete
await actionPromise;
```

### Checking Multiple Conditions

```javascript
const results = await page.evaluate(() => {
  return {
    position: getPlayerPosition(),
    health: getPlayerHealth(),
    bulletCount: getBulletCount()
  };
});

const allGood = 
  results.position.y < initialY &&
  results.health === 1.0 &&
  results.bulletCount > 0;
```

### Timing-Sensitive Tests

```javascript
// Fire weapon
const firePromise = page.evaluate(() => fireWeapon(0, -1, 1000));

// Check immediately (bullet should exist)
await new Promise(resolve => setTimeout(resolve, 100));
const duringBullets = await page.evaluate(() => getBulletCount());

// Wait for completion
await firePromise;

// Check after (bullet may have despawned)
const afterBullets = await page.evaluate(() => getBulletCount());
```

## Debugging Tests

### Enable Console Logs

Tests capture `[TEST]` prefixed logs:

```javascript
console.log('[TEST] Player position:', x, y);
```

### Run with Visible Browser

Tests run with `headless: false` by default - you can see what's happening.

### Take Screenshots

```javascript
await page.screenshot({ path: 'tmp/test/screenshots/debug.png' });
```

### Check Game State

Add debug commands:

```javascript
function debugGameState() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  console.log('[TEST] Entities:', scene.entityManager.count);
  console.log('[TEST] Player:', scene.entityManager.getFirst('player'));
}
```

## Troubleshooting

### Test Fails Intermittently

**Cause:** Timing issues - game not ready or action not complete

**Solution:** Add waits or use `waitForFunction`:

```javascript
await page.waitForFunction(() => {
  return getBulletCount() > 0;
}, { timeout: 2000 });
```

### Can't Access Component

**Cause:** Component not exposed on window

**Solution:** Add to `main.ts`:

```typescript
(window as unknown as { MyComponent: typeof MyComponent }).MyComponent = MyComponent;
```

**Also export from `src/ecs/index.ts`:**

```typescript
export { MyComponent } from './components/category/MyComponent';
```

### HUD Commands Return Undefined

**Cause:** Component class not exposed on window, or using wrong access pattern

**Solution:**

1. **Expose component in `main.ts`:**
```typescript
import { JoystickVisualsComponent } from "./ecs";

if (params.get('test') === 'true') {
  (window as unknown as { JoystickVisualsComponent: typeof JoystickVisualsComponent }).JoystickVisualsComponent = JoystickVisualsComponent;
}
```

2. **Export from `src/ecs/index.ts`:**
```typescript
export { JoystickVisualsComponent } from './components/ui/JoystickVisualsComponent';
```

3. **Use `entity.get(window.ComponentClass)` not `components.find()`:**
```javascript
// ✓ CORRECT
const visuals = joystickEntity.get(window.JoystickVisualsComponent);

// ✗ WRONG
const visuals = joystickEntity.components.find(c => c.constructor.name === 'JoystickVisualsComponent');
```

### RemoteInputComponent Not Working with HUD

**Cause:** HUD visual components not checking RemoteInputComponent for pointer state

**Solution:** Update HUD components to check RemoteInputComponent:

```typescript
// In JoystickVisualsComponent.update()
const remoteInput = this.playerEntity?.get(RemoteInputComponent);
if (remoteInput) {
  const pointerState = remoteInput.getWalkPointerState();
  if (pointerState.active) {
    // Use pointerState.startX, startY, currentX, currentY
  }
}
```

### Test Passes but Behavior Wrong

**Cause:** Test is checking wrong thing or not waiting long enough

**Solution:** Add more specific assertions and verify timing

## Best Practices

1. **Keep tests independent** - Each test should work alone
2. **Clean state** - Tests start fresh (game reloads each time)
3. **Descriptive names** - `test-player-movement.js` not `test1.js`
4. **One assertion** - Test one behavior per file
5. **Fast tests** - Keep under 10 seconds when possible
6. **No flaky tests** - If it fails sometimes, fix the timing
7. **Document assumptions** - Comment what you're testing and why

## CI Integration

Tests exit with code 0 (pass) or 1 (fail), making them CI-friendly:

```bash
npm test || exit 1
```

## Future Improvements

Potential enhancements:
- Test coverage reporting
- Parallel test execution
- Visual regression testing
- Performance benchmarks
- Headless mode for CI
