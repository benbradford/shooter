Right now, when entering a level, it loads everything in again from scratch. Even if i kill all enemies in a level, if i leave and then re-enter, the enemies will come back. This is not the behaviour I want, therefore I want to introduce the concept of world_state, that tracks the actions I have taken such that state is maintained in a level. It also resets the player's health, regardless of what it was when exiting a level.

this world_state should look something like this:


    {
       "player": {
           "health": 75,
           "currentLevel": "dungeon1",
           "entryCell": { row: 3, col: 5},
           .. other state later once we have added it, such as numCoins, powerUps
       }

        "levels": [
            {
            "dungeon1": {
                destroyedEntities: [
                    "trigger1",
                    "skeleton0",
                    "bug_base0",
                    "cellModifier1",
                    "eventChainer1",
                ],
                ... anything else?

            }, "grassoverworld1": {
               ... etc.
            }
        }
    ]

    The real challenge here now is then not spawning those entities when the level loads. Also, if any eventChainers have been applied, then the effect of the eventChain must still be in effect, the same as the cellModifiers. A further challenge is that if, for example, I triggered a load of skeletons to appear and kill 1 of them and then leave, when I re-enter, then I want to still see the spawned skeletons that I didn't kill, but not the one that I did. They can still reset their position in the level to where they were spawned, but they must still exist, whilst the one I destroyed must not exist.

world_state should also be a 'saveable' object that exists between gaming sessions. Whilst this is hard to do with a web-based game, I intend in the future to actually just deploy this to android/ios. So we can overcome this issue for local testing by allowing the specification of a world_state.json file which the game loads in on startup to load the game in a specific state. We shoud also introduce the option of being able to log out the world state to the user's clipboard (similar to when we click log in level) by pressing a button - there is no good button left for this that isn't already in use, so let;'s use 'y' for this. Later on we will create a proper save system when we deploy to android/ios.
