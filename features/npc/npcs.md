i want to create a new feature - npcs. these will be entities with their own components to define their behaviour

an npc will stand idle in a configurable direction and will be defined as an entity like this



{
      "id": "npc1",
      "type": "npc",
      "data": {
        "assets": "npc1",
        "col": 11,
        "row": 21,
        "direction": "south",
        "interactions": [
           {
              name: "npc1_alt_interaction",
              whenFlagSet: {
 	             "name": "npc1_condition",
 	             "condition": "equals",
 	             "value": "on"
 	          },
 	          position: {
 	              "col": 5,
 	              "row": 8,
 	          }
           },
 	       {
 	          name: "npc1_default_interaction",
 	       }
        ]
      }
},

assets refers to where the assets are located, they will be inside public/assets/npc/npc1/ in this case. if i said npc2, then they would be in public/assets/npc/npc2 etc. In here, a sprite sheet should be found with <assets>_spritesheet.png that can be used for the npcs idle animation.

direction refers to the direction the npc is facing when they spawn

interactions is a list of possible interactions for this npc. when a player is within 100 pixels of an npc they can interact with them, so long as there is an available interaction. when a player can interact with an npc, then instead of showing a punch_icon they show lips. The AttackButtonComponent should adjust the icon: if in range of an npc interaction then show lips, otherwise show punch_icon. if the player presses space or presses the attack button when an interaction can be made, then an interaction is launched, rather than the player punching

each npc entity defines an array of 0 or more interactions, listed in priority order. If there are no interactions, or no interactions that can be launched, the the AttackButtonComponent does not change to lips mode as no interaction can be made.

in the entity definition of interactions, there is a list like:

{
	name: <name_of_interaction_to_launch>
	whenFlagSet?: conditions upon which this interaction should be launched
}

whenFlagSet defines a condition which would mean this interaction should be used. It contains name, condition and value where
  name = the name of the global flag to check the condition of
  condition = equals, not equals, greater_than, less_than, great_than_or_equal, less_than_or_equale
  value = the value to use for the equality checl

if the global flag 'name' doesn't exist, then the check fails. if the value is a number, then all of the possible conditions can be applied. if the value is a string, then only equals or not equals applies - any other condition is ignored and a console error is shown to say you cannot do that comparison.

if whenFlagSet defines a condition that is true at runtime, then there is a valid interaction for this npc. the position of this npc is then defined by the position section of json, if it exists, otherwise use the row and col defined in the data section. When there is a valid interaction, the lips icon must be shown if the player is within range. if the player presses space or touches the lips icon, then the interaction is launched. if whenFlagSet defines a condition that is false, then go to the next interaction

if no whenFlagSet is defined, then this interaction is always usable

if there are no interactions that have a true whenFlagSet, then no interaction is possible and the lips icon should never appear and the row, col defined in the data section is used for a position.

when creating an npc, there should be assets defined for them in ASSET_GROUPS of AssetRegistry.ts. for example, there should be an npc1 section. when loading a level with npcs, then this should be used to ensure the assets are loaded in.