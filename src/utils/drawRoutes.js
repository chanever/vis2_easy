export default function drawRoutes(ctx, features, project, { stroke = '#1e88e5', width = 1.2 } = {}) {
  const paths = []
  ctx.save()
  ctx.strokeStyle = stroke
  ctx.lineWidth = width
  const pathGen = project.path
  features.forEach(f => {
    let p2
    if (pathGen) {
      const d = pathGen(f)
      if (!d) return
      p2 = new Path2D(d)
    } else {
      p2 = new Path2D()
      const geom = f.geometry
      const drawLine = (line) => {
        line.forEach((coord, i) => {
          const pt = project(coord)
          if (!pt) return
          const [x, y] = pt
          if (i === 0) p2.moveTo(x, y)
          else p2.lineTo(x, y)
        })
      }
      if (geom.type === 'LineString') drawLine(geom.coordinates)
      if (geom.type === 'MultiLineString') geom.coordinates.forEach(drawLine)
    }
    ctx.stroke(p2)
    paths.push({ path: p2, feature: f })
  })
  ctx.restore()
  return paths
}
