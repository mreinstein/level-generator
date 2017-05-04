const furnish = require('./index')


/*
theme ideas:

MINING   STORAGE   REFINERY   POWER GEN   COMMS    MAINT

HANGAR   GARDEN    MEDBAY     SENSORS     OFFICE
*/

const objects = [
  { type: 'room', x: 10, y: 10, width: 12, height: 9 },
  { type: 'anteroom', x: 100, y: 100, width: 7, height: 7 }
]

const theme = 'RESEARCH'
const machines = furnish(objects, theme)
console.log(machines)
