# Testing Guide

## Overview

Automated browser tests using Puppeteer with custom shell script runner. Tests simulate real user input and verify game behavior.

## Why Custom Test Runner (Not Jest)

- **Simplicity**: No complex configuration
- **Reliability**: Direct Puppeteer control, no flaky server management
- **Flexibility**: Easy to run individual tests or all tests
- **Maintenance**: Fewer dependencies, no framework lock-in

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

# Verbose mode (show all debug logs)
VERBOSE=true npm run test:single test-ammo-system

# Kill stuck dev server
npm run kill
```

**⚠️ CRITICAL: Always run the test after making ANY change to verify it works.**

## Lessons Learned

### Test Isolation is Critical

Tests can fail due to state bleeding from previous tests. Always ensure clean state:

```javascript
// Wait for full ammo before starting test
await page.evaluate(() => waitForFullAmmo());
```

### Don't Optimize Tests Prematurely

**Lesson:** Trying to speed up tests by reducing wait times or manipulating game state can introduce subtle bugs and test isolation issues.

**Rule:** Prefer reliable tests over fast tests. A slow test that always works is better than a fast test that's flaky.

### Headless Mode for Speed

Use headless mode for faster execution:
- Development: Use visible browser to see what's happening
- CI/Automation: Use headless mode for speed
- Debugging: Use visible browser with keyword filter

### Export Game Constants

Never hardcode game values in tests. Export them and use dynamically to prevent tests from breaking when you tune game balance.

### Single-Shot vs Continuous Fire

- `fireSingleShot(dx, dy)` - Fires exactly once (waits INITIAL_AIM_WAIT_TIME_MS + 50ms, releases before cooldown)
- `fireWeapon(dx, dy, duration)` / `holdFire(dx, dy, duration)` - Holds fire button for duration (fires multiple times)

Use the right helper for your test case.

### Debug One Test at a Time

When tests fail, use keyword filtering to run just one:

```bash
npm run test:single test-ammo-system "fires once"
```

### Add State Management Helpers

Create helpers like `waitForFullAmmo()` to manage game state between tests. This is better than fixed delays because it waits exactly as long as needed.

## Creating a New Test

1. Create test level in `public/levels/test/` (if needed)
2. Create test file in `test/tests/{category}/`
3. Use `test()` helper with GWT format
4. Call `runTests()` with level, commands, tests array

## Available Helpers

See `test/interactions/player.js` for complete list:
- Movement: `moveToPathfindHelper()`, `moveToCellHelper()`, `moveToRowHelper()`, `moveToColHelper()`
- Combat: `fireWeapon()`, `fireSingleShot()`, `traceBullet()`
- Setup: `enableRemoteInput()`, `waitForFullAmmo()`

**When to use which movement helper:**

- **`moveToPathfindHelper(col, row)`** - Best for navigating around walls and obstacles (uses A* pathfinding)
- **`moveToCellHelper(col, row)`** - Independent tests where each test can move the player to any position
- **`moveToRowHelper(row)` / `moveToColHelper(col)`** - Sequential tests where each test depends on the player being at a specific position from the previous test

## Best Practices

### Don't Duplicate Magic Numbers

**Always export constants from source code and use them in tests.** This prevents tests from breaking when you tune game values.

### Mark Test-Only Code

When adding methods or getters solely for testing, mark them with a comment:

```typescript
// Visible for testing
getCurrentAmmo(): number {
  return this.currentAmmo;
}
```

## Dos and Don'ts

### ✅ DO

- Keep tests clean and focused
- Use helper functions
- Return boolean from test functions
- Use stuck detection for movement
- Check existence, not deltas
- Call enableRemoteInput() before using movement helpers

### ❌ DON'T

- Don't add boilerplate to test files
- Don't modify game state directly
- Don't use fixed timeouts without stuck detection
- Don't create manual test arrays
- Don't add section headers to output
- Don't forget to enable remote input

## Common Pitfalls

### Player Not Moving
**Cause:** RemoteInputComponent not added to player
**Solution:** `await page.evaluate(() => enableRemoteInput());`

### Test Times Out
**Cause:** Using fixed timeouts instead of stuck detection
**Solution:** Use `moveToCellHelper()` which detects when player stops moving

### Bullets Not Spawning
**Cause:** Not waiting for bullets to spawn
**Solution:** Check bullet count during firing period, not at single point

### Test Passes Locally But Fails in CI
**Cause:** Timing-dependent tests fail intermittently
**Solution:** Use stuck detection instead of fixed timeouts

## Debugging Tests

- Run with visible browser (default)
- Use `VERBOSE=true` for all debug logs
- Add `testLog()` calls (only shows with VERBOSE)
- Take screenshots (automatically saved)
- Check game state with `page.evaluate()`
