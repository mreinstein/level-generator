import * as random from './random.js'


// get a value from a range, based on probability
// e.g., here is a range, where the sum of all values must add up to 100 (%)
//      index =  0    1    2     3    4    5    6    7    8    9    10
// babyRoomie: [ 0,   0,   50,   50,  0,   0,   0,   0,   0,   0,   0 ]
// means a 50% chance the value will be 2, and 50% chance it will be 3

export default function randomWeightedIndex (arr) {
  const diceRoll = random.next() * 100
  let idx = 0
  let summed = 0
  while (idx < arr.length) {
    summed += arr[idx]
    if (diceRoll < summed)
      return idx

    idx++
  }
  return 0
}
