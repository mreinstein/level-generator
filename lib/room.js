export default class Room {
  constructor(init) {
    Object.assign(this, init)
    this.type = 'room'
    this.to = {}
  }


  // determine what edge of the room a door is on
  findExitDirection(door) {
    let direction
    if (door.x >= (this.x + this.width)) {
      direction = 'EAST'
    } else if (door.x <= this.x) {
      direction = 'WEST'
    } else if (door.y <= this.y) {
      direction = 'NORTH'
    } else {
      direction = 'SOUTH'
    }
    return direction
  }


  // returns true if the x,y coordinate lies outside of the room and at one of
  // the 4 corners
  isCornerPoint(x, y) {
    const leftX = this.x - 1
    const rightX = this.x + this.width
    const topY = this.y - 1
    const bottomY = this.y + this.height

    if ((x === leftX) && (y === topY)) {
      return true  // top left
    }
    if ((rightX === x) && (y === topY)) {
      return true  // top right
    }
    if ((leftX === x) && (bottomY === y)) {
      return true // bottom left
    }
    if ((rightX === x) && (bottomY === y)) {
      return true  // bottom right
    }
    return false
  }
}
