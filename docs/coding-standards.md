# Coding Standards

## ⚠️ CRITICAL RULES ⚠️

### Follow Feature Design Process
Before implementing ANY new feature, follow the structured design process in `feature-design-process.md`. Time investment: 1-3 hours saves 10-20 hours of implementation confusion.

### Never Use Git Commands
AI assistants must NEVER run git commands. If code needs reverting, manually undo changes.

### Never Modify Image Assets
Do NOT resize, crop, or modify images unless explicitly requested. Adjust sprite scaling in code instead.

### Ask Before Modifying Non-Code Files
Before running ANY command that modifies files outside `src/`, explain what you want to do and wait for approval.

### Build After Every Change
```bash
npm run build                # MUST pass with zero errors
```

**Only run linter when explicitly asked or before committing code.**

### Clarify Before Implementing
If there is ANY ambiguity, multiple valid approaches, or design decisions needed - STOP and ask before writing code.

### Use Depth Constants
Always use constants from `src/constants/DepthConstants.ts` - never hardcode depth values. Keep granularity low (Depth.enemy not Depth.skeleton).

## Complexity and Nesting (Top Linter Violations)

### Keep Methods Short (complexity ≤ 15)
Methods must not exceed cyclomatic complexity of 15. If a method has many branches:
- **Extract helper methods** — each `if/else` branch with logic becomes its own method
- **Use lookup tables** — replace chains of `if/else if` with a `Record<string, handler>`
- **Use early returns** — flatten logic by returning early for edge cases
- **Split state handlers** — large `update()` methods should delegate to per-state methods

### Keep Nesting Shallow (max-depth ≤ 4)
Never nest more than 4 levels deep. Techniques:
- **Early return / continue** — invert conditions and bail out early
- **Extract inner logic** — nested blocks become named helper methods
- **Avoid nesting inside callbacks** — extract the callback body to a method

```typescript
// ❌ BAD — 5 levels deep
update(delta: number): void {
  if (this.isActive) {
    for (const entity of entities) {
      if (entity.has(HealthComponent)) {
        if (entity.get(HealthComponent)!.current > 0) {
          if (this.isInRange(entity)) {
            this.attack(entity);
          }
        }
      }
    }
  }
}

// ✅ GOOD — max 2 levels
update(delta: number): void {
  if (!this.isActive) return;
  for (const entity of entities) {
    this.tryAttack(entity);
  }
}

private tryAttack(entity: Entity): void {
  const health = entity.get(HealthComponent);
  if (!health || health.current <= 0) return;
  if (!this.isInRange(entity)) return;
  this.attack(entity);
}
```

### Use Nullish Coalescing and Optional Chaining
- Use `??` instead of `||` for default values (preserves `0`, `""`, `false`)
- Use `?.` instead of `&& obj.prop` chains

```typescript
// ❌ BAD
const speed = config.speed || DEFAULT_SPEED;  // breaks if speed is 0
const name = entity && entity.data && entity.data.name;

// ✅ GOOD
const speed = config.speed ?? DEFAULT_SPEED;
const name = entity?.data?.name;
```

### No Nested Ternaries
Never nest ternary expressions. Use `if/else` or a lookup instead.

```typescript
// ❌ BAD
const label = type === 'skeleton' ? 'S' : type === 'thrower' ? 'T' : 'E';

// ✅ GOOD
const LABEL_MAP: Record<string, string> = { skeleton: 'S', thrower: 'T' };
const label = LABEL_MAP[type] ?? 'E';
```

### No Negated Conditions with Else
If you have `if (!condition) { A } else { B }`, flip it to `if (condition) { B } else { A }`.

## Code Style

### No Redundant Comments
Comments should only explain WHY, not WHAT. Code should be self-documenting.

### Limit Function Parameters
Functions with >7 parameters must use props objects with interfaces.

### No Magic Numbers
ALL numbers must be named constants with units in the name (`_MS`, `_PX`, `_PERCENT`, etc.). If you type a number, ask: "What does this represent?" If it has meaning, it needs a name.

### Boolean Naming
Always prefix with `is`, `has`, `should`, `will`, or `can`.

### Include Units in Variable Names
MANDATORY for all time, distance, speed, angle values. Examples: `durationMs`, `speedPxPerSec`, `offsetXPx`, `angleRad`.

### Derive Values from Base Constants
Calculate dependent values instead of hardcoding. Single source of truth.

### Modern JavaScript
- Use `Math.hypot()` for distance
- Use `Number.parseInt()` not `parseInt()`
- No trailing decimals (`1` not `1.0`)
- Avoid negated conditions with else
- No duplicate conditional branches
- No lonely if statements
- Handle async functions properly (await or void)
- Use for-of for iterables

## TypeScript Standards

### No Non-Null Assertions
Use `entity.require()` for mandatory components, `entity.get()` + null check for optional.

### Use Type Aliases
Always use `type` instead of `interface`.

### Imports
Use relative paths and `import type` for type-only imports.

### Readonly Properties
Mark properties readonly if never reassigned.

### No Useless Constructors
Don't create constructors that only call super().

### Use Class Fields
Declare properties as fields when they don't depend on constructor parameters.

### No Unnecessary Type Assertions
Only use when TypeScript cannot infer correctly.

### No Duplicate Imports
Combine imports from same module.

### No Unused Assignments
Don't assign values that are immediately overwritten.

### No Unnecessary Fallbacks in Spread
Spreading `undefined` or `null` is safe - no need for `|| {}`.

## Component Design

### Props-Based Configuration
ALL components use props objects. NO defaults in constructors. All props required (except callbacks).

### Single Responsibility
Each component does ONE thing.

### Decoupling Through Callbacks
Make components reusable by accepting callbacks instead of hardcoding behavior.

### Minimal Dependencies
Only depend on what you need.

## Entity Design

### One Component Type Per Entity
Runtime enforced. Design components to handle multiple instances internally if needed.

### Class-Based Update Order
Use component classes, not instances.

## Common Patterns

### Configuration Constants
Define all config values as constants at top of file.

### Private Helper Methods
Break complex methods into focused functions with clear names.

### Shared UI Patterns
Use base class methods for consistent UI (e.g., `createBackButton()`).

### Components with init()
Some components need `init()` after `add()` because they need `this.entity` reference.

### Avoiding Duplicate Configuration
Single source of truth - components should reference owner's values, not duplicate them.

### Reversible State Modifications (Stack Pattern)
When multiple systems need to modify the same property (offsets, speeds, tints), use a push/pop stack instead of saving/restoring original values. Stacks compose cleanly and prevent bugs when modifications overlap. See `ShadowComponent.pushOffset()`/`popOffset()` and `GridPositionComponent.pushCollisionBox()`/`popCollisionBox()` for reference implementations.

## ESLint Rules
Key enforced rules: no-unused-vars, no-explicit-any, prefer-readonly, no-empty-function, consistent-type-definitions, no-useless-fallback-in-spread, prefer-class-fields, no-nested-ternary, complexity, max-depth, no-non-null-assertion, prefer-nullish-coalescing, prefer-optional-chain, no-negated-condition, no-zero-fractions.
