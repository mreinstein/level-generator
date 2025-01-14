import * as random from './random.js'


const dirs = {
  NORTH: [ 'EAST', 'WEST' ],
  SOUTH: [ 'EAST', 'WEST' ],
  EAST: [ 'NORTH', 'SOUTH' ],
  WEST: [ 'NORTH', 'SOUTH' ]
}

export default function turn90Random (direction) {
  const val = Math.round(random.next())
  return dirs[direction][val]
}
