// determine if an AABB overlaps a set of existing AABBs
let overlaps
const intersects = require('./aabb-intersect')


const aabbs = []  // simple AABB object pool

// return true if 2 rectangles overlap. minPadding specifies minimum spacing
// between the rectangles
module.exports = (overlaps = function(rectA, rectB, minPadding) {
  if (minPadding == null) { minPadding = 1 }
  let b = aabbs.pop()
  if (!b) {
    b = {x: 0, y: 0, width: 0, height: 0}
  }

  b.x = rectB.x
  b.y = rectB.y
  b.width = rectB.width
  b.height = rectB.height

  // inflate the size of rectB by 1 unit in each dimension
  b.x -= minPadding
  b.width += (minPadding * 2)

  b.y -= minPadding
  b.height += (minPadding * 2)

  // check rectA and the inflated rectB for overlap
  const result = intersects(rectA, b)
  aabbs.push(b)
  return result
})
