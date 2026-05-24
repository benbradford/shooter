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
npm test                                      # Visible browser
npm run test:headless                         # Headless mode (faster)

# Single test file
npm run test:single test-player-movement      # Visible browser
npm run test:headless:single test-player-movement  # Headless mode

# Filter by keyword
npm run test:single test-player-movement "diagonal"

# Verbose mode (show all debug logs)
VERBOSE=true npm run test:single test-player-movement

# Kill stuck dev server
npm run kill
```

**⚠️ CRITICAL: Always run the test after making ANY change to verify it works.**

## Lessons Learned

### Test-First Bug Fixes

When fixing bugs, always write a failing test before changing implementation code:
1. Write a test that asserts correct behavior (must FAIL against current code)
2. Run it — confirm it fails for the right reason
3. Fix the code
4. Run the test — confirm it passes
5. Run related tests to check for regressions

Without a reproducing test, fixes are just guesses that require manual verification.

### Test Isolation is Critical

Tests can fail due to state bleeding from previous tests. Always ensure a clean starting position before each test (e.g. `moveToCellHelper(startCol, startRow)`), and reset transient state between tests.

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

### Debug One Test at a Time

When tests fail, use keyword filtering to run just one:

```bash
npm run test:single test-player-movement "blocked by wall"
```

## Creating a New Test

1. Create test level in `public/levels/test/` (if needed)
2. Create test file in `test/tests/{category}/`
3. Use `test()` helper with GWT format
4. Call `runTests()` with level, commands, tests array

## Test-Mode Globals

When the game loads with `?test=true`, `src/main.ts` exposes these on `globalThis`:
- `game`, `TransformComponent`, `RemoteInputComponent`, `GridPositionComponent`, `ProjectileComponent`
- `AttackButtonComponent`, `AttackComboComponent`, `HealthComponent`, `WalkComponent`, `StateMachineComponent`
- `WorldStateManager`, `WaterEffectComponent`, `PetAbilityComponent`, `DogBarkAbility`, `Pathfinder`
- `JoystickVisualsComponent`, `AimJoystickVisualsComponent`
- `CachedFlag`, `PushableComponent`, `JumpComponent`

**Test levels:** `public/levels/test/` — dedicated levels for testing (e.g., `test-combat.json`, `test-punch-damage.json`, `test-super-punch.json`, `test-swim.json`, `test-triggers.json`, `test-gameplay-loop.json`, `test-push.json`, `test-jump.json`, `test-pet-jump.json`)

When adding a new test that needs access to a component not yet exposed, add it to the test-mode block in `src/main.ts`.

## Available Helpers

Helpers are split across files in `test/interactions/`:

| File | Provides |
|------|----------|
| `player.js` | Movement, position, remote input, punch actions, attack button |
| `combat.js` | Punch state inspection, enemy health/count, wait-for-punch |
| `flags.js` | WorldState flag get/set/wait |
| `state.js` | Player state machine, health, death, water detection |
| `hud.js` | Joystick visual state |
| `input.js` | Low-level joystick touch simulation, testLog |

**Setup:**
- `enableRemoteInput()` — must be called before any movement helpers
- `setPlayerInput(dx, dy, durationMs)` — direct input override

**Movement:**
- `moveToPathfindHelper(col, row)` — A* pathfinding around walls
- `moveToCellHelper(col, row)` — direct movement, with stuck detection
- `moveToRowHelper(row)` / `moveToColHelper(col)` — single-axis movement

**Combat (player.js):**
- `punch(dirX, dirY)` — fires one punch in the given direction
- `punchAndWait(dirX, dirY, waitMs)` — punch and wait for it to complete (default 600ms)
- `chargeSuperPunch(dirX, dirY, holdMs)` — hold punch for `holdMs` to trigger super punch (≥1s + `hasSuperPunch` flag)
- `getAttackButtonState()` — read current button state (for verifying icon overrides like push/jump/lips)

**Combat (combat.js):**
- `isPunching()` — boolean: is the player currently in a punch animation
- `getPunchState()` — returns `{ isPunching, isMovementLocked, isFacingLocked }`
- `getEnemyHealth(entityId)` — get enemy health by entity ID
- `getEnemyCount()` — count of alive enemies in scene
- `getAllEnemies()` — array of `{ id, health, x, y }` for all enemies
- `waitForPunchComplete(maxMs)` — resolves when punch ends (default 1000ms)

**Flags:**
- `setFlag(name, value)` — set a WorldState flag from test code
- `getFlag(name)` — get a WorldState flag value
- `isFlagTrue(name)` — boolean check
- `waitForFlagSync(ms)` — wait for CachedFlag subscribers to update (default 50ms)

**State:**
- `getPlayerState()` — current state machine key (e.g., `'idle'`, `'walk'`, `'punch'`)
- `getPlayerHealth()` / `getPlayerMaxHealth()` — player HP
- `setPlayerHealth(value)` — set player HP directly
- `isPlayerDead()` — death check
- `isPlayerInWater()` — water state check

**Inspection:**
- `getPlayerPosition()` — current `{ x, y }` and grid cell

**When to use which movement helper:**
- **`moveToPathfindHelper(col, row)`** — best for navigating around walls and obstacles
- **`moveToCellHelper(col, row)`** — independent tests where each test moves the player anywhere
- **`moveToRowHelper(row)` / `moveToColHelper(col)`** — sequential tests where each depends on the previous position

## Best Practices

### Don't Duplicate Magic Numbers

**Always export constants from source code and use them in tests.** This prevents tests from breaking when you tune game values.

### Mark Test-Only Code

When adding methods or getters solely for testing, mark them with a comment:

```typescript
// Visible for testing
getCurrentHealth(): number {
  return this.currentHealth;
}
```

## Dos and Don'ts

### ✅ DO

- Keep tests clean and focused
- Use helper functions
- Return boolean from test functions
- Use stuck detection for movement
- Check existence, not deltas
- Call `enableRemoteInput()` before using movement helpers

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

### Punch Doesn't Land
**Cause:** Punch hitbox spawns 150ms into the animation; testing immediately after `punch()` won't see damage applied. Use `punchAndWait()` or poll for the enemy state change.

### Test Passes Locally But Fails in CI
**Cause:** Timing-dependent tests fail intermittently
**Solution:** Use stuck detection instead of fixed timeouts

## Debugging Tests

- Run with visible browser (default)
- Use `VERBOSE=true` for all debug logs
- Add `testLog()` calls (only shows with VERBOSE)
- Take screenshots (automatically saved)
- Check game state with `page.evaluate()`
