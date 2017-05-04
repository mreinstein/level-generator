const Door        = require('./door')
const Room        = require('./room')
const randomIndex = require('./random-weighted-index')
const uuid        = require('./uuid')


class Roomie {
  // parent is the tunneler that spawned this roomie
  constructor(doorPosition, parentGeneration, direction, level, design, roomSize) {
    this.doorPosition = doorPosition
    this.direction = direction
    this.level = level
    this.design = design
    this.roomSize = roomSize
    this.generation = parentGeneration + randomIndex(this.design.babyRoomie)
    this.id = uuid()
  }


  step() {
    // only build the room if the level has capacity for more rooms of @roomSize
    if (this.level.roomCount[this.roomSize] >= this.design.maxRooms[this.roomSize]) {
      return false
    }

    const sizeRange = this.design.roomSizes[this.roomSize]
    const minSize = sizeRange[0]
    const maxSize = sizeRange[1]
    let r = this._getLargestBuildableRoom(minSize, maxSize, this.design.roomAspectRatio)
    if (r) {
      const d = new Door({ x: this.doorPosition.x, y: this.doorPosition.y, width: 1, height: 1, direction: this.direction })
      this.level.addEntity(d)
      r = new Room(r)
      this.level.addEntity(r)
      this.level.roomCount[this.roomSize]++
    }
    return false
  }


  // get dimensions of largest room with a door that fits within the size range, matches the
  // aspect ratio, and doesn't overlap existing level
  _getLargestBuildableRoom(minSize, maxSize, roomAspectRatio) {
    // determine the largest room that fits at the given level position
    const largestRoom = this.level.findLargestRoom(this.doorPosition, this.direction, maxSize)

    if (!largestRoom) {
      return null
    }

    if ((largestRoom.width / largestRoom.height) < roomAspectRatio) {
      console.log('couldnt build the room with the given aspect ratio. try use a smaller aspect ratio in the design file')
      return null
    }

    if ((largestRoom.height * largestRoom.width) >= minSize) {
      // we can build the room
      return largestRoom
    }

    // room is too small
    return null
  }
}


module.exports = Roomie
