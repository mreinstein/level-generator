let expandAABB
const expansionVectors = {
  NORTH: { x: 0, y: -1, width: 0, height: 1 },
  SOUTH: { x: 0, y: 0, width: 0, height: 1 },
  EAST : { x: 0, y: 0, width: 1, height: 0 },
  WEST : { x: -1, y: 0, width: 1, height: 0 }
}


const PROPS = [ 'x', 'y', 'width', 'height']

module.exports = (expandAABB = function(aabb, direction, amount) {
  if (amount == null) { amount = 1 }
  const result = {}

  for (let dim of Array.from(PROPS)) {
    result[dim] = aabb[dim] + (expansionVectors[direction][dim] * amount)
  }

  return result
})
