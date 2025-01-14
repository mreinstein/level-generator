import Alea from 'alea'


let rng = null


export function seed (seed=Math.random()) {
  console.log('random seed:', seed)
  return rng = new Alea(seed)
}


export function next () {
    return rng()
}
