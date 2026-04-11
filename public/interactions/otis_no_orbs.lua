faceEachOther()
if not isFlagCondition("otis_first_interaction_complete", "eq","true") then
    say("Otis", "I am very weak on power right now.<newline/>I need <cyan>mist orbs</cyan> from the misty moors below<newline/>But there are too many dangerous <red>wild cats</red> ", 50, 3000)
    wait(800)
    say("Otis", "You look brave! Perhaps you can collect the <cyan>mist orbs</cyan> for me?!", 50, 3500)
    wait(800)
end
say("Otis", "Can you collect 6 <cyan>mist orbs</cyan> from the moors for me?<newline/>I will grant you a <purple>special power</purple> if you can do it.<newline/>Just look out for the <red>wild cats</red> Keep moving is my advice!", 50, 3500)
setFlag("otis_first_interaction_complete", "true")
restoreDirections()
