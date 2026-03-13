local dir = calculateDirection(player.col, player.row, npc.col, npc.row)
player.look(dir)

local reverseDir = calculateDirection(npc.col, npc.row, player.col, player.row)
npc.look(reverseDir)

say(npc.name(), "Faced via calculateDirection!", 50, 2000)

restoreDirections()
