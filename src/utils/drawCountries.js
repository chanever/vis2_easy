export default function drawCountries(ctx, features, project, { stroke = '#ccc', fillFn = null }) {
  const paths = []
  ctx.save()
  ctx.lineWidth = 0.6
  ctx.strokeStyle = stroke
  const pathGen = project.path
  features.forEach((f, i) => {
    let p2
    if (pathGen) {
      const d = pathGen(f)
      if (!d) return
      p2 = new Path2D(d)
    } else {
      p2 = new Path2D()
      const geom = f.geometry
      const drawPoly = (poly) => {
        poly.forEach((ring) => {
          ring.forEach((coord, idx) => {
            const pt = project(coord)
            if (!pt) return
            const [x, y] = pt
            if (idx === 0) p2.moveTo(x, y)
            else p2.lineTo(x, y)
          })
          p2.closePath()
        })
      }
      if (geom.type === 'Polygon') drawPoly(geom.coordinates)
      if (geom.type === 'MultiPolygon') geom.coordinates.forEach(drawPoly)
    }
    ctx.stroke(p2)
    if (fillFn) {
      ctx.fillStyle = fillFn(f, i)
      ctx.globalAlpha = 0.15
      ctx.fill(p2)
      ctx.globalAlpha = 1
    }
    paths.push({ path: p2, feature: f })
  })
  ctx.restore()
  return paths
}

