there are several assets in coreAssets that aren't core as they depend on the level.json

such as

skeleton
thrower
floating_robot


only if bulletDude is an entity in the level.json then we should add
 'bullet_dude_sprite', 'rock', 'bullet_default', 'bullet_default_shell'


only if bubase is an entity in the level.json then we should add
 'bug', 'bug_base', 'base_destroyed'



'dungeon_vase', is an entity, only load in if the entity exists in the level

'pillar' is a background asset that should only be loaded in if there is a cell ith this backgroundTexture

Additionally water2 and stone_floor aren't core, they should be found in the background section of json and loaded in as a part of path_texture and water.sourceTexture
