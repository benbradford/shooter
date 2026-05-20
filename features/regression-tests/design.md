# Regression Test Suite — Design

## Architecture

Tests run in the existing Puppeteer framework. Each test file targets a specific system and uses a dedicated test level designed for that system. Tests interact with the game via `RemoteInputComponent` and read state via globally-exposed components and game internals.

## Test Level Strategy

Each test area needs a minimal level:
- `test-combat.json` — Player + 1 enemy in a small room. `canPunch: true` flag set.
- `test-flags.json` — Player in an empty room. Flags toggled programmatically.
- `test-push.json` — Player + pushable block + target cell. `canPush: true`.
- `test-jump.json` — Player next to a 1-cell gap. `canJump: true`.
- `test-water.json` — Player next to water cells. Tests swim gating.
- `test-health.json` — Player + enemy that fires projectiles.
- `test-triggers.json` — Player + trigger zone that sets flags.

## New Test Globals Needed

Add to `main.ts` test-mode block:
- `WorldStateManager` — for setting/reading flags programmatically
- `AttackComboComponent` — for reading punch state
- `HealthComponent` — for reading health values
- `WalkComponent` — for checking movement state
- `StateMachineComponent` — for reading player state
- `EntityManager` (already accessible via `scene.entityManager`)

## Test File Organization

```
test/tests/
├── combat/
│   ├── test-punch-basic.js          — Task 1
│   ├── test-punch-damage.js         — Task 2
│   ├── test-super-punch.js          — Task 5
│   └── test-punch-while-moving.js   — Task 6
├── flags/
│   ├── test-flag-gating.js          — Task 3
│   └── test-flag-persistence.js     — Task 7
├── movement/
│   ├── test-push-basic.js           — Task 4
│   ├── test-jump-basic.js           — Task 8
│   └── test-water-swim.js           — Task 9
├── health/
│   └── test-health-damage.js        — Task 10
└── events/
    └── test-triggers.js             — Task 11
```

## Interaction Helpers to Add

### `test/interactions/combat.js`
```javascript
function getPunchState() { /* read AttackComboComponent state */ }
function isPunching() { /* sm.state !== 'idle' */ }
function getEnemyHealth(entityId) { /* read HealthComponent */ }
function getEnemyCount() { /* count entities with 'enemy' tag */ }
```

### `test/interactions/flags.js`
```javascript
function setFlag(name, value) { /* WorldStateManager.setFlag */ }
function getFlag(name) { /* WorldStateManager.getFlag */ }
function isFlagTrue(name) { /* WorldStateManager.isFlagTrue */ }
```

### `test/interactions/state.js`
```javascript
function getPlayerState() { /* StateMachineComponent current state name */ }
function getPlayerHealth() { /* HealthComponent.getHealth() */ }
function isPlayerDead() { /* health <= 0 */ }
```

## Test Pattern

Each test follows this pattern:
1. Set up preconditions (flags, position)
2. Perform action via `RemoteInputComponent`
3. Wait appropriate time for action to complete
4. Assert observable state change

Example for punch:
```javascript
// Set canPunch flag
await page.evaluate(() => setFlag('canPunch', 'true'));
// Wait a frame for CachedFlag to update
await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
// Punch
await page.evaluate(() => punchAndWait(0, 1, 600));
// Verify punch happened
const didPunch = await page.evaluate(() => {
  // Check if a punch projectile was created (or enemy took damage)
  return getEnemyHealth('enemy1') < startHealth;
});
```
