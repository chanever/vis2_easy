import * as d3 from 'd3'

export function getProjection(name, width, height) {
  const extent = [[0, 0], [width, height]]
  let projection
  if (name === 'orthographic') {
    projection = d3.geoOrthographic()
  } else if (name === 'mercator') {
    projection = d3.geoMercator()
  } else if (name === 'equalEarth') {
    projection = d3.geoEqualEarth()
  } else {
    projection = d3.geoNaturalEarth1()
  }
  projection.fitExtent(extent, { type: 'Sphere' })
  const path = d3.geoPath(projection)
  const project = (lonlat) => projection(lonlat)
  project.path = path
  project.projection = projection
  return project
}

export function avgLatitude(feature) {
  let sum = 0, cnt = 0
  const coordsByType = (geom) => {
    if (!geom) return []
    const { type, coordinates } = geom
    if (type === 'Polygon') return coordinates
    if (type === 'MultiPolygon') return coordinates.flat()
    return []
  }
  const polys = coordsByType(feature.geometry)
  polys.forEach(poly => {
    poly.forEach(([lon, lat]) => { sum += lat; cnt += 1 })
  })
  return cnt ? (sum / cnt) : 0
}

export function distortionColorByLatitude(lat) {
  // Approximate Mercator area exaggeration grows with |lat|
  const rad = Math.abs((lat * Math.PI) / 180)
  const clamped = Math.min(Math.PI / 2 - 0.0001, Math.max(0.0001, rad))
  const factor = Math.min(3, 1 / Math.cos(clamped))
  // Map factor in [1..3] to 0..1
  const t = (factor - 1) / 2
  const r = Math.round(255 * t)
  const b = Math.round(255 * (1 - t))
  return 'rgb(' + r + ', 160, ' + b + ')'
}
