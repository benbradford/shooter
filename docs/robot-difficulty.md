# Robot Difficulty System

## Overview

Robots use difficulty presets that control all their properties. Simply set `difficulty` to "easy", "medium", or "hard" in the level.json.

## Difficulty Presets

### Easy
- Health: 40
- Speed: 90
- Fireball Delay Time: 1500ms
- Fireball Speed: 250
- Fireball Duration: 1500ms

### Medium
- Health: 80
- Speed: 120
- Fireball Delay Time: 1200ms
- Fireball Speed: 300
- Fireball Duration: 2000ms

### Hard
- Health: 100
- Speed: 140
- Fireball Delay Time: 800ms
- Fireball Speed: 350
- Fireball Duration: 2500ms

## Usage in level.json

```json
{
  "robots": [
    {
      "col": 4,
      "row": 12,
      "difficulty": "easy",
      "waypoints": [
        { "col": 2, "row": 12 },
        { "col": 6, "row": 12 }
      ]
    },
    {
      "col": 8,
      "row": 10,
      "difficulty": "hard",
      "waypoints": [
        { "col": 6, "row": 10 },
        { "col": 10, "row": 10 }
      ]
    }
  ]
}
```

That's it! The difficulty setting controls:
- Health
- Movement speed
- Fireball delay time (how long before firing)
- Fireball speed
- Fireball duration

## Editor Support

When adding robots in the editor, they default to "medium" difficulty. After saving, you can edit the level.json to change the difficulty to "easy" or "hard".

## Implementation Details

- **File:** `src/robot/RobotDifficulty.ts` - Defines all presets
- **Component:** `RobotDifficultyComponent` - Stores difficulty on each robot entity
- **Automatic:** All robot properties are automatically set based on difficulty when loading levels
