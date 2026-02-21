change createOnEvent to be createOnAnyEvent and add a new createOnAllEvents

createOnAllEvents?: []
createOnAnyEvent?: []

these are mutually exclusive, raise an error if any entity has both of these

update existing entities in json files that have createOnEvent: x to be createOnAnyEvent: [x]

when createOnAnyEvent fires, remove the listener

for createOnAllEvents, the entity will need to keep track of all events that have been fired, when they all have, then the entity can be created

update the editor entity panel, which currently has 'Spawn Event:' change this to 'Spawn on Any Event' and then accept a comma separated list. when logging this out or updating level data, this comma-separated-list (say ev1,ev2,ev3) should be transformed to createOnAnyEvent: [ev1, ev2, ev3]. Also include an option for createOnAllEvents, which will also have a text box allowing a comma-separated-list. if createOnAllEvents box is empty, then do not include createOnAllEvents in the json, similar for createOnAnyEvent.