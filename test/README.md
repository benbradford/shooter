# Running Tests

## Setup

1. Start the dev server:
```bash
npm run dev
```

2. In another terminal, run the test:
```bash
node test/test-player-movement.js
```

## What the test does

1. Launches a Chrome browser (visible, not headless)
2. Navigates to `http://localhost:5173/?test=true`
3. Waits for game to load (3 seconds)
4. Gets initial player position via `testAPI.getPlayerPosition()`
5. Moves player up 100 pixels via `testAPI.movePlayer(0, -100)`
6. Gets final player position
7. Verifies player moved up by exactly 100 pixels
8. Takes a screenshot to `test/test-result.png`
9. Prints test results

## How it confirms movement

The test reads the player's `TransformComponent` position before and after the move:
- Initial Y position (e.g., 576)
- Final Y position (e.g., 476)
- Confirms: `finalY < initialY` (moved up)
- Confirms: `initialY - finalY === 100` (correct amount)

## Test API

Available in browser console when `?test=true`:

```javascript
testAPI.getPlayerPosition()  // Returns { x: number, y: number }
testAPI.movePlayer(dx, dy)   // Moves player by dx, dy pixels
```
