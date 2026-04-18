faceEachOther()
if not isFlagCondition("otis_first_interaction_complete", "eq","true") then
    say("Otis", "I am very weak on power right now.<newline/>I need <collectible>mist orbs</collectible> from the misty moors below<newline/>But there are too many dangerous <warning>wild cats</warning> ", 50, 3000)
    wait(800)
    say("Otis", "You look brave! Perhaps you can collect the <collectible>mist orbs</collectible> for me?!", 50, 3500)
    wait(800)
end
say("Otis", "Can you collect 6 <collectible>mist orbs</collectible> from the moors for me?<newline/>I will grant you a <hint>special power</hint> if you can do it.<newline/>Just look out for the <warning>wild cats</warning> Keep moving is my advice!", 50, 3500)
setFlag("otis_first_interaction_complete", "true")
raiseEvent("enter_wilds1")
restoreDirections()
