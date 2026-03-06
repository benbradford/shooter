-- Test interaction for speech box
-- Demonstrates color tags and speech.setColor()

-- Check if player has enough coins
if coins.get() >= 50 then
  -- Player can afford it
  player.moveTo(10, 5, 200)
  player.look("down_left")
  wait(500)
  player.look("up")
  wait(500)
  speech.setColor("purple")
  say("Akari", "I think I will <gold>buy</gold> this!", 50, 3000)
  coins.spend(50)
else
  -- Not enough money
  speech.setColor("gold")
  say("Akari", "Oh dear, I need <red>50 coins</red> to do this!", 50, 3000)
end
