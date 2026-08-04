local monk = entity("tv_monk0")
monk.look("up")
wait(200)
player.moveTo(10, 16, 200)
raiseEvent("gateAppear")
wait(600)
player.look("down")
wait(1500)
player.look("up")
wait(300)
player.moveTo(10,10, 200)
wait(200)
monk.look("up_right")
wait(100)
monk.look("right")
wait(100)
monk.look("down_right")
wait(100)
monk.look("down")
raiseEvent("monk_booting")
wait(1000)
raiseEvent("monk_love")
wait(500)

say("Synar", "Wow.... a visitor!", 50, 4000)
say("Synar", "You must have returned my <hint>ferocious nights</hint><newline/>They are troublesome wanderers, always getting themselves into tight spots", 50, 4000)
raiseEvent("monk_smug")
say("Synar", "So..... I suppose you must want a reward or something?", 50, 4000)
raiseEvent("monk_charging")
say("Synar", "Let me think, what would be appropriate here", 50, 4000)
monk.look("down_left")
wait(100)
monk.moveTo(8, 9, 300)

monk.look("down")
wait(100)
monk.look("down_right")
wait(100)
say("Synar", "So let me see here, you arrive at my castle", 50 ,4000)
raiseEvent("monk_sad")
say("Synar", "Completely unannaounced", 50 ,4000)
monk.look("up_left")
wait(100)
monk.look("up")
wait(100)
monk.moveTo(8,8,300)

raiseEvent("monk_neutral")
monk.look("up_right")
wait(100)
monk.look("right")
wait(100)
monk.look("down_right")
wait(100)
say("Synar", "Without Invitation", 50 ,4000)
monk.look("down_right")
wait(100)
monk.look("right")
wait(100)
monk.moveTo(12,8,300)

raiseEvent("monk_stunned")
wait(500)
monk.look("down_right")
wait(100)
monk.look("down")
wait(100)
monk.look("down_left")
wait(100)
say("Synar", "Meddling in other's business", 50 ,4000)
raiseEvent("monk_angry")
monk.moveTo(10,8, 300)

monk.look("down")
wait(100)
say("Synar", "And expect gratitude?!", 50 ,4000)
raiseEvent("monk_enraged")
wait(2000)
raiseEvent("monk_laughing")
say("Synar", "But wait! Perhaps I am getting ahead of myself here", 50 ,4000)
raiseEvent("monk_happy")
say("Synar", "Perhaps I, <warning>Brother Synar</warning>, should be the grateful one since you found my pets", 50 ,4000)
raiseEvent("monk_love")
say("Synar", "Let me see what my brethen thinks, they are more clear-headed than me......<newline/>Come forth, my Choir!")

monk.playAnim("tv_monk_raise_hands_south", "hold")

local targets = {
    { col = 8, id = "minion_0" },
    { col = 9, id = "minion_1" },
    { col = 10, id = "minion_2" },
    { col = 11, id = "minion_3" },
    { col = 12, id = "minion_4" },
}
for i, t in ipairs(targets) do
  spawn("minion",t.id,{
    startCell = { col = t.col, row = 13 }
  })
  wait(150)
end
player.look("down")
wait(1000)
raiseEvent("monk_booting")
wait(200)
monk.look("down_right")
wait(150)
monk.look("right")
wait(150)
monk.look("up_right")
wait(150)
monk.look("up")
spawn("silas", "silas0", {startCell = { col = 10, row = 17 }})
silas = entity("silas0")
silas.look("up")
camera.lookAt(10,14,500)
wait(500)


for i, t in ipairs(targets) do
    createEffect("arrow", {
      startCell = { col = 10, row = 17 },
      endCell = { col = t.col, row = 13 },
      speed = 250,
      onEnd = function()
        entity(t.id).playAnim("minion_death_backward", "hold")
      end
    })
    wait(200)
end
wait(1000)

camera.followPlayer(500)
createEffect("exclamation", {col=10, row=10, duration=1000, offsetY=-15})
wait(1000)

kill("silas0")

monk.look("up_right")
wait(100)
monk.look("right")
wait(100)
monk.look("down_right")
wait(100)
monk.look("down")
raiseEvent("monk_stunned")
createEffect("exclamation", {col=10, row=8, duration=2000,offsetY=25})
player.look("up")
say("silas", "WHAAAATTT?!!!???", 50, 4000)
say("silas", "My Brethen!!!, My Choir!!!<newline/>You destroyed them?!?")
player.look("down")
camera.lookAt(10,14,500)
wait(500)
camera.followPlayer(500)
createEffect("exclamation", {col=10, row=10, duration=1000,offsetY=-15})
player.look("up")
raiseEvent("monk_enraged")
say("silas", "Oh you have done it now!")
for i, t in ipairs(targets) do
    kill(t.id)
end