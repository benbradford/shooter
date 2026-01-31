# Test Suite

Automated browser tests for the Dodging Bullets game using Puppeteer.

## Running Tests

```bash
# Run all tests
npm test

# Run single test
./test/run-single-test.sh test/tests/player/test-player-movement.js
```

## Test Structure

```
test/
├── helpers/
│   ├── test-helper.js         # test() wrapper for GWT format
│   ├── test-runner.js         # runTests() boilerplate handler
│   └── logger.js              # Debug logging utilities
├── interactions/
│   ├── player.js              # Player commands (movement, firing, helpers)
│   └── hud.js                 # HUD state queries
├── tests/
│   └── player/                # Player-related tests
│       ├── test-player-movement.js
│       ├── test-player-transition.js
│       ├── test-shooting.js
│       ├── test-projectile-collision.js
│       └── test-wall-collision.js
├── run-all-tests.sh           # Run all tests (finds all *.js in tests/)
└── run-single-test.sh         # Run single test
```

Tests are organized by entity type in subdirectories. The test runner uses `find` to recursively discover all `*.js` files.

## Writing Tests

All tests use the clean `runTests()` format:

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
    const result = await page.evaluate(() => someCheck());
    return result === expectedValue;
  }
);

runTests({
  level: 'test/myLevel',
  commands: ['test/interactions/player.js'],
  tests: [
    testMyFeature
  ],
  screenshotPath: 'tmp/test/screenshots/test-my-feature.png'
});
```

## Player Interaction Helpers

Available in `test/interactions/player.js`:

- `getPlayerPosition()` - Get player x,y coordinates
- `enableRemoteInput()` - Add RemoteInputComponent to player
- `setPlayerInput(dx, dy, durationMs)` - Simulate movement for duration
- `fireWeapon(aimDx, aimDy, durationMs)` - Simulate firing for duration
- `getBulletCount()` - Count active bullets
- `moveToRowHelper(targetRow, maxTimeMs)` - Move to specific row
- `moveToColHelper(targetCol, maxTimeMs)` - Move to specific column
- `moveToCellHelper(targetCol, targetRow, maxTimeMs)` - Move to specific cell with stuck detection

## Test Levels

Test levels in `public/levels/test/`:

- `emptyLevel.json` - 10x10 empty level
- `test-wall-collision.json` - 10x10 with 5x5 wall box
- `test-player-transition.json` - Multi-layer with transitions

### Example: test-wall-collision.json

```
  0 1 2 3 4 5 6 7 8 9
0 . . . . . . . . . .
1 . . . . . . . . . .
2 . . . . . . . . . .
3 . . . █ █ █ █ █ . .
4 . . . █ . . . █ . .
5 . . . █ . . P █ . .  (P = player at 6,5)
6 . . . █ . . . █ . .
7 . . . █ █ █ █ █ . .
8 . . . . . . . . . .
9 . . . . . . . . . .

█ = layer 1 walls
. = layer 0 ground
P = player start
```

## Key Patterns

### Stuck Detection

`moveToCellHelper()` detects when player stops moving:

```javascript
// Exits early if player hasn't moved >1px for 500ms
if (movedX < 1 && movedY < 1) {
  stuckCount++;
  if (stuckCount >= 10) { // 10 checks * 50ms = 500ms
    resolve({ reached: false, col, row });
  }
}
```

### Test Output Format

```
GIVEN: Player in empty level, WHEN: Player moves up, THEN: Player moves >20px in up direction - ✓ PASSED
```

No section headers, just clean GWT statements with pass/fail.
