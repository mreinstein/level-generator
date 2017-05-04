let mutate
const random = require('./random')


// mutate an input number by a random value between -amount and amount
module.exports = (mutate = function(input, amount) {
  const output = (input - amount) + ( random.next() * ((2*amount)+1) )
  if (output < 0) {
    return 0
  }
  return output
})
