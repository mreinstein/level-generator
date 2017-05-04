let intersect1D
const inRange = (idx, start, end) => (idx >= start) && (idx <= end)


// returns the intersecting parts of 2 1D line segments, or null
module.exports = (intersect1D = function(startA, endA, startB, endB) {
  // determine full extent
  let end
  const min = Math.min(startA, startB)
  const max = Math.max(endA, endB)

  if (min === max) {
    return [ min, min ]
  }

  let begin = null
  for (let idx = min, end1 = max, asc = min <= end1; asc ? idx <= end1 : idx >= end1; asc ? idx++ : idx--) {
    if (begin === null) {
      if (inRange(idx, startA, endA) && inRange(idx, startB, endB)) {
        begin = idx
      }
    } else {
      if (inRange(idx, startA, endA) && inRange(idx, startB, endB)) {
        end = idx
      } else {
        end = end || begin
        return [ begin, end ]
      }
    }
  }

  if (!begin) { return null }

  end = end || begin
  return [ begin, end ]
})
