# SOP: Create POC Integration Tests

## Purpose

Create browser-based integration tests for POC validation to capture warnings, errors, and runtime behavior.

## When to Use

- Testing browser APIs
- Testing library integration with Phaser
- Testing performance under load
- Testing async behavior
- Any POC that needs to run in the game

## Process

### 1. Create Test File

```javascript
// test/tests/poc/test-{feature}.js
import { test, runTests } from '../../test-framework.js';

const tests = [
  test('Question 1: Can library do X?', async () => {
    const warnings = [];
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning') warnings.push(msg.text());
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    const result = await page.evaluate(() => {
      // Your test code here
      try {
        // Test the functionality
        return true; // Success
      } catch (e) {
        console.error('[POC]', e);
        return false; // Failure
      }
    });
    
    if (warnings.length > 0) {
      console.log('⚠️ Warnings:', warnings);
    }
    
    if (errors.length > 0) {
      console.log('❌ Errors:', errors);
    }
    
    return result && errors.length === 0;
  })
];

runTests('poc-{feature}', 'test_empty', [], tests);
```

### 2. Run Tests

```bash
npm run test:single test-{feature}
```

### 3. Document Results

In `features/{feature}/poc-results.md`:

```markdown
### Test: Can library do X?

**Test code:**
\`\`\`javascript
// Minimal test example
\`\`\`

**Results:**
- ✅ Test passed
- ⚠️ 2 warnings detected:
  - "Deprecated API usage"
  - "Performance concern"
- ❌ 0 errors

**Conclusion:**
Works but has warnings about deprecated API
```

## Benefits

- **Automatic warning capture** - Don't miss console warnings
- **Repeatable** - Run test multiple times during POC iteration
- **Evidence-based** - Concrete pass/fail, not manual observation
- **Promotable** - Can keep test if feature proceeds

## Test Structure

### Minimal Test
Tests one specific question:
```javascript
test('Can Lua call JS functions?', async () => {
  return await page.evaluate(() => {
    // Single focused test
  });
});
```

### Integration Test
Tests interaction with existing systems:
```javascript
test('Can library work with Phaser?', async () => {
  return await page.evaluate(() => {
    const scene = game.scene.getScene('game');
    // Test with actual game scene
  });
});
```

### Performance Test
Tests under load:
```javascript
test('Can handle 100 instances?', async () => {
  return await page.evaluate(() => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      // Create instances
    }
    const duration = performance.now() - start;
    console.log(`Created 100 instances in ${duration}ms`);
    return duration < 1000; // Must be under 1 second
  });
});
```

## Common Patterns

### Capture All Console Output
```javascript
const logs = [];
page.on('console', msg => logs.push(msg.text()));

// After test
logs.forEach(log => {
  if (log.includes('[POC]')) console.log(log);
});
```

### Test Async Behavior
```javascript
test('Async operations work', async () => {
  return await page.evaluate(async () => {
    const result = await someAsyncFunction();
    return result === expected;
  });
});
```

### Test Error Handling
```javascript
test('Handles errors gracefully', async () => {
  return await page.evaluate(() => {
    try {
      // Trigger error condition
      return false; // Should not reach here
    } catch (e) {
      return true; // Error caught correctly
    }
  });
});
```

## Success Criteria

- ✅ Tests run in actual browser
- ✅ Warnings/errors captured
- ✅ Pass/fail is clear
- ✅ Results documented in poc-results.md
- ✅ Tests can be promoted to permanent suite

## When NOT to Create Tests

- Simple Node.js scripts (just run with `node`)
- CLI tools (just run directly)
- Pure TypeScript compilation checks (just run `npm run build`)

Focus tests on browser-based runtime behavior.
