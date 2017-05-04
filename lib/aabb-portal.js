let getPortal
const intersect1D = require('./1d-intersect')


// really nice line segment intersection test:
// https://github.com/tmpvar/segseg/blob/master/test/index.js

// given 2 AABBs, determine the portal (line segment) spanning the
// open space that connects them. returns null if they aren't adjacent
module.exports = (getPortal = function(aabb, next) {
  // check if AABBs are lined up on x axis ( side by side with 1 space between)
  let intersection, x
  if (((aabb.x+aabb.width) === next.x)  ||  ((aabb.x) === (next.x + next.width))) {
    intersection = intersect1D(aabb.y, aabb.y+aabb.height, next.y, next.y+next.height)

    if (!intersection) { return null }

    if ((aabb.x+aabb.width) === next.x) {
      x = aabb.x+aabb.width
    } else {
      x = next.x + next.width
    }

    return [ { x, y: intersection[0] }, { x, y: intersection[1] } ]
  }

  // check if aabbs are lined up on y axis ( on top of each other with 1 space between)
  if (((aabb.y+aabb.height) === next.y)  ||  ((aabb.y) === (next.y + next.height))) {
    let y
    intersection = intersect1D(aabb.x, aabb.x+aabb.width, next.x, next.x+next.width)

    if (!intersection) { return null }

    if ((aabb.y+aabb.height) === next.y) {
      y = aabb.y+aabb.height
    } else {
      y = next.y + next.height
    }

    return [ { x: intersection[0], y }, { x: intersection[1], y } ]
  }

  return null
})
