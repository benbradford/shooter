every entity has an id, created automatically: name+number. must be unique
change entity to have an optional eventName, if this is set, then only spawn when that event is fired, otherwise spawn from the start. we need a new spawn manager. if eventName is specified, then register event and creator function with spawn manager. the creation is delayed until the event is fired. The spawnManager listens for spawnEvents and then calls the appropriate delayed spawn function for that entity.
change spawners to fire events, not spawn enemies. then the enemies can listen for those events. this simplifies the logic as right now there are 2 ways to spawn throwers, from level load, or from a spawner. when a spawner is loaded from a level, all it has to do is raise an event.
change the layout of the level.json files. All entities must be under and entity section and each has an id, so it looks like this:

entities: {
    [
        {
            id: skeleton0
            type: skeleton,
            data: {
                ... data related to the player
            },
        }, {
            id: skeleton1,
            type: skeleton,
            eventName: sk1:,
            data: {
                "col": 32,
                "row": 16,
                "difficulty": "easy"

            }
        }, {
            id: thrower1,
            type: thrower,
            data: { ...}
        }, {
            id: spawner1,
            type: spawner,
            eventName: sp1,
            data: {
                eventsToRaise: [
                    sk1
                ],
                spawnDelayMs: 0
            }
        }, {
            id: trigger1,
            type: trigger,
            data: {
                "eventName": "trigger_g",
                "triggerCells": [
                {
                    "col": 28,
                    "row": 21
                },
                {
                    "col": 29,
                    "row": 21
                },
            ],
            "oneShot": true
            }
        }
    ]
},
exits: { .. as before },
cells: { .. as before },
levelTheme: { .. as before },
background: { .. as before },
  "width": 40,
  "height": 30,
  "playerStart": {
    // as before
  }

entity loading logic is now like:

for e in entities {
    id = e.id
    type = e.type
    eventToListenFor = e.type
    
    if (eventToListenFor) {

    } else {

    }
}