/*
This test uses a separating axis test, which checks for overlaps between the
two boxes on each axis. If either axis is not overlapping, the boxes aren’t
colliding.
*/
let intersectAABB
module.exports = (intersectAABB = function(rect, rect2) {
  const dx = (rect2.x + (rect2.width/2)) - (rect.x + (rect.width/2))
  const px = ((rect2.width/2) + (rect.width/2)) - Math.abs(dx)
  if (px <= 0) { return false }

  const dy = (rect2.y + (rect2.height/2)) - (rect.y + (rect.height/2))
  const py = ((rect2.height/2) + (rect.height/2)) - Math.abs(dy)
  if (py <= 0) { return false }

  return true
})
