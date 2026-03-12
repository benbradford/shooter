# db-implementor Agent - Design

## Architecture

```
User Request
  ↓
db-implementor Agent
  ↓
Task Reader → Design Reader → Pattern Search
  ↓
Code Implementation
  ↓
Pattern Enforcement Checks
  ↓
Build + Lint (with self-correction)
  ↓
Test Generator (template selection)
  ↓
Test Level Generator
  ↓
Browser Automation (Puppeteer)
  ↓
Screenshot + Visual Verification
  ↓
Regression Suite Update
  ↓
Task Completion Marking
  ↓
Report Generation
```

## Core Components

### 1. Task Reader
Parses tasks.md and extracts task by ID.

### 2. Test Template Library
Six templates covering common patterns:
- Component existence
- Range detection
- Animation playback
- UI state change
- Manager query
- Entity spawning

### 3. Pattern Enforcement
Five automated checks:
- Props pattern
- Magic numbers
- Update order
- Readonly properties
- Pattern consistency

### 4. Browser Automation
- Start dev server
- Run Puppeteer test
- Capture screenshot
- Stop server

### 5. Regression Suite Manager
- Aggregate tests per feature
- Track deferred tests
- Re-run after dependencies complete

## Implementation Flow

### Single Task Execution

```
1. Read task from tasks.md
2. Read design.md context
3. Search for similar patterns
4. Implement code (minimal)
5. Run pattern checks
6. Build + lint (self-correct if needed)
7. Select test template
8. Generate test file
9. Generate test level
10. Start dev server
11. Run test
12. Take screenshot
13. Stop server
14. Add to regression suite
15. Mark task complete
16. Generate report
```

### Dependency Handling

```
If task has dependencies:
  Check if dependencies complete
  If not: Report error, suggest order
  If yes: Proceed

If test fails due to missing dependency:
  Mark test as "deferred"
  Track for re-run
  Continue with task completion
  
After phase complete:
  Re-run all deferred tests
  Report integration results
```

### Self-Correction

```
Build fails:
  Analyze error message
  Identify root cause
  Apply fix
  Retry (max 3 attempts)
  If still fails: Report to user

Lint fails:
  Run eslint --fix
  If still fails: Analyze violations
  Apply manual fixes
  Retry
  If still fails: Report to user

Pattern violations:
  Report violations
  Suggest fixes
  Apply fixes automatically
  Re-check
```

## Test Generation System

### Template Selection Logic

```javascript
function selectTemplate(taskName) {
  if (/Create \w+Component/.test(taskName)) {
    return 'component-existence';
  }
  if (/Add \w+ detection/.test(taskName)) {
    return 'range-detection';
  }
  if (/Update \w+Component/.test(taskName)) {
    return 'ui-state-change';
  }
  if (/Create \w+Manager/.test(taskName)) {
    return 'manager-query';
  }
  if (/Add \w+ animation/.test(taskName)) {
    return 'animation-playback';
  }
  return 'generic';
}
```

### Test Level Generation

```javascript
function generateTestLevel(task, feature) {
  return {
    width: 20,
    height: 20,
    playerStart: { x: 5, y: 5 },
    entities: determineNeededEntities(task),
    cells: []
  };
}
```

## Pattern Enforcement Implementation

### Props Pattern Check

```javascript
function checkPropsPattern(filePath) {
  const ast = parseTypeScript(filePath);
  const components = findComponents(ast);
  
  for (const component of components) {
    if (!hasPropsInterface(component)) {
      violations.push({ type: 'missing-props-interface', line });
    }
    if (hasDefaultValues(component.constructor)) {
      violations.push({ type: 'default-values', line });
    }
  }
  
  return violations;
}
```

### Magic Number Detection

```javascript
function checkMagicNumbers(filePath) {
  const lines = readLines(filePath);
  const violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const ')) continue;
    
    const numbers = lines[i].match(/\b\d+(\.\d+)?\b/g);
    if (numbers) {
      violations.push({ line: i + 1, numbers });
    }
  }
  
  return violations;
}
```

## Browser Automation

### Dev Server Management

```javascript
async function startDevServer() {
  const proc = spawn('npm', ['run', 'dev']);
  await waitForPort(5173, 10000);
  return proc.pid;
}

async function stopDevServer(pid) {
  process.kill(pid);
}
```

### Test Execution

```javascript
async function runTest(testFile, screenshotPath) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(() => runTestInBrowser());
  await page.screenshot({ path: screenshotPath });
  
  await browser.close();
  return result;
}
```

## Regression Suite Management

### Suite File Structure

```javascript
// test/regression/test-{feature}-regression.js
import { test1 } from '../tests/{feature}/test-1.js';
import { test2 } from '../tests/{feature}/test-2.js';

runTests({
  level: 'test/test-{feature}-complete',
  commands: ['test/interactions/player.js'],
  tests: [test1, test2],
  screenshotPath: 'test/screenshots/{feature}-regression.png'
});
```

### Aggregation Logic

```javascript
function addToRegressionSuite(feature, testFile) {
  const suitePath = `test/regression/test-${feature}-regression.js`;
  
  if (!exists(suitePath)) {
    createRegressionSuite(feature);
  }
  
  addImport(suitePath, testFile);
  addToTestsArray(suitePath, testFile);
}
```

## Reporting System

### Report Format

```markdown
✅ Task {X.Y}: {Name}

**Files Created:**
- {list}

**Files Modified:**
- {list}

**Pattern Enforcement:**
✅ Props pattern
✅ No magic numbers
✅ Update order correct

**Build & Lint:**
✅ Build: 0 errors
✅ Lint: 0 warnings

**Testing:**
✅ Generated: {test file}
✅ Level: {test level}
✅ Test: {X}/{X} passed
📸 Screenshot: {path}

**Visual Verification:**
✅ {check 1}
✅ {check 2}

**Regression:**
✅ Added to {suite file}

**Time:** {X} minutes
**Next:** Task {X+1} ready
```

## Key Design Decisions

1. **Template-based testing** - Covers 80% of cases, custom for rest
2. **Deferred testing** - Tests generated even if can't pass yet
3. **Stub generation** - Early tasks get stubs to unblock build
4. **Singleton pattern** - NPCManager, pattern checkers
5. **Self-correction** - Max 3 attempts before asking user
6. **Minimal test levels** - 20x20 grid, only needed entities
7. **Headless browser** - Faster test execution
8. **Per-feature regression** - One suite file per feature
9. **Integration testing** - Re-run deferred after phase complete
10. **Automated marking** - tasks.md updated automatically

## Performance Considerations

- Pattern checks: ~100ms per file (AST parsing)
- Test generation: ~50ms per test (template filling)
- Browser automation: ~5-10 seconds per test
- Screenshot: ~500ms per capture

**Total overhead per task: ~10-15 seconds**

## Success Metrics

After implementing one feature:
- 100% test coverage
- 0 pattern violations
- Complete regression suite
- All screenshots captured
- 5-11 hours saved vs manual testing
