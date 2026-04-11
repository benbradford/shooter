faceEachOther()

if not isFlagCondition("canSwim", "eq","true") then
  say(npc.name(), "That water looks great, are you able to swim?<newline/>If not, I am happy to teach you!", 50, 4000)
  say(npc.name(), "It costs <gold>100 coins</gold> for 10 lessons, but there is a <gold>50 coin</gold> admin fee which is payable first", 50, 4000)

  if coins.get() >= 50 then
    coins.spend(50)
    say(npc.name(), "Great, that's the admin fee sorted! Come around to the front of me so we can assess", 50, 4000)
    player.moveTo(6, 9, 200)
    player.look("up")
    npc.look("down")
    wait(500)
    say(npc.name(), "Right, first thing's first.....", 50, 2500)
    npc.playAnim("village_swim_teacher_push", "once")
    setFlag("canSwim", "true")
    player.moveTo(6, 10, 300)

    saveState()
    wait(300)
    player.moveTo(6, 11, 300)
    wait(100)
    player.moveTo(7, 11, 300)
    wait(100)
    player.moveTo(6, 11, 300)
    wait(100)
    player.moveTo(7, 12, 300)
    wait(100)
    player.moveTo(6, 12, 300)
    say(npc.name(), "Oh wow look! You're a natural!!!!!<newline/>Sometimes it is best to just jump in at the deep end!!", 50, 1000)
  else
    say(npc.name(), "Hmm, you don't have enough coins yet. Come back when you have at least <gold>50 coins!</gold>", 50, 4000)
    restoreDirections()
  end
else
  say(npc.name(), "Happy Swimming!!", 50, 4000)
  restoreDirections()
end

