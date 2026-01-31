# Test Suite

This directory contains automated browser tests for the Dodging Bullets game.

## Running Tests

```bash
# Run all tests
npm test

# Run single test
./test/run-single-test.sh test/tests/test-player-movement.js

# Run with verbose output
./test/run-all-tests.sh -v
```

## Test Structure

```
test/
├── helpers/
│   └── gwt-helper.js          # Given-When-Then output helper
├── interactions/
│   ├── player.js              # Player interaction commands
│   └── hud.js                 # HUD interaction commands
├── tests/
│   ├── test-player-movement.js    # 8-direction movement
│   ├── test-shooting.js           # Weapon firing
│   ├── test-wall-collision.js     # Wall blocking
│   └── test-player-transition.js  # Layer transitions
├── run-all-tests.sh           # Run all tests
└── run-single-test.sh         # Run single test
```

## Test Levels

Test levels are stored in `public/levels/test/`:

- `emptyLevel.json` - 10x10 empty level for movement/shooting tests
- `test-wall-collision.json` - 5x5 wall box for collision tests
- `test-player-transition.json` - Multi-layer level with transitions

## Map Visualization Format

When discussing test levels, use this format to visualize the grid:

```
     Col: 0    1    2    3    4    5    6    7
Row 0:   [ ]  [L1] [L1] [L1] [L1] [L1] [L1] [ ]
Row 1:   [ ]  [W1] [W1] [T1] [T1] [W1] [W1] [ ]
Row 2:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 3:   [ ]  [ ]  [ ]  [ ]  [P]  [ ]  [ ]  [ ]
Row 4:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 5:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]

Legend:
[ ]  = Layer 0 (ground)
[L1] = Layer 1 platform
[W1] = Layer 1 wall
[T1] = Layer 1 transition (staircase)
[P]  = Player start position
[E]  = Enemy spawn
[B]  = Bug base
```

### Example: test-player-transition.json

```
     Col: 0    1    2    3    4    5    6    7
Row 0:   [ ]  [L1] [L1] [L1] [L1] [L1] [L1] [ ]
Row 1:   [ ]  [W1] [W1] [T1] [T1] [W1] [W1] [ ]
Row 2:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 3:   [ ]  [ ]  [ ]  [ ]  [P]  [ ]  [ ]  [ ]
Row 4:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 5:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
```

**Test Flow:**
1. Player starts at (4,3)
2. Move to transition cell (4,1)
3. Try to exit horizontally - blocked
4. Move up to layer 1 at (4,0)
5. Move right to edge (6,0) - blocked
6. Try to move down - blocked (no transition)
7. Move left to (4,0) then down through transition to (4,3)

### Example: test-wall-collision.json

```
     Col: 0    1    2    3    4    5    6
Row 0:   [ ]  [W1] [W1] [W1] [W1] [W1] [ ]
Row 1:   [ ]  [W1] [ ]  [ ]  [ ]  [W1] [ ]
Row 2:   [ ]  [W1] [ ]  [P]  [ ]  [W1] [ ]
Row 3:   [ ]  [W1] [ ]  [ ]  [ ]  [W1] [ ]
Row 4:   [ ]  [W1] [W1] [W1] [W1] [W1] [ ]
Row 5:   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
```

**Test Flow:**
1. Player starts at (3,2) inside wall box
2. Fire bullets in all 8 directions - all blocked by walls
3. Move in diagonal circle - all blocked by walls

## Creating New Tests

See `docs/testing.md` for detailed guide on:
- Test template
- Position-based movement helpers
- Test principles
- Common patterns

## Key Principles

1. **Check existence, not deltas** - Test if bullets exist during firing, not count differences
2. **Re-apply input** - Maintain movement by re-applying input every 100ms
3. **Detect stuck** - Exit early when player stops moving (200ms threshold)
4. **Position-based movement** - Move to specific pixel coordinates, not just cell entry
5. **5ms check interval** - Fast enough to catch target positions accurately

## Known Issues

- **Projectile emitter overlap**: Bullets fired to the right may spawn inside walls if emitter position overlaps wall cells (test-wall-collision catches this)
- **Browser close errors**: Wrapped in try-catch to prevent false failures
