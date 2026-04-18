speech.backgroundColor("purple")
speech.textColor("white")
faceEachOther()


if isFlagCondition("pet_dog_collected", "eq", "true") and isFlagCondition("pet_selected", "eq", "dog") then
  say("Akari", "I Love your dog! I would pet it but<newline/>I hear it has a ferocious bark!", 50, 4000)
elseif isFlagCondition("canPunch", "eq", "true") then
  say("Akari", "When attacked, you heal over time<newline/>But if you stand still, you heal faster", 50, 4000)
else
  say("Akari", "Oh hey! I was wondering when you would appear", 50, 3000)
end