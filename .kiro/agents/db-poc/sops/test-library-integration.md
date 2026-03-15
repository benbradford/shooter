# SOP: Test Library Integration

## Purpose

Validate that a new library can integrate with the existing codebase before committing to it in the design.

## When to Use

- Adding a new npm package
- Using a browser API for the first time
- Integrating with external service
- Uncertain about compatibility

## Process

### 1. Install the Library

```bash
npm install {library-name}
npm run build  # Verify it compiles
```

### 2. Create Test File

```typescript
// src/poc/{feature}/test-{library}.ts
import { LibraryClass } from '{library-name}';

export async function testBasicUsage(): Promise<void> {
  console.log('[POC] Testing basic usage...');
  
  try {
    const instance = new LibraryClass();
    // Test basic functionality
    console.log('✅ Basic usage works');
  } catch (e) {
    console.log('❌ Basic usage failed:', e);
  }
}
```

### 3. Test Integration Points

Test how the library works with existing code:

```typescript
export async function testWithPhaser(scene: Phaser.Scene): Promise<void> {
  console.log('[POC] Testing Phaser integration...');
  
  // Test if library works with Phaser objects
  // Test if library works in game loop
  // Test if library works with ECS
}
```

### 4. Measure Bundle Size

```bash
npm run build
ls -lh dist/assets/*.js  # Check bundle size
```

Document the size increase.

### 5. Document Results

Create `features/{feature}/poc-results.md`:

```markdown
## Library Integration: {library-name}

### Question
Can {library} integrate with our Phaser/ECS architecture?

### Test Code
\`\`\`typescript
// Minimal example
\`\`\`

### Results
- ✅ Basic usage works
- ✅ Phaser integration works
- ❌ ECS integration has issues

### Bundle Size
+XXkb (from Ykb to Zkb)

### Recommendation
PROCEED / REVISE / ABANDON
```

## Success Criteria

- ✅ Library installs without conflicts
- ✅ Compiles with TypeScript
- ✅ Works in browser
- ✅ Integrates with Phaser
- ✅ Bundle size acceptable
- ✅ No performance issues

## Common Issues

### TypeScript Errors
- Check if library has type definitions
- May need `@types/{library}` package
- May need to add to `tsconfig.json` compilerOptions

### Bundle Size Too Large
- Check if library has smaller alternatives
- Check if tree-shaking works
- Consider dynamic imports

### Browser Compatibility
- Test in Chrome, Firefox, Safari
- Check for WebAssembly requirements
- Check for Node.js-only APIs
