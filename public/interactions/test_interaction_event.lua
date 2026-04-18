speech.backgroundColor("purple")
speech.textColor("white")
say("Akari", "Welcome to the <warning>shop</warning>!<newline/>I have many items.", 50, 3000)
player.moveTo(24, 3, 200)
player.look("down_left")
wait(500)
if coins.get() >= 50 then
  if isFlagCondition("nothingPurchased", "eq","true") then
    say("Akari", "Oh! I see you have already bought <warning>nothing</warning>!<newline/> I have nothing more to sell!", 50, 3000)
  else
    fadeOut(500)
    say("Akari", "You can afford this!", 50, 2000)
    coins.spend(50)
    setFlag("nothingPurchased", "true")
    fadeIn(500)
    say("Akari", "You have purchased <warning>nothing</warning>! for 50 coins!<newline/>How <success>awesome!</success>", 50, 3000)
  end
else
  say("Akari", "You need <warning>50 coins</warning>!", 50, 2000)
end
