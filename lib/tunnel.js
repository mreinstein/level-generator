import Anteroom    from './anteroom.js'
import Door        from './door.js'
import Room        from './room.js'
import expandAABB  from './aabb-expand.js'
import overlaps    from './aabb-overlaps.js'
import removeItems from 'remove-array-items'


export default class Tunnel {
  // we store the parent tunnel that this tunnel was generated from because it
  // will interfere when checking for overlap later if we don't ignore it.
  constructor(level, parentTunnel) {
    this.level = level
    this.parentTunnel = parentTunnel
    this.type = 'tunnel'
    this.to = {}
    this.direction = null
  }


  // returns final excavation state for the tunnel
  // ROOM | TUNNEL | ANTEROOM | DOOR  tunneled into an existing open space
  // CLOSED                    fully excavated tunnel, ending on closed space
  // DUNGEON-OVERLAP           can't excavate; outside the level bounds
  // PREFAB-OVERLAP            can't excavate: overlapping room prefab
  // ROOM-CORNER-OVERLAP       can't excavate: touches a room corner tile
  excavate(startPosition, direction, stepLength, tunnelWidth) {

    this.direction = direction
    this.tunnelWidth = tunnelWidth
    const radius = (this.tunnelWidth - 1) / 2
    if (this.direction === 'EAST') {
      Object.assign(this, { x: startPosition.x+1, y: startPosition.y-radius, width: 0, height: this.tunnelWidth })
    } else if (this.direction === 'WEST') {
      Object.assign(this, { x: startPosition.x, y: startPosition.y-radius, width: 0, height: this.tunnelWidth })
    } else if (this.direction === 'NORTH') {
      Object.assign(this, { x: startPosition.x-radius, y: startPosition.y, width: this.tunnelWidth, height: 0 })
    } else {
      Object.assign(this, { x: startPosition.x-radius, y: startPosition.y+1, width: this.tunnelWidth, height: 0 })
    }

    const minRoomSpacing = 1
    const minAnteroomSpacing = 0
    const minTunnelSpacing = 0
    let step = 0

    const ignore = this.parentTunnel
    while (step < stepLength) {
      const survey = expandAABB(this, this.direction, 1)
      if (!this.level.contains(survey)) {
        return 'DUNGEON-OVERLAP'
      }

      const entity = this.level.overlaps(survey, minRoomSpacing, minAnteroomSpacing, minTunnelSpacing, ignore)

      if (entity) {
        if (entity.prefab) {
          return 'PREFAB-OVERLAP'
        }
        if (entity.type === 'room') {
          // tunnels can't overlap with room corners
          if (this._atRoomCorner(entity)) {
            return 'ROOM-CORNER-OVERLAP'
          }

          // only create a door if the tunnel was excavated at all
          if ((this.width > 0) && (this.height > 0)) {
            var doorPosition = this._getDoorPosition(entity, this.direction)
            if (doorPosition) {
              // prohibit door placement when adjacent to any existing door
              const overlappingDoors = this.level.objects.filter(o => (o.type === 'door') && overlaps(doorPosition, o))
              if (overlappingDoors.length === 0) {
                const d = new Door(doorPosition)

                d.direction = this.direction
                this.level.addEntity(d)
              }
            }
          }
        }

        return entity.type.toUpperCase()
      }

      Object.assign(this, survey)
      step++
    }
    return 'CLOSED'
  }


  // given a direction get the tunnel's end position, where the tunneler would
  // be after excavating
  getEndPosition() {
    const radius = (this.tunnelWidth - 1) / 2
    if (this.direction === 'NORTH') {
      return { x: this.x + radius, y: this.y }
    } else if (this.direction === 'SOUTH') {
      return { x: this.x + radius, y: (this.y + this.height) - 1 }
    } else if (this.direction === 'EAST') {
      return { x: (this.x + this.width) - 1, y: this.y + radius }
    } else if (this.direction === 'WEST') {
      return { x: this.x, y: this.y + radius }
    }
    return null
  }


  // given a position in the tunnel and a direction, provide the position at the
  // edge of the tunnel
  getExit(position, direction) {
    const pos = {x: position.x, y: position.y}
    if (direction === 'NORTH') {
      pos.y = this.y - 1
    } else if (direction === 'SOUTH') {
      pos.y = this.y + this.height
    } else if (direction === 'WEST') {
      pos.x = this.x - 1
    } else {
      pos.x = this.x + this.width
    }
    return pos
  }


  // returns true if any of the tunnel corners touch any room corners
  _atRoomCorner(room) {
    if (room.isCornerPoint(this.x, this.y)) {
      return true
    }
    if (room.isCornerPoint((this.x+this.width)-1, this.y)) {
      return true
    }
    if (room.isCornerPoint(this.x, (this.y+this.height)-1)) {
      return true
    }
    if (room.isCornerPoint((this.x+this.width)-1, (this.y+this.height)-1)) {
      return true
    }
    return false
  }


  // find all 1 unit squares along a tunnel's edge (useful for door placement)
  _findSquares(tunnelDirection) {
    let x, y
    const result = []
    if (tunnelDirection === 'NORTH') {
      for (({ x } = this), end = (this.x+this.tunnelWidth)-1, asc = this.x <= end; asc ? x <= end : x >= end; asc ? x++ : x--) {
        var asc, end
      result.push({ x, y: this.y-1, width: 1, height: 1 }) }
    } else if (tunnelDirection === 'SOUTH') {
      for (({ x } = this), end1 = (this.x+this.tunnelWidth)-1, asc1 = this.x <= end1; asc1 ? x <= end1 : x >= end1; asc1 ? x++ : x--) { var asc1, end1;
      result.push({ x, y: this.y+this.height, width: 1, height: 1 }) }
    } else if (tunnelDirection === 'EAST') {
      for (({ y } = this), end2 = (this.y+this.tunnelWidth)-1, asc2 = this.y <= end2; asc2 ? y <= end2 : y >= end2; asc2 ? y++ : y--) { var asc2, end2;
      result.push({x: this.x+this.width, y, width: 1, height: 1 }) }
    } else {
      for (({ y } = this), end3 = (this.y+this.tunnelWidth)-1, asc3 = this.y <= end3; asc3 ? y <= end3 : y >= end3; asc3 ? y++ : y--) { var asc3, end3;
      result.push({x: this.x-1, y, width: 1, height: 1 }) }
    }
    return result
  }


  // find the location near the tunnelEndpoint to build the room door. (ideally centered in tunnel)
  _getDoorPosition(room, tunnelDirection) {
    // find all squares along the tunnel edge to potentially place a door at
    const squares = this._findSquares(tunnelDirection)

    // prefer to center the door in tunnel if possible, so move the square that
    // represents tunnel center point to the front of the list to check
    const centerIdx = Math.floor(this.tunnelWidth/2)
    const center = squares[centerIdx]
    removeItems(squares, centerIdx, 1)
    squares.unshift(center)

    for (let square of Array.from(squares)) {
      const doorTouchesRoom = overlaps(room, square)
      if (doorTouchesRoom && (!room.isCornerPoint(square.x, square.y))) {
        square.width = 1
        square.height = 1
        return square
      }
    }
    return null
  }
}
