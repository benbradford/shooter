 playSound("lightning_zap")
 createEffect("lightning", {
  startCell = { col = 11, row = 4 },
  endCell = { col = 1, row = 6 },
  duration = 2000
})
local dir = calculateDirection(player.col, player.row, 1, 6)
player.look(dir)

wait(1500)
raiseEvent("second_door_appear")
wait(500)