export default function parse (inp) {
  const lines = inp.split('\n')
  const machines = {}
  for (let line of Array.from(lines)) {
    const machine = parseLine(line)
    if (machine) {
      machines[machine.name] = machine
    }
  }
  return machines
}


function optionalFloat (num) {
  if (num === '-') {
    return 0
  }
  return parseFloat(num) || num
}


function optionalInt (num) {
  if (num === '-') {
    return 0
  }
  return parseInt(num, 10)
}


function parseLine (line) {
  let machine
  line = line.trim()
  if ((line.length === 0) || (line.indexOf('//') === 0)) {
    return  // encountered comment
  }

  const tokens = line.match(/\S+/g)

  if (tokens.length !== 14) {
    console.error('invalid line:', line)
    return null
  }

  return machine = {
    name: tokens[0],
    theme: tokens[1],
    width: parseInt(tokens[2], 10),
    height: parseInt(tokens[3], 10),
    rarity: optionalFloat(tokens[4]),
    padding: {
      wall: optionalInt(tokens[5]),
      object: optionalInt(tokens[6])
    },
    spawnProbability: {
      room: optionalInt(tokens[7]),
      anteroom: optionalInt(tokens[8]),
      tunnel: optionalInt(tokens[9])
    },
    volatility: {
      armor: optionalInt(tokens[10]),
      instabilityChance: optionalInt(tokens[11]),
      instabilityTimer: optionalInt(tokens[12]),
      explosionRadius: optionalInt(tokens[13])
    }
  }
}
