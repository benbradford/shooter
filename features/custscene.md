i want to create a cutsceneeventmanager. with this, i can register for events like this:


cutSceneManager.registerEvent(eventName, cutSceneName);

then when that event fires, it initiates a cutScene.

cutScenes are defined in files under public/assets/cutscenes

a cutscene file will look like this

```
player.moveTo(10,5, 20)
player.look(down_left)
wait(500)
player.look(up)
wait(500)
say("player", "oh wow, look what I see over there!", 20, 3000)

```

When a cutScene initiates, the stateMachine enters into a CutSceneState with the cutscene data as a param. in cutScene state, there is no user movement and the hud icons disappear. the cutscene state is responsible for executing the commands in a cut scene. Each command performs one action and blocks until the action is completed

possible commands are

1. entity commands
<entity>.<command>(<params>)

where entity is the entityId to take an action on
 command are:
    - moveTo(col,row, speed)
      - this will use the pathfinder to move the entity to that position. i am unsure exactly how to do this right now. i think we might need to add a new CutSceneWalkComponent that knows how to use the pathfinder to reach a desintation at a certain speed. it should also know how to play the correct animations for the direction of travel. let's only allow the player entity to be moved right now, we will add more entities later that can move
    - look(direction)
      - this will cause the entity to look in a certain direction. We might need to add a new CutSceneLookComponent that knows which sprite to use to face in a certain direction. let's only allow the player entity to look right now, we can add this capability to other entitiers later.

2. scene commands

    - wait(timeInMs)
      - the cutscene just freezes for this amount of time

    - say(name, text, talkSpeedInMs, timeoutInMs)
      - the cutscene creates a speach box on the screen. the speech box has the name of the person talking at the top, then below it it has the text that that person is saying. The text is nicely cropped to the speech window so it never overlaps. the text should appear a letter at a time with talkSpeedInMs delay between each character appearing. If the player presses space or touches the screen, then all of the text should just appear at once. once all of the characters are displayed, it will remain on screen for timeoutInMs OR the user touches the screen (or presses space) at which point the command ends and the speech box disappears

Once all commands have completed, then we exit the CutSceneState and return to the InGameState

We will need to add cutscenes to the editor at some point, we can follow up on that.