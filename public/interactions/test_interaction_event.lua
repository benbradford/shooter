speech.backgroundColor("purple")
speech.textColor("white")
say("Akari", "Welcome to the <red>shop</red>!<newline/>I have many items.", 50, 3000)
player.moveTo(24, 3, 200)
player.look("down_left")
wait(500)
if coins.get() >= 1 then
  say("Akari", "You can afford this!", 50, 2000)
  coins.spend(1)
else
  say("Akari", "You need <red>50 coins</red>!", 50, 2000)
end
