export default function drawCountries(ctx, features, project, { stroke = '#ccc', fillByLat = null }) {
  const paths = []
  ctx.save()
  ctx.lineWidth = 0.6
  ctx.strokeStyle = stroke
  features.forEach(f => {
    const p2 = new Path2D()
    const geom = f.geometry
    const drawPoly = (poly) => {
      poly.forEach((ring, ri) => {
        ring.forEach((coord, i) => {
          const [x, y] = project(coord)
          if (i === 0) p2.moveTo(x, y)
          else p2.lineTo(x, y)
        })
        p2.closePath()
      })
    }
    if (geom.type === 'Polygon') drawPoly(geom.coordinates)
    if (geom.type === 'MultiPolygon') geom.coordinates.forEach(drawPoly)
    ctx.stroke(p2)
    if (fillByLat) {
      ctx.fillStyle = fillByLat(f)
      ctx.globalAlpha = 0.15
      ctx.fill(p2)
      ctx.globalAlpha = 1
    }
    paths.push({ path: p2, feature: f })
  })
  ctx.restore()
  return paths
}

