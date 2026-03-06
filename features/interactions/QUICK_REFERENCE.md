# Interaction System - Quick Reference

## Creating an Interaction

### 1. Create Lua Script
**File**: `public/interactions/my_interaction.lua`

```lua
-- Set colors
speech.backgroundColor("purple")
speech.textColor("gold")

-- Show speech
say("Akari", "Hello <red>world</red>!<newline/>Second line.", 50, 3000)

-- Move player
player.moveTo(10, 5, 200)
player.look("down_left")

-- Wait
wait(1000)

-- Coins
if coins.get() >= 50 then
  coins.spend(50)
  say("Akari", "Purchased!", 50, 2000)
else
  say("Akari", "Need <red>50 coins</red>!", 50, 2000)
end
```

### 2. Add to Level JSON
```json
{
  "entities": [
    {
      "id": "interaction0",
      "type": "interaction",
      "createOnAnyEvent": ["my_event"],
      "data": {
        "filename": "my_interaction"
      }
    }
  ]
}
```

### 3. Trigger Event
Use a trigger entity or raise event from code:
```typescript
eventManager.raiseEvent("my_event");
```

---

## API Reference

### Commands (Sequential Execution)

```lua
wait(ms)                              -- Pause for duration
say(name, text, talkSpeed, timeout)   -- Show speech box
player.moveTo(col, row, speed)        -- Move with pathfinding
player.look(direction)                -- Change facing
speech.backgroundColor(color)         -- Set box color
speech.textColor(color)               -- Set text color
coins.spend(amount)                   -- Remove coins (animated)
coins.obtain(amount)                  -- Add coins (animated)
```

### Properties (Immediate)

```lua
coins.get()  -- Returns current coin count
```

### Directions
`"down"`, `"up"`, `"left"`, `"right"`, `"down_left"`, `"down_right"`, `"up_left"`, `"up_right"`

### Colors
**Box**: `"blue"`, `"black"`, `"purple"`, `"gold"`
**Text**: `"white"`, `"gold"`, `"red"`, `"green"`, `"purple"`, `"blue"`

### Text Tags
- `<red>text</red>` - Red text
- `<green>text</green>` - Green text
- `<purple>text</purple>` - Purple text
- `<gold>text</gold>` - Gold text
- `<newline/>` - Line break

---

## Tips

### Text Wrapping
No automatic wrapping - use `<newline/>` to break lines manually:
```lua
say("Akari", "This is line one.<newline/>This is line two.", 50, 3000)
```

### Skip Behavior
- **First press** (space/touch): Speed up to 10ms per character
- **Second press**: Dismiss immediately
- **After text complete**: Press to dismiss

### Coin Animation
Coins count up/down one-by-one (50ms each). The interaction waits for animation to complete.

### Error Handling
All errors crash the game with console.error(). Check browser console for details.

---

## Troubleshooting

**Interaction doesn't trigger**:
- Check event name matches between trigger and interaction entity
- Check `createOnAnyEvent` array includes the event
- Check console for errors

**Script not found**:
- Check filename in level JSON matches file in `public/interactions/`
- Don't include `.lua` extension in JSON
- Check console for 404 error

**Player doesn't move**:
- Check path exists (no walls blocking)
- Check col/row are valid grid coordinates
- Check console for "No path found" error

**Speech box off-screen**:
- Uses camera dimensions (should work on all monitors)
- Check if camera zoom is 1 (required)

**Colors don't work**:
- Check color names are exact: "red", "green", "purple", "gold"
- Check quotes around color names
- Invalid colors default to white/black

---

## Related Documentation

- `implementation-clarifications.md` - All design decisions
- `interaction-system-requirements.md` - Complete technical spec
- `interaction-system-design.md` - Architecture details
- `docs/feature-design-process.md` - How this was designed
