# Debugging Guide

## Core Principle

**Every warning is a problem.** Either:
1. Real issue that needs fixing
2. Incorrect warning logic that should be removed

Never dismiss warnings as "harmless."

## Debugging Workflow

### 1. Reproduce with Integration Tests

**Before fixing anything:**
```bash
# Check if test exists
ls test/tests/{feature}/

# Run test to reproduce
npm run test:single test-{feature}

# If no test exists, create one
```

**Why:** Tests provide concrete, repeatable reproduction. No guessing.

### 2. Add Instrumentation

**Tag all logs for filtering:**
```typescript
console.log('[DBGAME] Your message here');
console.warn('[DBGAME] Warning message');
console.error('[DBGAME] Error message');
```

**On Android:**
```bash
adb logcat | grep DBGAME
```

**In browser:**
```
Filter console by "DBGAME"
```

### 3. Capture Console Logs in Tests

```javascript
const logs = [];
page.on('console', msg => {
  logs.push(msg.text());
});

page.on('pageerror', error => {
  console.log('💥 CRASH:', error.message);
});

// After test
logs.forEach(log => {
  if (log.includes('[DBGAME]') || log.includes('WARNING')) {
    console.log(log);
  }
});
```

### 4. Test Round Trips

**Single transitions don't catch all bugs:**
```javascript
// ❌ Insufficient
Level A → Level B

// ✅ Catches more bugs
Level A → Level B → Level A (wait 3 seconds)
```

**Why:** Returning to a level exposes:
- Stale animation frames
- Unreleased references
- State not properly reset

### 5. Check for Warnings

**Create tests that fail on warnings:**
```javascript
const warnings = [];
page.on('console', msg => {
  if (msg.type() === 'warning') {
    warnings.push(msg.text());
  }
});

// After test
if (warnings.length > 0) {
  console.log('❌ Warnings detected:', warnings.length);
  warnings.forEach(w => console.log(w));
  return false;
}
```

### 6. Verify Entity Persistence

**Test that entities survive round trips:**
```javascript
const initialCount = gameScene.entityManager.getByType('skeleton').length;
// Transition away and back
const finalCount = gameScene.entityManager.getByType('skeleton').length;
return initialCount === finalCount;
```

## Common Pitfalls

### ❌ "The warnings are harmless"
Never dismiss warnings. Investigate and fix or remove the warning logic.

### ❌ Testing only single transitions
Always test round trips (A → B → A).

### ❌ Not capturing console logs in tests
Tests should capture and check console output.

### ❌ Ignoring timing issues
If something works in tests but fails manually, it's a timing issue.

### ❌ Assuming Phaser events fire
Phaser scene lifecycle events (shutdown, stop) are unreliable. Don't depend on them.

## Debugging Checklist

When fixing a bug:
- [ ] Created integration test that reproduces the bug
- [ ] Added instrumentation with [DBGAME] tags
- [ ] Captured console logs in test
- [ ] Tested round trips (not just single transitions)
- [ ] Verified no warnings appear
- [ ] Checked entity persistence
- [ ] Waited 3+ seconds after transition (catches delayed crashes)
- [ ] Tested on both desktop and Android

## Tools

### Debug Utilities
`src/debug/PhaserDebug.ts` contains:
- `installTextureDebug()` - Log texture removals
- `logSceneState()` - Show scene state
- `checkAnimationFrames()` - Find animations using a texture
- `installDestroyDebug()` - Detect double-destroy bugs

### Test Helpers
`test/interactions/player.js` contains:
- Movement helpers
- Combat helpers
- State management helpers

### Memory Monitoring
`MemoryMonitor.checkForLeaks()` - Checks for unreleased texture references

## Key Lessons from Level Loading

1. **Camera fade callbacks can fail** - Use timeouts instead
2. **Phaser shutdown events don't fire reliably** - Destroy entities manually
3. **Animations persist globally** - Keep enemy textures loaded
4. **Tests must do round trips** - Single transitions miss bugs
5. **Every warning matters** - Investigate, don't dismiss

## When Tests Pass But Manual Testing Fails

This indicates:
- Timing difference (tests are faster/slower)
- Test environment difference (headless vs GUI)
- Test doesn't cover the scenario

**Solution:** Add the failing scenario to tests, don't just fix manually.
