add a new puma enemy using assets in public/assets/puma

States:

resting, standing, threatening, chasing, jumping

The puma behaviour is:

State: resting
anim: Seated-On-Belly-Idle (repeat)
behaviour: just plays their idle animation. the puma looks in the direction they are facing for <lookDistance> pixels with a 30 degree FOV, if they see the player, then they go to stand-up state. Additionally, if the puma doesn't see the player, but the player gets within <detectDistance> pixels, then the puma goes to stand-up state.


State: stand-up
anim: Standing-From-Belly (once)
behaviour: The puma faces the player and plays their standing animation once through and then transitions to threatening state


State: threatening
anim: Angry (repeat)
behaviour:  The puma looks at the player in this state for <angryMs> before transitioning to chase


State: chasing
anim: Running-4-Frames (repeat)
behaviour: Using pathfinder, the puma runs towards the player at <pxPerSecond> speed. The movement is fairly smooth, like a car, rather than entirely rigid, i.e. there is velocity to the puma for both the acceleration and movement direction, the puma shouldn't turn instantly, there should be some momentum drag. When the puma is within <jumpDetectDistance> then the puma transitions to jumping state.

State: jumping
anim: Jump Animation (once)
behaviour: the puma jumps at the player, the jump should land behind where the player was stood at the time of the jump, by the same amount as which they started the jump. the anim speed should be such that the anim only plays once through the duration of the jump. the puma jumps at <jumpSpeed> speed. if the puma hits the player, then the player takes 15 damage. upon landing, the puma transitions to a recover state:

State: recover
anim: Running-4-Frames (repeat)
behaviour: the puma continues running in the same speed and directions as the jump but slowly comes to a halt. They then transition to the threatening state again

State: death
anim: Idle (once)
behaviour: if the puma is punched, they die instantly. the puma will just hold its current position in an idle pose and fade out after 1 second (we don't have any great anims for this, so this will do for now, we can later add effects if we ant)

When creating a puma, it's data should be:

row,
col,
difficulty,
startingPosition (up, down, left, right etc.)


difficulty:
{

	easy: { lookDistance: 60, detectDistance: 20, angryMs: 2000, pxPerSecond: 250, jumpDetectDistance: 250, jumpSpeed: 120}
	medium:{ lookDistance: 80, detectDistance: 50, angryMs: 1200, pxPerSecond: 300, jumpDetectDistance: 300, jumpSpeed: 160}
	hard:{ lookDistance: 100, detectDistance: 75, angryMs: 700, pxPerSecond: 450, jumpDetectDistance: 350, jumpSpeed: 200}
}

the puma must adhere to collision (walls, blocked cells etc.) and never enter into them either when running or jumping.