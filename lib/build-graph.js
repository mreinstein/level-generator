import getPortal from './aabb-portal.js'


// build graph of connected room doors, anterooms, and tunnels
export default function buildGraph (objects) {
  // create all of the connection data structures
  for (var obj of Array.from(objects)) {
    obj.to = {}
  }

  return (() => {
    const result = []
    for (obj of Array.from(objects)) {
      result.push(objects.forEach(function(entity, idx) {
        if (entity.id !== obj.id) {
          const portal = getPortal(obj, entity)
          if (portal) {
            obj.to[entity.id] = {entity, portal}
            return entity.to[obj.id] = {entity: obj, portal}
          }
        }
      }))
    }
    return result
  })()
}
