import * as d3 from 'd3'

const normalizeRotation = (deg) => {
  if (!Number.isFinite(deg)) return 0
  const mod = deg % 360
  return mod < 0 ? mod + 360 : mod
}

export function parseProjectionKey(input = '') {
  const raw = String(input ?? '').trim()
  const [base, variantRaw] = raw.split(':')
  const baseName = base || 'orthographic'
  let variant = variantRaw
  let rotationDeg = null
  if (baseName === 'orthographic') {
    if (!variant) variant = 'rot-0'
    if (variant === 'front') rotationDeg = 0
    else if (variant === 'back') rotationDeg = 180
    else if (/^rot-/.test(variant)) {
      const parsed = parseFloat(variant.replace(/^rot-/, ''))
      rotationDeg = Number.isFinite(parsed) ? parsed : 0
    } else {
      const parsed = parseFloat(variant)
      rotationDeg = Number.isFinite(parsed) ? parsed : 0
    }
    rotationDeg = normalizeRotation(rotationDeg ?? 0)
  } else {
    variant = variant || 'default'
  }
  return { baseName, variant, rotationDeg }
}

function getRotationForVariant(baseName, variant, rotationDeg) {
  if (baseName !== 'orthographic') return [0, 0, 0]
  const lon = rotationDeg ?? (variant === 'back' ? 180 : 0)
  return [lon, 0, 0]
}

export function getProjection(name, width, height) {
  const { baseName, variant, rotationDeg } = parseProjectionKey(name)
  const extent = [[0, 0], [width, height]]
  let projection
  if (baseName === 'orthographic') {
    projection = d3.geoOrthographic()
  } else if (baseName === 'mercator') {
    projection = d3.geoMercator()
  } else if (baseName === 'equalEarth') {
    projection = d3.geoEqualEarth()
  } else {
    projection = d3.geoNaturalEarth1()
  }
  projection.fitExtent(extent, { type: 'Sphere' })
  if (baseName === 'orthographic') {
    projection.scale(projection.scale() * 0.85)
  }
  const rotation = getRotationForVariant(baseName, variant, rotationDeg)
  if (rotation) projection.rotate(rotation)
  const path = d3.geoPath(projection)
  const project = (lonlat) => projection(lonlat)
  project.path = path
  project.projection = projection
  project.meta = { baseName, variant, rotation, rotationDeg }
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
