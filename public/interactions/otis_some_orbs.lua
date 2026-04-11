faceEachOther()
local count = getFlag("mist_orb")
local plural = "s"
if count == "1" then
   plural = ""
end
say("Otis", "I see you have collected " .. count .. " <cyan>mist orb" .. plural .. "</cyan>, bring me all 6 to grant you a <purple>special power!</purple>", 50, 4000)
restoreDirections()
