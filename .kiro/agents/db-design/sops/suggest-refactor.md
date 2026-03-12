# SOP: Suggest Refactor

## Purpose

Identify when a feature needs architectural changes instead of being hacked in, and propose refactor approach with trade-offs.

## Prerequisites

- Feature requirements understood
- Current architecture understood
- Attempted to fit feature into existing patterns

## Steps

### 1. Assess Architectural Fit

**Action:** Check if feature fits cleanly into current architecture

**Questions:**
- Does this fit the ECS component model?
- Can existing components be reused?
- Does it require global state?
- Does it create tight coupling?
- Does it duplicate existing logic?

**Red flags indicating poor fit:**
- Needs data in multiple unrelated components
- Requires components to know about each other
- Needs global state beyond existing singletons
- Duplicates logic that should be shared
- Creates circular dependencies
- Violates single responsibility principle

**Verification:** Identified specific architectural mismatches

---

### 2. Identify Code Smells if Hacked In

**Action:** Document what would be wrong with hack approach

**Common smells:**
- **Shotgun surgery** - One change requires touching many files
- **Feature envy** - Component needs data from another component
- **God object** - One component does too much
- **Duplicate code** - Same logic in multiple places
- **Magic numbers** - Hardcoded values scattered around
- **Tight coupling** - Components can't work independently

**Example:**
```
If we hack shields in:
- Add `hasShield` boolean to HealthComponent (violates SRP)
- Add shield logic to DamageComponent (getting bloated)
- Add shield rendering to SpriteComponent (wrong place)
- Duplicate shield check in 3 places (DRY violation)
```

**Verification:** Documented 3+ code smells that would result

---

### 3. Propose Refactor Approach

**Action:** Design clean solution that fits architecture

**Approach:**
1. Identify what needs to change
2. Propose new components/systems
3. Show how existing code would be refactored
4. Explain how feature fits cleanly after refactor

**Example:**
```
Refactor approach for shields:
1. Create ShieldComponent (health, recharge rate, visual)
2. Refactor DamageComponent:
   - Extract damage calculation to helper
   - Add shield check before applying damage
3. Create ShieldVisualsComponent for rendering
4. Shields become reusable for player, enemies, objects

After refactor:
- Adding shield to any entity: Just add ShieldComponent
- Different shield types: Pass different props
- No duplicate logic
- Follows ECS patterns
```

**Verification:** Refactor approach is clear and concrete

---

### 4. Estimate Costs

**Action:** Compare refactor vs hack time investment

**Estimate:**
- **Hack time:** How long to implement poorly
- **Refactor time:** How long to do it right
- **Future cost:** Technical debt from hack
- **Future benefit:** What refactor enables

**Example:**
```
Shield system:
- Hack: 2 hours (add booleans, if statements)
- Refactor: 4 hours (ShieldComponent, DamageComponent refactor)
- Future cost of hack: 
  - 1 hour per new shield type (duplicate logic)
  - Hard to add shield variations
  - Difficult to add shields to other entities
- Future benefit of refactor:
  - 15 minutes per new shield type (just props)
  - Easy shield variations (different health, recharge)
  - Shields work for any entity
  - Enables armor/protection systems
```

**Verification:** Time estimates for both approaches

---

### 5. Make Recommendation

**Action:** Recommend refactor or hack with reasoning

**Decision criteria:**
- **Recommend refactor if:**
  - Feature will be extended in future
  - Hack creates significant technical debt
  - Refactor time is <2x hack time
  - Refactor enables other features
  - Code quality is important

- **Accept hack if:**
  - One-off feature, won't be extended
  - Refactor time is >3x hack time
  - Feature is experimental
  - User explicitly wants quick solution

**Presentation:**
```markdown
## Recommendation: Refactor

**Reasoning:**
1. Shields will likely be extended (different types, recharge mechanics)
2. Hack creates tight coupling and duplicate logic
3. Refactor is only 2x hack time
4. Refactor enables future armor/protection systems
5. Follows ECS principles

**Trade-off:**
- Refactor: 4 hours, clean code, extensible
- Hack: 2 hours, technical debt, hard to extend

**Recommendation:** Refactor. The 2-hour investment pays off quickly.
```

**Verification:** Clear recommendation with reasoning

---

## Final Verification

- [ ] Architectural fit assessed
- [ ] Code smells identified (if hack)
- [ ] Refactor approach proposed
- [ ] Time estimates for both approaches
- [ ] Clear recommendation with reasoning
- [ ] User understands trade-offs

## Output Format

```markdown
# {Feature} - Refactor Analysis

## Architectural Fit
Current architecture: {description}
Feature fit: {good/poor/requires changes}

## Code Smells if Hacked In
1. Smell 1: Description
2. Smell 2: Description

## Proposed Refactor
1. Change 1
2. Change 2
Result: {how feature fits cleanly}

## Cost Comparison
| Approach | Time | Quality | Extensibility | Technical Debt |
|----------|------|---------|---------------|----------------|
| Hack     | 2h   | Low     | Hard          | High           |
| Refactor | 4h   | High    | Easy          | None           |

## Recommendation
{Refactor/Hack} because {reasoning}
```

## Common Issues

**Being too accommodating:**
- Symptom: Accepting hacks to please user
- Solution: Be honest about technical debt, recommend refactor

**Overengineering:**
- Symptom: Suggesting massive refactors for simple features
- Solution: Balance - only refactor what's needed

**Unclear trade-offs:**
- Symptom: User can't decide
- Solution: Be specific about time and quality differences

**Missing future implications:**
- Symptom: Hack seems fine now, causes problems later
- Solution: Think about feature extensions and related features
