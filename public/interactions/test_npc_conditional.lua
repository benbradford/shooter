faceEachOther()

if isFlagCondition("test_talked", "eq", "true") then
  say(npc.name(), "We already talked!", 50, 2000)
else
  say(npc.name(), "First time talking!", 50, 2000)
  setFlag("test_talked", "true")
end

restoreDirections()
