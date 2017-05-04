let turn90Random
const random = require('./random')


const dirs = {
  NORTH: [ 'EAST', 'WEST' ],
  SOUTH: [ 'EAST', 'WEST' ],
  EAST: [ 'NORTH', 'SOUTH' ],
  WEST: [ 'NORTH', 'SOUTH' ]
}

module.exports = (turn90Random = function(direction) {
  const val = Math.round(random.next())
  return dirs[direction][val]
})
