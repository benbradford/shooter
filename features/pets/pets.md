I want to introduce the concept of pets to the game.

A pet is something that follows around the player. It has a special ability which it can activate by pressing the action icon (Currently this uses slide, I want to re-purpose this action icon for pets). After using a pet ability, there is a cooldown specific to that pet ability before being able to use it again. The player can have several pets, but only 1 can be active at a time. there will be two buttons at the top of the screen that can be used to scroll left or right through available pets. the action icon will then change depending on the selected pet.

Whilst there can only be 1 pet action item on screen at a time, there can be up to 4 pet icons (depending on how many pets have been collected, we store this in world state: rockCollected: true, dogCollected: true etc.) But we hide the ones tht aren't selected by showing them off the hud like this:

2 pets:

             O     |
-------------------|

             O




3 pets:

             O     |
-------------------|
         O       O


4 pets:

             O     |
-------------------|
        O         O
             O


When changing pet selection, the icons will rotate in either a clockwise or anticlockwise manner, so that the selected pet icon appears on screen. When a pet is deselected, he rises quickly up out off the screen whilst the newly selected pet descends down in a quick mannger to the player position, ready to follow.

The following pets will be available:

rock (only 4 directions, 2 anims: breathing-idle and walking),
dog (8 directions, 2 anims we care about for now: breathing-idle and walk),

assets can be found in public/assets/pets

If the player jumps in to water, then any selected pet rises up off the screen and the pet icon is faded out as it cannot be used. For the pet special power (activated whn touching the icon) we can implement this later. For now just output in the colse (rock/dog special power initiated!).

the pets use pathfinder to find the player, when within 30px of the player, the pet will stop and go into an idle pose. the speed of the pets will be the same as the player walk speed. if the pet gets left behind from the player and is > 150 pixels from the player, then fade out the pet icon and prevent them from being able to use their special power.

Pets will exist somewhere in the world and the player has to find them in orde to use them. For now, we can leave this part out and just use worldState to see if a pet is available or not and i can manually add them.