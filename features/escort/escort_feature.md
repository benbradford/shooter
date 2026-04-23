I want to introduce a new entity: an escort

An escort is something that has a destination which is a combination of a level and a cell. If an escort can reach the destination (i.e. it is in the current room and the cell is reachable and within X tiles (configurable)) then the escort will walk over to the destination cell and an event will be fired (entityid_reached_destination). If the escort cannot reach the destination then it follows the player until it is within 1 cell of the player, if it is then close to the player, it stops moving. If the player exits the current room, when they appear in the new room, the escort will be there also, as soon as the player moves off of the cell they spawn on, the escort will appear there. An escort will be in an idle phase until some event (awakeOnEvent property) is fired. at this point, a new flag is set: (current_escort: (entityId)). this is how we know that there is meant to be an escort being escorted by the player. when an escort reaches its destination, it will no longer follow, it will just stay on that spot. if the player leaves the room and returns, the escort will still be in the same destination location, no more interactions will ever be made.


Escorts have a specific type, which defines more specialist behaviour. I want to introduce the concept of a Knight escort (later there may be others)

The knight is an escort that has a spritesheet under public/assets/knight/knight_spritesheet.png. there is a knight.md file in the same directory that describes this spritesheet. it only has 4 movement directions


Before awakened - plays frame 4 of their crouch animation and the knight just stays still. there is only a south orientatino for this anim
When awakened - plays the crouch animation backwards to stand up - there is only a south orientation for this anim
When standing up:

   if there are any enemies within 2 cells of the knight, the knight goes back into their sleeping state where they crouch down and hold the last frame of the animation. the knight stays crouched until the enemies are gone.

   if there are no enemies, then the knight goes into the follow state using its scary_walk animation. the knight can never be hurt.

   when the knight is able to walk to its destination cell, it uses the scary_walk animation to reach its destination. if there are any enemies nearby, it reverts to the crouching state.

   once the knight reaches its destination cell, it plays the Arms_stretched animation once and holds the last frame. At this point, the knight is complete. whenever i leave or re-enter the room, the knight will jsut be stood their in that last pose. it no longer reacts to any enemies or attempts any follow.
