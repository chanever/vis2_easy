export default function drawCities(ctx, cities, project, { r = 2.2, fill = '#ff5722' } = {}) {
  const pts = []
  ctx.save()
  ctx.fillStyle = fill
  cities.forEach(d => {
    const [x, y] = project([d.longitude || d.lon || d.lng, d.latitude || d.lat])
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    pts.push({ x, y, r, data: d })
  })
  ctx.restore()
  return pts
}

