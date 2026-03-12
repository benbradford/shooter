# SOP: Handle Build Failures

## Purpose

Self-correct build failures automatically (max 3 attempts) before asking user for help.

## Steps

### 1. Run Build

```bash
npm run build
```

### 2. Analyze Error

**If build fails, extract:**
- Error type (TypeScript error, missing import, etc.)
- File and line number
- Error message

### 3. Identify Root Cause

**Common errors:**

**Missing import:**
```
Error: Cannot find name 'NPCComponent'
→ Add: import { NPCComponent } from './NPCComponent';
```

**Type mismatch:**
```
Error: Type 'string' is not assignable to type 'Direction'
→ Check design.md for correct type
→ Fix type annotation
```

**Missing file:**
```
Error: Cannot find module './NPCEntity'
→ Create stub or check if task dependency not met
```

**Circular dependency:**
```
Error: Circular dependency detected
→ Refactor imports
→ Use type-only imports where possible
```

### 4. Apply Fix

**Action:** Make minimal change to fix error

**Rules:**
- Fix only the specific error
- Don't refactor unrelated code
- Follow existing patterns
- Minimal changes

### 5. Retry Build

```bash
npm run build
```

**If passes:** Continue to lint
**If fails:** Increment attempt counter, go to step 2
**If 3 attempts exhausted:** Report to user

### 6. Report to User (After 3 Attempts)

**Format:**
```
❌ Build failed after 3 attempts

Last error:
{error message}

Attempted fixes:
1. {fix1}
2. {fix2}
3. {fix3}

Need guidance on how to proceed.
```

## Success Criteria

- ✅ Build passes (0 errors)
- ✅ Fixed within 3 attempts
- ✅ Minimal changes made
- ✅ Follows existing patterns

## Common Patterns

**Add missing import:**
```typescript
import { X } from './path/to/X';
```

**Fix type annotation:**
```typescript
// Wrong: direction: string
// Right: direction: Direction
```

**Create stub for missing dependency:**
```typescript
export function createNPCEntity(props: any): Entity {
  return new Entity('npc');
}
```

**Use type-only import:**
```typescript
import type { SomeType } from './module';
```
