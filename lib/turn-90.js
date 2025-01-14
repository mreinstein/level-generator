// given a heading direction and a turn direction, return the new heading
// e.g.,  result = turn 'NORTH', 'LEFT'
//        result will be 'WEST', because you are heading north then turn left 90 degrees
const leftDirections = {
  EAST: 'NORTH',
  WEST: 'SOUTH',
  NORTH: 'WEST',
  SOUTH: 'EAST'
}

const rightDirections = {
  EAST: 'SOUTH',
  WEST: 'NORTH',
  NORTH: 'EAST',
  SOUTH: 'WEST'
}


export default function turn90 (headingDirection, relativeDirection) {
  if ((relativeDirection === 'LEFT') || (relativeDirection === 'COUNTERCLOCKWISE'))
    return leftDirections[headingDirection]
  
  if ((relativeDirection === 'RIGHT') || (relativeDirection === 'CLOCKWISE'))
    return rightDirections[headingDirection]

  return null
}
