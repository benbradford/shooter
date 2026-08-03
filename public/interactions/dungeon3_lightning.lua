 playSound("lightning_zap")
createEffect("lightning", {
  startCell = { col = 8, row = 4 },
  endCell = { col = 9, row = 0 },
  duration = 2000
})

createEffect("lightning", {
  startCell = { col = 11, row = 4 },
  endCell = { col = 10, row = 0 },
  duration = 2000
})

local dir = calculateDirection(player.col, player.row, 10, 0)
player.look(dir)


wait(1500)
raiseEvent("dungeon_appear")
wait(1000)