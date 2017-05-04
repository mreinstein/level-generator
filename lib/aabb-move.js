let moveAABB
const movementVectors = {
  NORTH: { x: 0, y: -1 },
  SOUTH: { x: 0, y: 1 },
  EAST:  { x: 1, y: 0 },
  WEST:  { x: -1, y: 0 }
}


module.exports = (moveAABB = function(aabb, direction, amount) {
  if (amount == null) { amount = 1 }
  const vec = movementVectors[direction]
  if ((!(amount > 0)) || !vec) { return aabb }
  aabb.x += (vec.x * amount)
  aabb.y += (vec.y * amount)
  return aabb
})
