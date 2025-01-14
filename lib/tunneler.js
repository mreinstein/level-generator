import Anteroom     from './anteroom.js'
import Roomie       from './roomie.js'
import Tunnel       from './tunnel.js'
import getValue     from './getvalue.js'
import moveAABB     from './aabb-move.js'
import mutate       from './mutate.js'
import overlaps     from './aabb-overlaps.js'
import * as random  from './random.js'
import randomIndex  from './random-weighted-index.js'
import turn90       from './turn-90.js'
import turn90Random from './random-turn-90.js'
import uuid         from './uuid.js'


// constants
const DEAD = false
const ALIVE = true


export default class Tunneler {
  constructor(level, design, init) {
    this.level = level
    this.design = design
    Object.assign(this, init)
    this.steps = 0
    this.id = uuid()
  }


  // returns true if the tunneler is alive
  step() {
    // tunneler has expired
    let changeDir, direction
    if (this.steps >= this.maxSteps) {
      // tunnelers that end without hitting anything have a chance to spawn a room
      const diceRoll = random.next() * 100
      if (diceRoll < this.joinProb) {
        const roomSize = this._getRoomSizeExcavation()
        changeDir = random.next() * 100
        if (changeDir <= this.changeDirectionProb) {
          direction = turn90Random(this.direction)
        } else {
          ({ direction } = this)
        }

        const r = new Roomie(this, this.generation, direction, this.level, this.design, roomSize)
        this.level.workers.push(r)
      }

      return DEAD
    }

    this.steps++

    const t = new Tunnel(this.level, this.parentTunnel)

    let pos = this._getNewTunnelerPosition(this.parentTunnel, this.tunnelWidth, this.direction)
    const state = t.excavate(pos, this.direction, this.stepLength, this.tunnelWidth)

    if ([ 'DUNGEON-OVERLAP', 'PREFAB-OVERLAP', 'ROOM-CORNER-OVERLAP' ].indexOf(state) >= 0) {
      // don't allow last chance tunnelers that fail to spawn again. Otherwise, we get into
      // infinite loop situations. for example, when a tunneler that creates a wide tunnel hits the
      // level edge and can't turn or do anything.
      if (!this.isLastChanceTunneler) {
        this._spawnLastChanceTunneler()
      }

      return DEAD
    }

     // if the tunnel has height and width, it was (at least partially)
    // excavated, so add it to the level
    if (t.width && t.height) {
      this.level.addEntity(t)
      this.parentTunnel = t // update the new parent tunnel for dis shiz
    }

    if ([ 'ANTEROOM', 'ROOM', 'TUNNEL', 'DOOR' ].indexOf(state) >= 0) {
      return DEAD
    }

    // update tunneler's position to the end of the excavated tunnel
    // at this point, state must be CLOSED (the tunnel fully excavated without hitting any open space)
    const tunnelEndpos = t.getEndPosition()
    this.x = tunnelEndpos.x
    this.y = tunnelEndpos.y

    // TODO: since the last chance tunneler succeeded (fully excavated,) mark it as no longer a last chance?
    //@isLastChanceTunneler = false

    let changedDirection = false
    let anteroom = null
    this.lastDirection = this.direction
    let babies = []

    changeDir = random.next() * 100
    if (changeDir <= this.changeDirectionProb) {
      this.direction = turn90Random(this.direction)
      changedDirection = true
      babies = this._spawnTunnelers(this.turnDoubleSpawnProb, t)
    } else {
      babies = this._spawnTunnelers(this.straightDoubleSpawnProb, t)
    }

    if (changedDirection || babies.length) {
      const probability = getValue(this.design.anteroomProbability, this.tunnelWidth)
      anteroom = this._spawnAnteroom(probability, t)
    }

    if (anteroom) {
      // move the tunneler to an anteroom exit based on direction and anteroom size
      const newPos = anteroom.getCenteredExit(this.direction)
      this.x = newPos.x
      this.y = newPos.y
      this.level.addEntity(anteroom)

      /*
      * reduce the newly created tunnel's dimensions to not overlap with the new anteroom
      if t.direction is 'EAST'
        amount = Math.ceil(anteroom.width / 2)
        t.width -= amount
      if t.direction is 'WEST'
        amount = Math.ceil(anteroom.width / 2)
        t.x += amount
        t.width -= amount
      if t.direction is 'NORTH'
        amount = Math.ceil(anteroom.height / 2)
        t.height -= amount
        t.y += amount
      if t.direction is 'SOUTH'
        amount = Math.ceil(anteroom.height / 2)
        t.height -= amount
      */
    }

    for (let baby of Array.from(babies)) {
      // if an anteroom was created move the baby tunnelers to the anteroom's
      // exit in the direction of the baby tunnelers future excavation
      if (anteroom) {
        pos = anteroom.getCenteredExit(baby.direction)
        baby.x = pos.x
        baby.y = pos.y
      }
      this.level.workers.push(baby)
    }

    if (changedDirection) {
      pos = this._getNewTunnelerPosition(t, this.tunnelWidth, this.direction)
      this.x = pos.x
      this.y = pos.y
    }

    this._addRoomies(t, changedDirection, anteroom)
    return ALIVE
  }


  _addRoomies(t, changedDirection, anteroom) {
    let r, roomSize
    let roomie_directions = []
    const roomie_positions = []

    if (changedDirection) {
      roomie_directions = this._getUnusedDirections()
    } else {
      roomie_directions = [ turn90(this.lastDirection, 'LEFT'), turn90(this.lastDirection, 'RIGHT') ]
    }

    if (anteroom) {
      roomie_positions.push(anteroom.getCenteredDoor(roomie_directions[0]))
      roomie_positions.push(anteroom.getCenteredDoor(roomie_directions[1]))
    } else {
      roomie_positions.push(t.getExit({ x: this.x, y: this.y }, roomie_directions[0]))
      roomie_positions.push(t.getExit({ x: this.x, y: this.y }, roomie_directions[1]))
    }

    if ((random.next() * 100) < this.makeRoomsLeftProb) {
      roomSize = this._getRoomSizeExcavation(changedDirection)
      r = new Roomie(roomie_positions[0], this.generation, roomie_directions[0], this.level, this.design, roomSize)
      this.level.workers.push(r)
    }

    if ((random.next() * 100) < this.makeRoomsRightProb) {
      roomSize = this._getRoomSizeExcavation(changedDirection)
      r = new Roomie(roomie_positions[1], this.generation, roomie_directions[1], this.level, this.design, roomSize)
      return this.level.workers.push(r)
    }
  }


  // determine room size to excavate
  _getRoomSizeExcavation(branching) {
    let probabilities
    if (branching) {
      probabilities = getValue(this.design.roomSizeProbability.branching, this.tunnelWidth)
    } else {
      probabilities = getValue(this.design.roomSizeProbability.sideways, this.tunnelWidth)
    }

    let summed = 0
    const diceRoll = random.next() * 100
    for (let size in probabilities) {
      const prob = probabilities[size]
      summed += prob
      if (diceRoll < summed) {
        return size
      }
    }
    return null
  }


  _getOppositeDirection(direction) {
    const oppositeDirections = {
      NORTH: 'SOUTH',
      EAST: 'WEST',
      WEST: 'EAST',
      SOUTH: 'NORTH'
    }
    return oppositeDirections[direction]
  }


  _getUnusedDirections() {
    const dirs = {NORTH: true, SOUTH: true, EAST: true, WEST: true}

    // get the opposite direction we last came from.
    // for example if a tunnel direction is EAST, and we
    // want to avoid hitting that tunnel we need to not
    // travel WEST in order to avoid hitting that tunnel.
    let opposite = this._getOppositeDirection(this.direction)
    delete dirs[opposite]

    // TODO: need to revisit this. not sure how @lastDirection is set.
    if (!this.lastDirection) {
      this.lastDirection = this.parentTunnel.direction
    }

    opposite = this._getOppositeDirection(this.lastDirection)
    delete dirs[opposite]

    return Object.keys(dirs)
  }


  _spawnAnteroom(probability, parentTunnel) {
    const diceRoll = random.next() * 100
    if (diceRoll < probability) {
      // determine anteroom center position
      let centerX = this.x
      let centerY = this.y
      const roomRadius = parentTunnel.tunnelWidth + 2
      if (parentTunnel.direction === 'EAST') {
        centerX += roomRadius
      }
      if (parentTunnel.direction === 'WEST') {
        centerX -= roomRadius
      }
      if (parentTunnel.direction === 'NORTH') {
        centerY -= roomRadius
      }
      if (parentTunnel.direction === 'SOUTH') {
        centerY += roomRadius
      }

      const anteroom = new Anteroom(centerX, centerY, parentTunnel.tunnelWidth)
      if (anteroom.isValid(this.level, parentTunnel)) {
        return anteroom
      }
    }

    return null
  }


  _spawnLastChanceTunneler() {
    // get a random direction that isnt @direction or @lastDirection
    const directions = this._getUnusedDirections()
    const randomDirection = directions[Math.floor(random.next() * directions.length)]

    const init = {
      x: this.x,
      y: this.y,
      isLastChanceTunneler: true,
      direction: randomDirection,
      generation: this.generation,
      stepLength: this.stepLength,
      maxSteps: getValue(this.design.tunnelerMaxSteps, this.generation),
      tunnelWidth: this.tunnelWidth,
      parentTunnel: this.parentTunnel
    }

    Object.assign(init, this.design.lastChanceTunneler)

    const t = new Tunneler(this.level, this.design, init)

    return this.level.workers.push(t)
  }


  _spawnTunneler(parentTunnel, direction) {
    let t
    const size = random.next() * 100
    let { tunnelWidth } = this

    // tunnel widths should always be odd and > 0
    if (size < getValue(this.design.babyTunnelers.sizeUpProbability, this.generation+1)) {
      tunnelWidth += 2
    } else if (size < getValue(this.design.babyTunnelers.sizeDownProbability, this.generation+1)) {
      if (tunnelWidth > 2) {
        tunnelWidth -= 2
      }
    }

    // position the tunneler if the tunnel width has changed
    const pos = this._getNewTunnelerPosition(parentTunnel, tunnelWidth, direction)

    const init = {
      x: pos.x,
      y: pos.y,
      direction,
      generation: this.generation + randomIndex(this.design.babyTunnelers.generationBirthProbability),
      stepLength: this.stepLength,
      tunnelWidth,
      straightDoubleSpawnProb: Math.round(mutate(this.straightDoubleSpawnProb, this.design.mutator)),
      turnDoubleSpawnProb: Math.round(mutate(this.turnDoubleSpawnProb, this.design.mutator)),
      changeDirectionProb: Math.round(mutate(this.changeDirectionProb, this.design.mutator)),
      makeRoomsRightProb: Math.round(mutate(this.makeRoomsRightProb, this.design.mutator)),
      makeRoomsLeftProb: Math.round(mutate(this.makeRoomsLeftProb, this.design.mutator)),
      joinProb: getValue(this.design.babyTunnelers.joinProbability, this.generation+1),
      parentTunnel
    }

    init.maxSteps = getValue(this.design.tunnelerMaxSteps, init.generation)

    return t = new Tunneler(this.level, this.design, init)
  }


  _spawnTunnelers(probability, parentTunnel, count) {
    if (count == null) { count = 2 }
    const babies = []
    const directions = this._getUnusedDirections()
    for (let i = 1, end = count, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      const diceRoll = random.next() * 100
      if (diceRoll < probability) {
        const nextDirection = directions.pop()
        babies.push(this._spawnTunneler(parentTunnel, nextDirection))
      }
    }
    return babies
  }


  _isATurn(directionA, directionB) {
    if ((directionA === 'NORTH') || (directionA === 'SOUTH')) {
      if ((directionB === 'NORTH') || (directionB === 'SOUTH')) {
        return false
      }
    }

    if ((directionA === 'EAST') || (directionA === 'WEST')) {
      if ((directionB === 'EAST') || (directionB === 'WEST')) {
        return false
      }
    }

    return true
  }


  // if a tunneler changes directions, calculate the correct starting position
  // that will avoid creating overlap with the previous (parent) tunnel and
  // prevent artifacts at tunnel corners
  _getNewTunnelerPosition(parentTunnel, newTunnelWidth, newTunnelDirection) {
    const pos = {x: this.x, y: this.y}

    // if there's no parent tunnel, no need to change tunneler position
    if (!parentTunnel) { return pos }

    // same travel direction for both tunnels, current position is fine
    if (parentTunnel.direction === newTunnelDirection) {
      // return the position at the edge of the parent tunnel to avoid overlapping with parent
      if (newTunnelDirection === 'SOUTH') {
        pos.y = (parentTunnel.y + parentTunnel.height) - 1
      }
      if (newTunnelDirection === 'NORTH') {
        pos.y = parentTunnel.y
      }
      if (newTunnelDirection === 'EAST') {
        pos.x = (parentTunnel.x + parentTunnel.width) - 1
      }
      if (newTunnelDirection === 'WEST') {
        pos.x = parentTunnel.x
      }
      return pos
    }

    // if traveling east-west or north-south no need to move to the side
    if (this._isATurn(parentTunnel.direction, newTunnelDirection)) {
      const sideDistance = (newTunnelWidth - 1) / 2

      if (sideDistance > 0) {
        if (parentTunnel.direction === 'EAST') {
          pos.x -= sideDistance
        }
        if (parentTunnel.direction === 'WEST') {
          pos.x += sideDistance
        }
        if (parentTunnel.direction === 'NORTH') {
          pos.y += sideDistance
        }
        if (parentTunnel.direction === 'SOUTH') {
          pos.y -= sideDistance
        }
      }
    }

    // in tunnels > 1 unit wide, we need to move the tunneler to the side of the
    // tunnel to avoid overlapping the old tunnel
    const forwardDistance = (parentTunnel.tunnelWidth - 1) / 2

    if (forwardDistance > 0) {
      if (newTunnelDirection === 'NORTH') {
        //pos.y -= forwardDistance
        pos.y = parentTunnel.y
      }
      if (newTunnelDirection === 'SOUTH') {
        //pos.y += forwardDistance
        pos.y = (parentTunnel.y + parentTunnel.height) - 1
      }
      if (newTunnelDirection === 'EAST') {
        //pos.x += forwardDistance
        pos.x = (parentTunnel.x + parentTunnel.width) - 1
      }
      if (newTunnelDirection === 'WEST') {
        //pos.x -= forwardDistance
        pos.x = parentTunnel.x
      }
    }

    // TODO: verify that we didn't backtrack outside of the bounds of the original tunnel
    //       seems unlikely would require a very short old tunnel and/or a very wide new tunnel
    return pos
  }
}
