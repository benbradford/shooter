faceEachOther()
local count = getFlag("mist_orb")
local plural = "s"
if count == "1" then
   plural = ""
end
say("Otis", "I see you have collected " .. count .. " <collectible>mist orb" .. plural .. "</collectible>, bring me all 6 to grant you a <hint>special power!</hint>", 50, 4000)
restoreDirections()
