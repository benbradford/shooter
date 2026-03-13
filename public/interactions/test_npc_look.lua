player.look("up")
npc.look("down")
say(npc.name(), "Looking at each other vertically!", 50, 2000)

player.look("left")
npc.look("right")
say(npc.name(), "Now horizontally!", 50, 2000)

player.look("up_right")
npc.look("down_left")
say(npc.name(), "Diagonals work too!", 50, 2000)

restoreDirections()
