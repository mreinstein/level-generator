import Generator from '../index.js'


async function main () {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')
  let ratio = window.devicePixelRatio || 1

  const w = 2000 // level.design.dimensions.width
  const h = 2000 // level.design.dimensions.height
  const scale = 3

  canvas.width = w * ratio * scale
  canvas.height = h * ratio * scale

  canvas.style.width = w * scale + 'px'
  canvas.style.height = h * scale + 'px'

  ctx.scale(scale, scale)

  const level = new Generator()

  level.build()

  console.log('complete!', level)

  render(level, ctx)

  canvas.addEventListener('mousedown', function (ev) {
    ratio = window.devicePixelRatio || 1
    const x = Math.floor(ev.layerX / scale * ratio)
    const y = Math.floor(ev.layerY / scale * ratio)

    // find all items under the clicked x,y position
    level.objects.forEach(function (entity) {
      if (x >= entity.x && x <= (entity.x + entity.width - 1)) {
        if (y >= entity.y && y <= (entity.y + entity.height - 1))
          console.log('hit:', entity)
      }
    })
  })
}


function render (dungeon, ctx) {
  let i, len, o
  ctx.clearRect(0, 0, 3000, 3000)
  const ref = dungeon.objects
  const results = []
  for (i = 0, len = ref.length; i < len; i++) {
    o = ref[i]
    if (o.type === 'door') {
      if (!o.KEEP) {
        ctx.fillStyle = '#0F0'
      } else {
        ctx.fillStyle = '#f00'
      }
      //ctx.fillStyle = 'rgba(255,0,0, 0.3)'
    } else if (o.type === 'room') {
      if (o.prefab) {
        ctx.fillStyle = '#f2ce3d'
      } else {
        //ctx.fillStyle = 'rgba(255,255,255, 0.3)'
        ctx.fillStyle = '#fff'
      }
    } else if (o.type === 'anteroom') {
      if (o.KEEP) {
        ctx.fillStyle = 'rgba(0,160,245, 0.9)'
      } else {
        ctx.fillStyle = 'rgba(255,0,245, 0.9)'
      }
    } else if (o.type === 'tunnel') {
      if (o.KEEP) {
        ctx.fillStyle = 'rgba(0,160,245, 0.9)'
      } else {
        ctx.fillStyle = 'rgba(255,0,245, 0.9)'
      }
    }
    results.push(ctx.fillRect(o.x, o.y, o.width, o.height))
  }
  return results
}


main()
