# Global Flags System

## Overview

Global flags allow storing arbitrary key-value pairs that persist across level transitions and game sessions (when saved with Y key).

## Usage

### In Lua Scripts

```lua
-- Set flags (accepts strings or numbers, stored as strings)
setFlag("myFlag", "on")
setFlag("treasureCollected", 12)
setFlag("hasDefeatedDungeon1", "false")

-- Check flag conditions
local cond1 = isFlagCondition("levelsVisited", "gte", 6)
local cond2 = isFlagCondition("myFlag", "eq", "on")
local cond3 = isFlagCondition("treasureCollected", "gt", 10)

if cond1 and cond2 then
  say("NPC", "Welcome back, hero!", 50, 2000)
end
```

## API

### setFlag(name, value)
- **name**: String - flag name
- **value**: String or number - flag value (numbers converted to strings)
- Sets a new flag or updates an existing one

### isFlagCondition(name, condition, value)
- **name**: String - flag name
- **condition**: String - comparison operator
  - `"eq"` - equals
  - `"neq"` - not equals
  - `"gt"` - greater than (numeric only)
  - `"lt"` - less than (numeric only)
  - `"gte"` - greater than or equal (numeric only)
  - `"lte"` - less than or equal (numeric only)
- **value**: String or number - value to compare against
- **Returns**: Boolean
  - `false` if flag doesn't exist
  - `false` if using gt/lt/gte/lte with non-numeric values (logs error)
  - Comparison result otherwise

## Implementation Details

### Storage
- Flags stored in `WorldState.flags` as `{ [key: string]: string }`
- All values stored as strings
- Numeric comparisons parse strings as numbers on-demand

### Type Handling
- Numbers automatically converted to strings when setting
- Numeric comparisons attempt to parse both values as numbers
- If parsing fails for gt/lt/gte/lte, returns false and logs error
- String comparisons (eq/neq) always work

### Persistence
- Flags persist across level transitions (in memory)
- Flags persist across game sessions when saved (Y key → `public/states/default.json`)
- Flags reset on new game start (same as other world state)

## Examples

```lua
-- Track quest progress
setFlag("questStage", 1)
if isFlagCondition("questStage", "eq", 1) then
  say("NPC", "You need to find the key!", 50, 2000)
  setFlag("questStage", 2)
end

-- Track numeric values
setFlag("enemiesDefeated", 0)
-- ... later
local count = isFlagCondition("enemiesDefeated", "gte", 0) -- Always true if set
setFlag("enemiesDefeated", 5)

-- Boolean flags (use strings)
setFlag("hasKey", "true")
if isFlagCondition("hasKey", "eq", "true") then
  -- Unlock door
end
```

## Error Cases

```lua
-- Non-existent flag
isFlagCondition("nonExistent", "eq", "value")  -- Returns false (no error)

-- Invalid comparison
setFlag("name", "Alice")
isFlagCondition("name", "gt", "Bob")  -- Returns false, logs error

-- Invalid condition
isFlagCondition("flag", "invalid", "value")  -- Returns false, logs error
```
