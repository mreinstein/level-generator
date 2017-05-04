let furnish
const LootTable = require('loot-table')
const fs        = require('fs')
const parse     = require('./parse-machine-config')


const machinesSrc = fs.readFileSync(__dirname + '/machines.xt', 'utf8')
const machines = parse(machinesSrc)

// place a series of machines in a given area, respecting machine padding rules
const layout = function(entity, machine, rotate) {
  let { width, height } = machine
  if (rotate == null) { rotate = false }
  if (rotate) {
    width = machine.height
    height = machine.width
  }

  const oneRow = []

  // determine how many rows and columns of machines fit in the given space
  //   start with a minimal wall padding
  //   repeat the pattern, with object padding between them
  //   stop when the room is full
  let x = entity.x + machine.padding.wall
  let y = entity.y + machine.padding.wall

  while (x < (entity.x + entity.width)) {
    if (oneRow.length > 0) {
      x += machine.padding.object
    }

    if (x < (entity.x + entity.width)) {
      oneRow.push({ name: machine.name, x, y, width, height, rotated: rotate })
      x += width
    }
  }

  if (!oneRow.length) { return [] }

  const columns = []
  while (y < (entity.y + entity.height)) {
    var nextRow
    if (columns.length > 0) {
      y += machine.padding.object
    }

    if (y < (entity.y + entity.height)) {
      nextRow = JSON.parse(JSON.stringify(oneRow))
      for (let m of Array.from(nextRow)) { m.y = y }
    }
    y += height

    columns.push(nextRow)
  }

  let results = []
  for (let c of Array.from(columns)) {
    results = results.concat(c)
  }
  // TODO: consider evenly distributing the spacing, or moving to one side of a room

  return results
}


const selectMachine = function(theme, entityType) {
  const selection = new LootTable()
  for (let name in machines) {
    const m = machines[name]
    if (m.theme === theme) {
      selection.add(name, m.rarity)
    }
  }

  const machineName = selection.choose()
  return machines[machineName]
}


module.exports = (furnish = function(objects, theme, options) {
  if (options == null) { options = {} }
  const compositions = new LootTable()
  compositions.add('empty', 15)
  compositions.add('machines', 75)
  compositions.add('machines_stockpile', 5)
  compositions.add('stockpile', 5)

  const allMachines = []

  for (let entity of Array.from(objects)) {
    if ((entity.type === 'room') || (entity.type === 'anteroom') || (entity.type === 'tunnel')) {
      const composition = compositions.choose()

      if ((composition === 'machines') || (composition === 'machines_stockpile')) {
        const machine = selectMachine(theme, entity.type)

        const result = layout(entity, machine)
        for (let m of Array.from(result)) { allMachines.push(m) }
      }
    }
  }

      // TODO: place stockpiles

  return allMachines
})
