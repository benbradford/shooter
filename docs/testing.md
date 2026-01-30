# Testing Guide

## Overview

The game uses Puppeteer for automated browser-based testing. Tests simulate real user input and verify game behavior without modifying game state directly.

## Running Tests

**Run all tests:**
```bash
npm test
```

**Run single test:**
```bash
./test/run-test.sh test/test-player-movement.js
```

**Test output:**
- ✓ PASSED - Test succeeded
- ✗ FAILED - Test failed
- Screenshots saved to `tmp/test/screenshots/`

## Test Architecture

### Remote Input System

Tests use `RemoteInputComponent` to simulate user input without polluting game code:

**Enabled when:** `?test=true` URL parameter is present

**API:**
- `setWalk(x, y, isPressed)` - Simulate movement joystick
- `setAim(x, y, isPressed)` - Simulate aim joystick
- `getWalkInput()` - Get walk state `{x, y, isPressed}`
- `getAimInput()` - Get aim state `{x, y, isPressed}`

**Example:**
```javascript
// Simulate walking up for 1 second
remoteInput.setWalk(0, -1, true);
await new Promise(resolve => setTimeout(resolve, 1000));
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

**Example usage:**
```javascript
const initialPos = await page.evaluate(() => getPlayerPosition());
await page.evaluate(() => setPlayerInput(0, -1, 1000));
const finalPos = await page.evaluate(() => getPlayerPosition());
```

## Writing Tests

### Test Template

```javascript
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

const playerCommands = readFileSync('test/commands/player.js', 'utf-8');

(async () => {
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
  await page.goto('http://localhost:5173/?test=true', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  // Inject commands
  await page.evaluate(playerCommands);
  
  // Get initial state
  const initialState = await page.evaluate(() => getPlayerPosition());
  
  // Perform action
  await page.evaluate(() => setPlayerInput(0, -1, 1000));
  
  // Get final state
  const finalState = await page.evaluate(() => getPlayerPosition());
  
  // Assert
  const success = finalState.y < initialState.y;
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Test passed: ${success ? '✓' : '✗'}`);
  
  // Screenshot
  await page.screenshot({ path: 'tmp/test/screenshots/test-name.png' });
  
  await browser.close();
  
  process.exit(success ? 0 : 1);
})();
```

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
import { TransformComponent, RemoteInputComponent, HealthComponent } from "./ecs";

if (params.get('test') === 'true') {
  (window as unknown as { HealthComponent: typeof HealthComponent }).HealthComponent = HealthComponent;
}
```

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
