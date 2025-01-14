import Anteroom      from './lib/anteroom.js'
import Door          from './lib/door.js'
import QuadTree      from './lib/qtree.js'
import Room          from './lib/room.js'
import Roomie        from './lib/roomie.js'
import Tunneler      from './lib/tunneler.js'
import buildGraph    from './lib/build-graph.js'
import constants     from './lib/constants.js'
import designDefault from './lib/design-default.js'
import expandAABB    from './lib/aabb-expand.js'
import getPortal     from './lib/aabb-portal.js'
import intersect1D   from './lib/1d-intersect.js'
import intersectAABB from './lib/aabb-intersect.js'
import levelFurnish  from './lib/level-furnish/index.js'
import moveAABB      from './lib/aabb-move.js'
import overlaps      from './lib/aabb-overlaps.js'
import * as random   from './lib/random.js'
import removeItems   from 'remove-array-items'
import turn90        from './lib/turn-90.js'
//import zeros         from 'zeros'


// global constants
const ENTITIES = [ 'tunnels', 'rooms', 'anterooms', 'doors' ]


export default class LevelGenerator {
  constructor(machines, design, seedValue, theme) {
    let t
    if (design === null)
      design = designDefault

    if (seedValue === null)
      seedValue = null

    this.machines = machines
    this.theme = theme
    this.design = JSON.parse(JSON.stringify(design))
    this.objects = []
    this.workers = []
    this.generation = 0

    // stores references to items, which speeds up AABB overlap checks
    this.qtree = new QuadTree(0, 0, this.design.dimensions.width, this.design.dimensions.height)

    // if present, use the design file's seed for reproducible random numbers
    random.seed(seedValue || this.design.randSeed)

    // build a tunneler for each one specified in the design
    for (var init of Array.from(this.design.tunnelers)) {
      t = new Tunneler(this, this.design, init)
      this.workers.push(t)
    }

    // add predefined rooms to the level from the design
    for (let roomInit of Array.from(this.design.rooms)) {
      const r = new Room(roomInit)
      r.prefab = true // flag room as prefab to prevent tunneling into it later
      this.addEntity(r)

      // put a tunneler at every prefab room door facing the exit
      for (let door of Array.from(r.doors)) {
        const d = new Door(door)
        this.addEntity(d)
        init = JSON.parse(JSON.stringify(this.design.roomExitTunneler))
        init.x = door.x
        init.y = door.y
        init.direction = r.findExitDirection(door)
        d.direction = init.direction
        t = new Tunneler(this, this.design, init)
        this.workers.push(t)
      }

      // rooms don't contain doors, so remove them
      delete r.doors
    }

    this.roomCount = {small: 0, medium: 0, large: 0}
  }


  addEntity(entity) {
    entity.id = this.objects.length
    this.objects.push(entity)
    return this.qtree.put(entity)
  }


  build() {
    let built = false
    while (!built) {
      let entities = this.workers.filter(o => o.generation === this.generation)
      for (let e of Array.from(entities)) {
        if (!e.step()) {
          this._removeWorker(e.id)
        }
      }

      // when there are no roomies/tunnelers in the current generation, advance
      entities = this.workers.filter(o => o.generation === this.generation)
      if (entities.length === 0) {
        this.generation++
      }

      if (this.workers.length === 0) {
        built = true
      }

      setTimeout(
        function() {},
        0
      )
    }

    return this._postBuildStep()
  }


  // determine if an AABB is fully inside the level dimensions
  contains(aabb) {
    const minPadding = 1 // ensure there is a 1 unit border around the level edge
    if ((aabb.x < minPadding) || (aabb.y < minPadding)) {
      return false
    }
    if (((aabb.x + aabb.width) > (this.design.dimensions.width - minPadding)) ||
    ((aabb.y + aabb.height) > (this.design.dimensions.height - minPadding))) {
      return false
    }
    return true
  }


  // determine the largest room that fits at the given level position
  findLargestRoom(doorPosition, direction, maxSize) {
    const leftDirection = turn90(direction, 'LEFT')
    const rightDirection = turn90(direction, 'RIGHT')

    const directionVectors = {
      forward: direction,
      left: leftDirection,
      right: rightDirection
    }

    const expand = {forward: true, left: true, right: true}

    // move to the first position in the room (right in front of the door)
    let result = { x: doorPosition.x, y: doorPosition.y, width: 1, height: 1 }
    moveAABB(result, directionVectors.forward)

    // Grow in all directions from the door. When overlapping or adjacent to an
    // object, stop growing in that direction. When growing stops in all
    // directions, we've found the largest room that fits in this area.
    const minTunnelSpacing = 1
    const minAnteroomSpacing = 1

    while (expand.left || expand.right || expand.forward) {
      for (let dir in expand) {
        const exp = expand[dir]
        if (exp) {
          const cardinalDirection = directionVectors[dir]
          const test = expandAABB(result, cardinalDirection)
          if ((test.width * test.height) > maxSize) {
            return result
          }

          // ensure room aspect ratio are within acceptable limits
          if ((test.width / test.height) < this.design.roomAspectRatio) {
            return result
          }
          if ((test.height / test.width) < this.design.roomAspectRatio) {
            return result
          }

          if (!this.contains(test)) {
            // expanded outside of level dimensions, reject this expansion
            expand[dir] = false
          } else {
            if (this.overlaps(test, this.design.minRoomSpacing, minAnteroomSpacing, minTunnelSpacing)) {
              expand[dir] = false
            } else {
              result = test
            }
          }
        }
      }
    }
    return result
  }


  // determine if an entity's AABB overlaps any existing level items
  overlaps(aabb, minRoomSpace, minAnteroomSpace, minTunnelSpace, ignoreEntity) {
    if (ignoreEntity == null) { ignoreEntity = null }
    const spacing = {
      room: minRoomSpace,
      anteroom: minAnteroomSpace,
      tunnel: minTunnelSpace,
      door: 0
    }

    const toCheck = this.qtree.get(aabb)

    for (let item of Array.from(toCheck)) {
      const minSpacing = spacing[item.type]
      if ((ignoreEntity != null ? ignoreEntity.id : undefined) !== item.id) {
        if (overlaps(aabb, item, minSpacing)) {
          return item
        }
      }
    }

    return null
  }


  // given 2 level rooms, determine a random space between them to place a valid door.
  // returns null if door can't be placed
  _getAdjacentRoomDoorPosition(room, next) {
    // check if rooms are lined up on x axis ( side by side with 1 space between)
    let intersection, length, x, y
    if (((room.x+room.width) === (next.x - 1))  ||  ((room.x) === (next.x + next.width + 1))) {
      intersection = intersect1D(room.y, room.y+room.height, next.y, next.y+next.height)
      if (!intersection) { return null }

      length = (intersection[1] - intersection[0])
      y = intersection[0] + Math.round(random.next() * length)
      if ((room.x+room.width) === (next.x - 1)) {
        x = room.x+room.width
      } else {
        x = next.x + next.width
      }
      // TODO: ensure the space isnt occupied with anything
      return { x, y, direction: 'EAST' }
    }

    // check if rooms are lined up on y axis ( on top of each other with 1 space between)
    if (((room.y+room.height) === (next.y - 1))  ||  ((room.y) === (next.y + next.height + 1))) {
      intersection = intersect1D(room.x, room.x+room.width, next.x, next.x+next.width)
      if (!intersection) { return null }

      length = (intersection[1] - intersection[0])
      x = intersection[0] + Math.round(random.next() * length)

      if ((room.y+room.height) === (next.y - 1)) {
        y = room.y+room.height
      } else {
        y = next.y + next.height
      }
      // TODO: ensure the space isnt occupied with anything
      return { x, y, direction: 'NORTH' }
    }
    return null
  }


  // get list of all adjacent but unconnected rooms
  _getAdjacentRooms(room) {
    const results = []
    if (room.prefab) {
      // don't connect from prefab rooms
      return results
    }

    const rooms = this.objects.filter(o => o.type === 'room')

    for (let next of Array.from(rooms)) {
      // don't connect to prefab rooms
      if (!next.prefab) {
        if (next.id !== room.id) {
          if (!this._roomsAreConnected(room, next)) {
            const doorPosition = this._getAdjacentRoomDoorPosition(room, next)
            if (doorPosition) {
              results.push({room: next, doorPosition })
            }
          }
        }
      }
    }
    return results
  }


  _roomsAreConnected(room, next) {
    for (let id in room.to) {
      const item = room.to[id]
      if ((item.entity.type === 'door') && item.entity.to[next.id]) {
        return true
      }
    }
    return false
  }


  _connectRoomsRandomly() {
    let adjacentRooms
    const rooms = this.objects.filter(o => o.type === 'room')
    return Array.from(rooms).map((room) =>
      // get all adjacent but unconnected rooms
      ((adjacentRooms = this._getAdjacentRooms(room)),
      (() => {
        const result = []
        for (let next of Array.from(adjacentRooms)) {
        // link some adjacent rooms
          let item
          const diceRoll = random.next()
          if (diceRoll <= this.design.roomConnectionProbability) {
            const d = new Door({ x: next.doorPosition.x, y: next.doorPosition.y, width: 1, height: 1, direction: next.doorPosition.direction })
            d.KEEP = true
            this.addEntity(d)

            // link the door to the 2 rooms

            let portal = getPortal(d, room)
            d.to[room.id] = {entity: room, portal}
            room.to[d.id] = {entity: d, portal}

            portal = getPortal(d, next.room)
            d.to[next.room.id] = {entity: next.room, portal}
            item = next.room.to[d.id] = {entity: d, portal}
          }
          result.push(item)
        }
        return result
      })()))
  }


  // determine if there's a path between 2 level entities
  _isConnected(src, dest) {
    const visited = {}
    const toVisit = [ src ]

    while (toVisit.length) {
      const next = toVisit.pop()
      if (next.id === dest.id) {
        return true
      }
      if (!visited[next.id]) {
        visited[next.id] = true
        for (let id in next.to) { const child = next.to[id]; toVisit.push(child.entity) }
      }
    }

    return false
  }


  // determine if all prefabs are reachable from each other
  _isFullyConnected() {
    const prefabs = []
    const rooms = this.objects.filter(o => o.type === 'room')
    for (let room of Array.from(rooms)) {
      if (room.prefab) {
        prefabs.push(room)
      }
    }

    if (!(prefabs.length > 1)) { return true }

    for (let prefabA of Array.from(prefabs)) {
      for (let prefabB of Array.from(prefabs)) {
        if (prefabA.id > prefabB.id) {
          if (!this._isConnected(prefabA, prefabB)) {
            return false
          }
        }
      }
    }
    return true
  }


  _getEntranceAndExitRooms() {
    const rooms = this.objects.filter(o => o.type === 'room')
    if (rooms.length === 0) {
      return null
    }

    if (rooms.length === 1) {
      return [rooms[0], rooms[0]]
    }

    const entranceIndex = Math.floor(random.next() * rooms.length)
    while (true) {
      const exitIndex = Math.floor(random.next() * rooms.length)
      if (exitIndex !== entranceIndex) {
        return [ rooms[entranceIndex], rooms[exitIndex] ]
      }
    }

    return null
  }


  _getLevelMetrics(aabbs, levelWidth, levelHeight) {
    /*
    * cave related metric. not useful at the moment.
    * number of items directly connected to, and how many it's neighbors are connected to
    for obj in @objects
      obj.caveConnectedness = Object.keys(obj.to).length
      for id, child of obj.to
        obj.caveConnectedness += Object.keys(child.to).length
    */


    // tunneling generated levels are highly connected. rate all rooms by
    // seclusion: the distance from the fastest path the player can take between
    // an entrance and the exit(s)

    // TODO: use BFS to find the fastest path between any 2 entrance/exit pairs.

    const totalArea = levelWidth * levelHeight

    let maxSeclusion = 0
    let totalSeclusion = 0
    const rooms = this.objects.filter(o => o.type === 'room')
    for (let room of Array.from(rooms)) {
      room.seclusionFactor = 0 // TODO: pathfind from the room entrance to the closest point on any of the egress paths
      totalSeclusion += room.seclusionFactor
      maxSeclusion = Math.max(maxSeclusion, room.seclusionFactor)
    }

    const metrics = {
      seclusion: {
        average: totalSeclusion / (rooms.length || 1),
        max: maxSeclusion
      },
      playableSpace: 0, // ratio. 0 means fully closed, 1 is fully open
      goalDistance:  0, // distance from entrance to exit (e.g., 7 entities between entrance and exit)
      composition: {     // histogram of cell values
        CLOSED: totalArea,
        DOOR: 0,
        ROOM: 0,
        ROOM_PREFAB: 0,
        TUNNEL: 0,
        ANTEROOM: 0
      }
    }

    for (let obj of Array.from(aabbs)) {
      let area = obj.width * obj.height
      if (obj.type === 'door') {
        metrics.composition.DOOR += area
      } else if (obj.type === 'anteroom') {
        metrics.composition.ANTEROOM += area
      } else if (obj.prefab) {
        metrics.composition.ROOM_PREFAB += area
      } else if (obj.type === 'room') {
        metrics.composition.ROOM += area
      } else if (obj.type === 'tunnel') {
        metrics.composition.TUNNEL += area
      } else {
        area = 0
      }

      metrics.composition.CLOSED -= area
    }

    metrics.playableSpace = (totalArea - metrics.composition.CLOSED) / totalArea
    return metrics
  }


  _postBuildStep() {
    // generate a graph from all of the level objects
    buildGraph(this.objects)

    if (!this._isFullyConnected()) {
      console.log('rejected level, not fully connected')
      return null
    }

    this._removeRedundantTunnelLoops()

    const metrics = this._getLevelMetrics(this.objects, this.design.dimensions.width, this.design.dimensions.height)
    console.log('playable space:', metrics.playableSpace, ' m', metrics)

    const r = (metrics.composition.ROOM + metrics.composition.ROOM_PREFAB) / (metrics.composition.TUNNEL + metrics.composition.ANTEROOM)

    console.log('room:tunnel ratio', r)
    if (r < 1.1) {
      console.log('rejected level, room:tunnel ratio too low')
      return null
    }

    this._connectRoomsRandomly()

    //r = @_getEntranceAndExitRooms()
    //if r
    //  console.log 'start room:', r[0]
    //  console.log 'end room:', r[1]

    // TODO: combine compatible tunnels (same direction, tunnelWidth, and position)
    //@_mergeTunnels()

    this._compactEntities()

    const TILE_SIZE = 32
    return this._makeLevel(TILE_SIZE)
  }


  _makeLevel(TILE_SIZE) {
    let next
    const level = {
      cells: this._buildGrid(),
      objects: [],
      cols: this.design.dimensions.width,
      rows: this.design.dimensions.height
    }

    // convert portal coordinates from tiles to pixels
    for (let obj of Array.from(this.objects)) {
      for (let id in obj.to) {
        next = obj.to[id]
        if (!next.portal.converted) {

          next.portal.converted = true
          next.portal[0].x *= TILE_SIZE
          next.portal[0].y *= TILE_SIZE
          next.portal[1].x *= TILE_SIZE
          next.portal[1].y *= TILE_SIZE
        }
      }
    }

    // convert doors to level objects
    const doors = this.objects.filter(o => o.type === 'door')

    for (let door of Array.from(doors)) {
      next = {
        type: 'door',
        properties: {
          x: door.x * TILE_SIZE,
          y: door.y * TILE_SIZE,
          doorSpeed: 0.3
        }
      }

      if ((door.direction === 'NORTH') || (door.direction === 'SOUTH')) {
        next.properties.direction = 'EAST-WEST'
        next.properties.width = TILE_SIZE
        next.properties.height = TILE_SIZE / 4
      } else {
        next.properties.direction = 'NORTH-SOUTH'
        next.properties.width = TILE_SIZE / 4
        next.properties.height = TILE_SIZE
      }

      level.objects.push(next)
    }

    const machines = levelFurnish(this.machines, this.objects, this.theme)

    // convert machines from tiles to pixels and add to the level objects
    for (let machine of Array.from(machines)) {
      machine.type = 'machine'
      machine.x *= TILE_SIZE
      machine.y *= TILE_SIZE
      machine.width *= TILE_SIZE
      machine.height *= TILE_SIZE
      level.objects.push(machine)
    }

    const startRoom = this.objects.find(o => o.type === 'room')

    const playerSpawn = {
      type: 'player-spawn',
      x: startRoom.x + 1,
      y: startRoom.y + 1
    }

    playerSpawn.x *= TILE_SIZE
    playerSpawn.y *= TILE_SIZE

    level.objects.push(playerSpawn)

    return level
  }


  _removeWorker(id) {
    let idx = 0
    for (let worker of Array.from(this.workers)) {
      if (worker.id === id) {
        removeItems(this.workers, idx, 1)
        return
      }
      idx++
    }
  }


  // find path from start to end
  // returns the length of the path
  findPath(start, end, path) {
    let pathLength = 0

    const frontier = [ start ]
    // TODO: store portals in came_from
    const came_from = {}
    came_from[start.id] = start.id
    while (frontier.length) {
      let current = frontier.shift()
      if (current.id === end.id) {
        // record the path
        current = end
        while (current !== start.id) {
          //path[pathLength] = x
          //path[pathLength+] = y
          current = came_from[current.id]
          pathLength += 2
        }

        return
      }
      for (let id in current.to) {
        const next = current.to[id]
        if (came_from[id] === undefined) {
          frontier.push(next)
          came_from[id] = current
        }
      }
    }

    return pathLength
  }


  _markRoomPath(start, end, came_from) {
    let current = end
    return (() => {
      const result = []
      while (current !== start.id) {
        current.KEEP = true
        result.push(current = came_from[current.id])
      }
      return result
    })()
  }


  _markAllRoomPaths(start) {
    const frontier = [ start ]
    const came_from = {}
    came_from[start.id] = start.id

    return (() => {
      const result = []
      while (frontier.length) {
        var current = frontier.shift()
        if ((current.id !== start.id) && (current.type === 'room')) {
          this._markRoomPath(start, current, came_from)
        }

        result.push((() => {
          const result1 = []
          for (let id in current.to) {
            const next = current.to[id]
            let item
            if (came_from[id] === undefined) {
              frontier.push(next.entity)
              item = came_from[id] = current
            }
            result1.push(item)
          }
          return result1
        })())
      }
      return result
    })()
  }


  _removeEntity(entity) {
    let idx = this.objects.length - 1
    while (idx >= 0) {
      let { id } = this.objects[idx]
      if (entity.id === id) {
        // remove all references to this entity
        for (id in this.objects[idx].to) {
          const neighbor = this.objects[idx].to[id]
          delete neighbor.entity.to[entity.id]
        }

        // remove the entity itself
        removeItems(this.objects, idx, 1)
        return
      }
      idx--
    }
  }


  _removeRedundantTunnelLoops() {
    const rooms = this.objects.filter(o => o.type === 'room')
    for (let room of Array.from(rooms)) { this._markAllRoomPaths(room) }

    // consider applying some heuristic, like allowing only X optional
    // tunnels in one area, etc.

    let idx = this.objects.length - 1
    return (() => {
      const result = []
      while (idx >= 0) {
        const obj = this.objects[idx]
        if (!obj.KEEP) {
          this._removeEntity(obj)
        }
        result.push(idx--)
      }
      return result
    })()
  }


  _compactEntities() {
    // since the level is represented with a 2d grid, minify level dimensions to
    // reduce the number of cells/memory needed

    // scan all entities, findining minimum (x,y) encountered
    let dx, dy
    let minX = null
    let minY = null
    for (var obj of Array.from(this.objects)) {
      if ((minX === null) || (obj.x < minX)) {
        minX = obj.x
      }

      if ((minY === null) || (obj.y < minY)) {
        minY = obj.y
      }
    }

    if (minX > 1) {
      dx = -(minX - 1)
    } else {
      dx = 0
    }

    if (minY > 1) {
      dy = -(minY - 1)
    } else {
      dy = 0
    }

    if (!dx && !dy) { return }

    // shift all entities by dx, dy
    return (() => {
      const result = []
      for (obj of Array.from(this.objects)) {
        obj.x += dx
        result.push(obj.y += dy)
      }
      return result
    })()
  }


  // TODO: rewrite this as a breadth-first graph traversal. I suspect this will
  // be shorter and faster
  // combine compatible tunnels (same direction, tunnelWidth, and position)
  _mergeTunnels() {
    const deleted = {}

    for (let obj of Array.from(this.objects)) {
      for (let obj2 of Array.from(this.objects)) {
        if (!(deleted[obj2.id] || deleted[obj.id])) {
          if (obj.id > obj2.id) {
            if ((obj.type === 'tunnel') && (obj2.type === 'tunnel')) {

              var max, min, width
              if (((obj.direction === 'EAST') || (obj.direction === 'WEST')) && ((obj2.direction === 'EAST') || (obj2.direction === 'WEST'))) {
                if ((obj.y === obj2.y) && (obj.height === obj2.height)) {
                  if (intersect1D(obj.x, obj.x + obj.width, obj2.x, obj2.x + obj2.width)) {
                    // they overlap, take the min/max extents
                    min = Math.min(obj.x, obj2.x)
                    max = Math.max(obj.x + obj.width, obj2.x + obj2.width)

                    width = (max - min) + 1
                    obj.x = min
                    obj.width = width

                    // TODO: connect all of obj2's neighbors to obj
                    deleted[obj2.id] = true  // mark object 2 as removed
                  }
                }
              }

              if (((obj.direction === 'NORTH') || (obj.direction === 'SOUTH')) && ((obj2.direction === 'NORTH') || (obj2.direction === 'SOUTH'))) {
                if ((obj.x === obj2.x) && (obj.width === obj2.width)) {
                  if (intersect1D(obj.y, obj.y + obj.height, obj2.y, obj2.y + obj2.height)) {
                    // they overlap, take the min/max extents
                    min = Math.min(obj.y, obj2.y)
                    max = Math.max(obj.y + obj.height, obj2.y + obj2.height)

                    const height = (max - min) + 1
                    obj.y = min
                    obj.height = height

                    // TODO: connect all of obj2's neighbors to obj

                    deleted[obj2.id] = true  // mark object 2 as removed
                  }
                }
              }
            }
          }
        }
      }
    }

    // remove all the tunnels marked for deletion
    let idx = this.objects.length - 1
    return (() => {
      const result = []
      while (idx >= 0) {
        const { id } = this.objects[idx]
        if (deleted[id]) {
          this._removeEntity(this.objects[idx])
        }
        result.push(idx--)
      }
      return result
    })()
  }


  // convert AABBs to grid, setting id of each item in cell.
  _buildGrid() {
    //grid = zeros [ @design.dimensions.width, @design.dimensions.height ]
    const grid = []

    // start with assuming all spaces are filled
    for (let i = 0, end = (this.design.dimensions.width*this.design.dimensions.height)-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      grid.push(1)
    }


    // hollow out all entities (rooms, anteroom, tunnels, etc.)
    for (let obj of Array.from(this.objects)) {
      //if obj.type isnt 'door'
      for (let row = obj.y, end1 = (obj.y+obj.height)-1, asc1 = obj.y <= end1; asc1 ? row <= end1 : row >= end1; asc1 ? row++ : row--) {
        for (let col = obj.x, end2 = (obj.x+obj.width)-1, asc2 = obj.x <= end2; asc2 ? col <= end2 : col >= end2; asc2 ? col++ : col--) {
          const idx = (row * this.design.dimensions.width) + col
          //grid.set row, col, 0
          grid[idx] = 0
        }
      }
    }

    return grid
  }
}
