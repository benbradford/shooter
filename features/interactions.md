i want to create a interactionEventManager. with this, i can register for events like this:


interactionManager.registerEvent(eventName, interactionName);

then when that event fires, it initiates a interaction.

interactions are defined in files under public/assets/interactions/

an interaction file will look like this

```
if coins.get() < 50 then
  player.moveTo(10,5, 20)
  player.look(down_left)
  wait(500)
  player.look(up)
  wait(500)
  say("player", "i think i will buy this!", 20, 3000)
  coins.spend(50)
else
 -- not enough money
  say("player", "oh dear, i need 50 coins to do this!)
end
```

When an interaction initiates, the stateMachine enters into an interactionState with the interaction data as a param. in interaction state, there is no user movement allowed and the hud icons disappear. the player health update is paused. the interaction state is responsible for executing the commands in an interaction. Each command performs one action and blocks until the action is completed

possible commands are

1. entity commands
<entity>.(<property>.)<command>(<params>)

where entity is the entityId to take an action on
 command are:
    - moveTo(col,row, speed)
      - this will use the pathfinder to move the entity to that position. i am unsure exactly how to do this right now. i think we might need to add a new interactionWalkComponent that knows how to use the pathfinder to reach a desintation at a certain speed. it should also know how to play the correct animations for the direction of travel. let's only allow the player entity to be moved right now, we will add more entities later that can move
    - look(direction)
      - this will cause the entity to look in a certain direction. We might need to add a new interactionLookComponent that knows which sprite to use to face in a certain direction. let's only allow the player entity to look right now, we can add this capability to other entitiers later.
 properties are optional
    - an example is coins
    - you can get() to check how many you have
    - you can spend(x) to reduce the amount of coins you have
    - you can obtain(x) to increase the amount of coins you have

2. scene commands

    - wait(timeInMs)
      - the interaction just freezes for this amount of time

    - say(name, text, talkSpeedInMs, timeoutInMs)
      - the interaction creates a speach box on the screen. this can be found in public/assets/interactions/speechbox.png. the speech box has the name of the person talking at the top, then below it it has the text that that person is saying. The text is nicely cropped to the speech window so it never overlaps. the text should appear a letter at a time with talkSpeedInMs delay between each character appearing. If the player presses space or touches the screen, then all of the text should just appear at once. once all of the characters are displayed, it will remain on screen for timeoutInMs OR the user touches the screen (or presses space) at which point the command ends and the speech box disappears. we can use one of these fonts: 'Arial, "Helvetica Neue", Helvetica, sans-serif'

3. conditionals
 - this allows different branches through the interaction based on the value of the condition
 -  if <condition> then
      x
    (else y) -- optional
     end
    where x is another series of commands (must be at least 1). the else part is optional and must have at least one command
 - a condition takes the form
    <property> (< > = !=) <value>
   where property will be some property of an entity e.g. player.coins.get()

We may add more commands later, such as allowing the users a selection option which they have to touch

comments can be added using (--) and everything written  on that line after the interaction is disregarded.

I would like it if we can somehow do a syntax check on all interactions during build time so that we can spot syntax errors early

Once all commands have completed, then we exit the interactionState and return to the InGameState

We will need to add interactions to the editor at some point, we can follow up on that later.