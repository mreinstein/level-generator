const seedrandom = require('seedrandom')


let rng = null

module.exports.seed = function(seedValue) {
  seedValue = seedValue || Math.random()
  console.log('random seed:', seedValue)
  return rng = seedrandom(seedValue)
}


module.exports.next = () => rng()
