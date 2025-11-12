export default function drawCities(ctx, cities, project, { r = 2.4, fill = '#ff5722', visible } = {}) {
  const pts = []
  ctx.save()
  cities.forEach(d => {
    let lon, lat
    if (d && d.type === 'Feature') {
      if (d.geometry && d.geometry.type === 'Point' && Array.isArray(d.geometry.coordinates)) {
        lon = d.geometry.coordinates[0]
        lat = d.geometry.coordinates[1]
      }
      if ((lon == null || lat == null) && d.properties) {
        lon = d.properties.longitude ?? d.properties.lon ?? d.properties.lng ?? lon
        lat = d.properties.latitude ?? d.properties.lat ?? lat
      }
    } else {
      lon = d.longitude ?? d.lon ?? d.lng
      lat = d.latitude ?? d.lat
    }
    if (lon == null || lat == null) return
    if (typeof visible === 'function' && !visible([lon, lat], d)) return
    const pt = project([lon, lat])
    if (!pt) return
    const [x, y] = pt
    const color = typeof fill === 'function' ? fill(d) : fill
    ctx.fillStyle = color || '#ff5722'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    pts.push({ x, y, r, data: d })
  })
  ctx.restore()
  return pts
}
