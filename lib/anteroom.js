class Anteroom {
  constructor(centerX, centerY, tunnelWidth) {
    this.type = 'anteroom'
    this.to = {}

    // TODO: build a large or small anteroom depending on size available (build largest possible)
    //       small: tunnelWidth + 1    large: tunnelWidth + 3

    // determine anteroom size based on tunnel width
    const roomRadius = tunnelWidth + 1
    this.x = centerX - roomRadius
    this.y = centerY - roomRadius

    // anteroom is always odd width/height
    this.width = (roomRadius * 2) + 1
    this.height = (roomRadius * 2) + 1
  }


  // given a direction, return the aabb for the exit centered on that edge where the door would be
  // e.g., getCenteredExitPosition('NORTH') give the x,y position on the top center exit
  getCenteredDoor(direction) {
    const aabb = { width: 1, height: 1 }
    const halfHeight = this.height/2
    const halfWidth = this.width/ 2

    if (direction === 'EAST') {
      aabb.x = this.x + this.width
      aabb.y = Math.floor(this.y + halfHeight)
    } else if (direction === 'WEST') {
      aabb.x = this.x - 1
      aabb.y = Math.floor(this.y + halfHeight)
    } else if (direction === 'NORTH') {
      aabb.x = Math.floor(this.x + halfWidth)
      aabb.y = this.y - 1
    } else {
      aabb.x = Math.floor(this.x + halfWidth)
      aabb.y = this.y + this.height
    }
    return aabb
  }


  // given a direction, return the aabb for the exit centered on that edge
  // e.g., getCenteredExitPosition('NORTH') give the x,y position on the top center exit
  getCenteredExit(direction) {
    const aabb = { width: 1, height: 1 }
    if (direction === 'EAST') {
      aabb.x = (this.x + this.width) - 1
      aabb.y = Math.floor(this.y + (this.height/2))
    } else if (direction === 'WEST') {
      aabb.x = this.x
      aabb.y = Math.floor(this.y + (this.height/2))
    } else if (direction === 'NORTH') {
      aabb.x = Math.floor(this.x + (this.width/2))
      aabb.y = this.y
    } else {
      aabb.x = Math.floor(this.x + (this.width/2))
      aabb.y = (this.y + this.height) - 1
    }
    return aabb
  }


  isValid(level, parentTunnel) {
    if (!level.contains(this)) { return false }

    // anteroom must not overlap with existing level rooms/tunnels/anterooms
    const minRoomSpacing = 1
    const minAnteroomSpacing = 1
    const minTunnelSpacing = 0
    const ignoreEntity = parentTunnel
    if (level.overlaps(this, minRoomSpacing, minAnteroomSpacing, minTunnelSpacing, ignoreEntity)) {
      return false
    }
    return true
  }
}


module.exports = Anteroom
