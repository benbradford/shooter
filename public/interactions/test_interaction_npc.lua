-- Store NPC's original direction
local originalNpcDir = npc.direction
print("[TEST] NPC original direction:", originalNpcDir)
print("[TEST] NPC world position:", npc.x, npc.y)
print("[TEST] Player world position:", player.x, player.y)

-- Calculate directions for facing each other (using world coordinates)
local npcToPlayerDir = calculateDirection(npc.x, npc.y, player.x, player.y)
local playerToNpcDir = calculateDirection(player.x, player.y, npc.x, npc.y)
print("[TEST] NPC should face:", npcToPlayerDir)
print("[TEST] Player should face:", playerToNpcDir)

-- Face each other
npc.look(npcToPlayerDir)
player.look(playerToNpcDir)

speech.backgroundColor("purple")
speech.textColor("white")
say("Shelly", "Welcome to the test level!", 50, 3000)

-- Restore NPC's original direction
npc.look(originalNpcDir)