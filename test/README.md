# Test Suite

Automated browser tests using Puppeteer.

## Running Tests

```bash
# All tests
npm test                                    # Visible browser
npm run test:headless                       # Headless mode

# Single test file
npm run test:single test-ammo-system        # Visible browser
npm run test:headless:single test-ammo-system  # Headless mode

# Filter by keyword
npm run test:single test-ammo-system "refills"
npm run test:headless:single test-ammo-system "refills"

# Kill stuck dev server
npm run kill
```

## Structure

```
test/
├── helpers/           # Test framework (test(), runTests())
├── interactions/      # Game commands (player.js, hud.js)
├── tests/player/      # Player tests
└── run-*.sh          # Test runners
```

## Key Helpers

**Movement:**
- `moveToCellHelper(col, row, maxTime)` - Move to cell with stuck detection
- `setPlayerInput(dx, dy, duration)` - Manual movement control

**Combat:**
- `fireSingleShot(dx, dy)` - Fire exactly once
- `holdFire(dx, dy, duration)` - Hold fire button
- `waitForFullAmmo()` - Wait for full reload (use between tests!)

**State:**
- `enableRemoteInput()` - Required before firing
- `getPlayerPosition()` - Get x,y coordinates
- `getBulletCount()` - Count active bullets

## Writing Tests

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
    await page.evaluate(() => waitForFullAmmo());  // Clean state!
    // Test logic - return true/false
    return result === expected;
  }
);

runTests({
  level: 'test/my-level',
  commands: ['test/interactions/player.js'],
  tests: [testMyFeature],
  screenshotPath: 'tmp/test/screenshots/test-my-feature.png'
});
```

## Tips

- **Always** call `waitForFullAmmo()` at start of tests for isolation
- Use keyword filtering to debug one test at a time
- Export game constants (like `PLAYER_MAX_AMMO`) instead of hardcoding values
- `fireSingleShot()` for single shots, `holdFire()` for continuous fire
- Use headless mode for faster CI/automated testing
- Ctrl+C stops tests immediately and kills dev server

See `docs/testing.md` for comprehensive guide.
