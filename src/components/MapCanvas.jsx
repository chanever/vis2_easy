import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import useProjectionTransition from '../hooks/useProjectionTransition.js'
import { getProjection } from '../utils/projections.js'
import drawCountries from '../utils/drawCountries.js'
import drawCities from '../utils/drawCities.js'

const getLonLat = (d = {}) => {
  let lon
  let lat
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
  if (lon == null || lat == null) return null
  return [lon, lat]
}

const getPopulation = (d = {}) => {
  const props = d?.properties || d
  const pop = props?.population ?? props?.pop ?? props?.POP ?? props?.Population
  return Number.isFinite(+pop) ? +pop : -Infinity
}

const getCityName = (d = {}) => {
  const props = d?.properties || {}
  return d?.name || d?.city || props.name || props.city || 'City'
}

const EARTH_RADIUS_KM = 6371

const estimatePxPerKm = (project, centerLonLat, centerScreen) => {
  if (!project || !centerLonLat || !centerScreen) return null
  const delta = 0.1
  const offset = [centerLonLat[0] + delta, centerLonLat[1]]
  const a = centerScreen
  const b = project(offset)
  if (!b) return null
  const geo = d3.geoDistance(centerLonLat, offset) * EARTH_RADIUS_KM
  if (!geo) return null
  const px = Math.hypot(b[0] - a[0], b[1] - a[1])
  return geo ? px / geo : null
}

export default function MapCanvas({
  fromProjection,
  toProjection,
  duration,
  layersVisible,
  citySample,
  distortionMode,
  distortionReference,
  setTooltip,
  setFps,
  setDistortionStats
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const zoomRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 500 })
  const [data, setData] = useState({ countries: null, cities: null, lanes: null })
  const [transform, setTransform] = useState(d3.zoomIdentity)
  const hitRefs = useRef({ countryPaths: [], cityPoints: [], routePaths: [], vectorPaths: [] })
  const lastFrameRef = useRef(performance.now())
  const [orthoRotation, setOrthoRotation] = useState(0)
  const distortionMapRef = useRef(new Map())
  const distortionMaxRef = useRef(0)

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const cr = e.contentRect
        setSize({ width: Math.max(320, cr.width), height: Math.max(240, cr.height) })
      }
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    Promise.all([
      d3.json('/data/country_boundaries.geojson'),
      d3.json('/data/world_cities.geojson'),
      d3.json('/data/shipping_lane.geojson'),
    ]).then(([countries, cities, lanes]) => {
      if (countries?.features) {
        countries.features.forEach(f => {
          if (!f.__sphereArea) f.__sphereArea = d3.geoArea(f)
        })
      }
      setData({ countries, cities: cities?.features || cities, lanes })
    }).catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (toProjection !== 'orthographic') setOrthoRotation(0)
  }, [toProjection])

  const viewProjectionKey = useMemo(() => {
    if (toProjection !== 'orthographic') return toProjection
    return `orthographic:rot-${orthoRotation}`
  }, [toProjection, orthoRotation])

  const baselineProjectionKey = useMemo(() => fromProjection, [fromProjection])

  const prevViewKeyRef = useRef(viewProjectionKey)
  const prevViewKey = prevViewKeyRef.current
  useEffect(() => {
    prevViewKeyRef.current = viewProjectionKey
  }, [viewProjectionKey])

  const transitionFromKey = useMemo(() => {
    if (fromProjection && toProjection && fromProjection !== toProjection) {
      return baselineProjectionKey
    }
    return prevViewKey
  }, [fromProjection, toProjection, baselineProjectionKey, prevViewKey])

  const { project, toName } = useProjectionTransition({
    width: size.width,
    height: size.height,
    fromKey: transitionFromKey,
    toKey: viewProjectionKey,
    duration
  })

  const resolvedCities = useMemo(() => {
    if (!data.cities) return []
    if (Array.isArray(data.cities)) return data.cities
    if (Array.isArray(data.cities?.features)) return data.cities.features
    return []
  }, [data.cities])

  const sampledCities = useMemo(() => {
    if (!resolvedCities?.length) return []
    if (citySample === 'all') return resolvedCities
    const limit = citySample === 'top50' ? 50 : 100
    const sorted = [...resolvedCities].sort((a, b) => getPopulation(b) - getPopulation(a))
    return sorted.slice(0, limit)
  }, [resolvedCities, citySample])

  const countryAreaMetrics = useMemo(() => {
    try {
      const proj = getProjection(toProjection, size.width, size.height)
      const path = d3.geoPath(proj.projection)
      const projectedSphereArea = Math.max(path.area({ type: 'Sphere' }) || 1, 1e-3)
      const sphereArea = 4 * Math.PI
      const sampleFeature = data.countries?.features?.[0]
      const sampleProjected = sampleFeature ? path.area(sampleFeature) : 0
      return {
        path,
        projectedSphereArea,
        sphereArea,
        debug: { sampleFeature, sampleProjected }
      }
    } catch (err) {
      console.warn('Area metric calc failed', err)
      return null
    }
  }, [toProjection, size.width, size.height, data.countries])

  useEffect(() => {
    if (!canvasRef.current || !data.countries) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width, height } = size

    const now = performance.now()
    const dt = Math.max(1, now - lastFrameRef.current)
    lastFrameRef.current = now
    setFps(1000 / dt)

    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, width, height)

    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    const missingFill = []
    const invalidFill = []
    const baseCenterLonLat = project?.meta?.viewCenter || [0, 0]
    const baseCenterScreen = project(baseCenterLonLat) || [width / 2, height / 2]
    const fallbackPxPerKm = estimatePxPerKm(project, baseCenterLonLat, baseCenterScreen)

    const getCountryFill = (feature) => {
      if (!countryAreaMetrics?.path || !feature?.__sphereArea) {
        missingFill.push(feature?.properties?.name || feature?.properties?.NAME || 'Unknown')
        return '#f2f4f8'
      }
      const actualShare = feature.__sphereArea / countryAreaMetrics.sphereArea
      const projectedShare = countryAreaMetrics.path.area(feature) / Math.max(countryAreaMetrics.projectedSphereArea, 1e-6)
      let ratio = projectedShare / Math.max(actualShare, 1e-9)
      if (!Number.isFinite(ratio) || ratio <= 0) {
        invalidFill.push(feature?.properties?.name || feature?.properties?.NAME || 'Unknown')
        ratio = Math.max(1e-6, Math.abs(ratio))
      }
      const diff = Math.max(-1, Math.min(1, Math.log2(ratio)))
      if (diff >= 0) {
        const t = Math.min(1, diff)
        const r = 255
        const g = Math.round(210 - 80 * t)
        const b = Math.round(200 - 160 * t)
        return `rgb(${r}, ${g}, ${b})`
      }
      const t = Math.min(1, -diff)
      const r = Math.round(190 - 120 * t)
      const g = Math.round(210 - 90 * t)
      const b = 255
      return `rgb(${r}, ${g}, ${b})`
    }

    // Countries
    hitRefs.current.countryPaths = []
    if (layersVisible.countries) {
      hitRefs.current.countryPaths = drawCountries(
        ctx,
        data.countries.features,
        project,
        {
          stroke: '#dadfe7',
          fillFn: getCountryFill
        }
      )
      if (missingFill.length) {
        console.warn('[Country Fill] Missing area metrics for:', missingFill.slice(0, 10), '... (share this list if colors stay white)')
      }
      if (invalidFill.length) {
        console.warn('[Country Fill] Invalid projected area ratio for:', invalidFill.slice(0, 10))
      }
    }

    // Shipping lanes
    hitRefs.current.routePaths = []
    if (layersVisible.routes && data.lanes) {
      const featureList = Array.isArray(data.lanes)
        ? data.lanes
        : (data.lanes.features || [])

      const pxPerKmAt = (lonLat) => {
        if (!lonLat) return fallbackPxPerKm
        const screen = project(lonLat)
        return estimatePxPerKm(project, lonLat, screen) || fallbackPxPerKm
      }

      const drawBaseline = (startCoord, endCoord) => {
        const start = startCoord ? project(startCoord) : null
        const end = endCoord ? project(endCoord) : null
        if (!start || !end) return
        const baseline = new Path2D()
        baseline.moveTo(start[0], start[1])
        baseline.lineTo(end[0], end[1])
        ctx.save()
        ctx.setLineDash([5, 4])
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 0.9
        ctx.stroke(baseline)
        ctx.restore()
      }

      const getStrokeForRatio = (ratio) => {
        if (!Number.isFinite(ratio)) {
          return { stroke: 'rgba(14,165,233,0.65)', width: 1.1 }
        }
        const clamp = Math.max(-0.6, Math.min(0.6, ratio))
        if (clamp >= 0) {
          const t = clamp / 0.6
          return {
            stroke: `rgba(239,68,68,${0.45 + 0.45 * t})`,
            width: 1.2 + 1.6 * t
          }
        }
        const t = (-clamp) / 0.6
        return {
          stroke: `rgba(14,165,233,${0.4 + 0.45 * t})`,
          width: 1.1 + 1.4 * t
        }
      }

      const flattenLineCoords = (lines = []) => {
        const flat = []
        lines.forEach(line => {
          if (Array.isArray(line)) {
            line.forEach(coord => { if (Array.isArray(coord)) flat.push(coord) })
          }
        })
        return flat
      }

      featureList.forEach(feature => {
        const geom = feature.geometry || {}
        const lines = geom.type === 'LineString'
          ? [geom.coordinates]
          : geom.type === 'MultiLineString'
            ? geom.coordinates
            : null
        if (!Array.isArray(lines) || !lines.length) return

        const routePath = new Path2D()
        let planarLenPx = 0
        lines.forEach(line => {
          if (!Array.isArray(line) || !line.length) return
          let prevPt = null
          line.forEach((coord, idx) => {
            const pt = project(coord)
            if (!pt) return
            if (idx === 0) routePath.moveTo(pt[0], pt[1])
            else routePath.lineTo(pt[0], pt[1])
            if (prevPt) planarLenPx += Math.hypot(pt[0] - prevPt[0], pt[1] - prevPt[1])
            prevPt = pt
          })
        })

        const geoLenKm = d3.geoLength(feature) * EARTH_RADIUS_KM
        const centroid = d3.geoCentroid(feature)
        const pxPerKm = pxPerKmAt(centroid)
        const approxKm = pxPerKm ? planarLenPx / pxPerKm : null
        const ratio = (Number.isFinite(approxKm) && geoLenKm > 0)
          ? (approxKm / geoLenKm) - 1
          : null

        const style = getStrokeForRatio(ratio)
        ctx.save()
        ctx.setLineDash([])
        ctx.strokeStyle = style.stroke
        ctx.lineWidth = style.width
        ctx.globalAlpha = style.alpha ?? 1
        ctx.stroke(routePath)
        ctx.restore()

        if (distortionReference === 'geodesic') {
          const flat = flattenLineCoords(lines)
          const startCoord = flat[0]
          const endCoord = flat[flat.length - 1]
          if (startCoord && endCoord) {
            drawBaseline(startCoord, endCoord)
          }
        }

        hitRefs.current.routePaths.push({
          path: routePath,
          feature,
          ratio,
          geoLenKm,
          approxKm
        })
      })
    }

    // Cities
    hitRefs.current.cityPoints = []
    if (layersVisible.cities) {
      const isOrtho = (toName || '').startsWith('orthographic')
      let visFn = null
      if (isOrtho) {
        let center = null
        if (project?.projection?.rotate) {
          const rot = project.projection.rotate()
          center = [-rot[0], -rot[1]]
        } else if (project?.meta?.viewCenter) {
          center = project.meta.viewCenter
        }
        if (center) {
          visFn = ([lon, lat]) => d3.geoDistance([lon, lat], center) <= Math.PI / 2 - 1e-6
        }
      }
      const fill = (d) => {
        if (distortionMode !== 'nodes') return '#ff5722'
        const len = distortionMapRef.current.get(d)
        if (!len || distortionMaxRef.current <= 0) return '#ff5722'
        const ratio = Math.min(1, len / distortionMaxRef.current)
        const rCol = Math.round(255 * (1 - ratio))
        const gCol = Math.round(87 * (1 - ratio))
        const bCol = Math.round(34 * (1 - ratio))
        return `rgb(${rCol}, ${gCol}, ${bCol})`
      }
      hitRefs.current.cityPoints = drawCities(
        ctx,
        sampledCities,
        project,
        { r: 2.2, fill, visible: visFn }
      )
    }

    const vectorEntries = []
    distortionMapRef.current = new Map()
    distortionMaxRef.current = 0

    if (distortionReference === 'projection' && layersVisible.cities && fromProjection && toProjection && (fromProjection !== toProjection)) {
      const baselineProj = getProjection(baselineProjectionKey, width, height)
      const lookup = new Map()
      let maxLength = 0
      ctx.save()
      ctx.strokeStyle = '#8b5cf6'
      ctx.globalAlpha = 0.7
      ctx.lineWidth = 0.6
      sampledCities.forEach(d => {
        const coords = getLonLat(d)
        if (!coords) return
        const a = baselineProj(coords)
        const b = project(coords)
        if (!a || !b) return
        let seg = null
        if (distortionMode === 'vectors') {
          seg = new Path2D()
          seg.moveTo(a[0], a[1])
          seg.lineTo(b[0], b[1])
          ctx.stroke(seg)
        }
        const length = Math.hypot(b[0] - a[0], b[1] - a[1])
        maxLength = Math.max(maxLength, length)
        lookup.set(d, length)
        vectorEntries.push({
          path: seg,
          feature: d,
          length,
          ratio: null,
          name: getCityName(d),
          display: `${length.toFixed(1)} px`
        })
      })
      ctx.restore()
      distortionMapRef.current = lookup
      distortionMaxRef.current = maxLength
      hitRefs.current.vectorPaths = distortionMode === 'vectors'
        ? vectorEntries.filter(v => v.path)
        : []
      setDistortionStats?.(
        vectorEntries
          .filter(v => Number.isFinite(v.length))
          .sort((a, b) => b.length - a.length)
          .slice(0, 5)
          .map(v => ({ name: v.name, value: v.length, display: v.display }))
      )
    } else if (distortionReference === 'geodesic' && layersVisible.cities && hitRefs.current.cityPoints.length) {
      const centerLonLat = project?.meta?.viewCenter || [0, 0]
      const centerScreen = project(centerLonLat) || [width / 2, height / 2]
      const lookup = new Map()
      let maxRatio = 0
      const baselineScale = estimatePxPerKm(project, centerLonLat, centerScreen)
      ctx.save()
      ctx.strokeStyle = '#8b5cf6'
      ctx.globalAlpha = 0.7
      ctx.lineWidth = 0.6
      hitRefs.current.cityPoints.forEach((pt) => {
        const coords = getLonLat(pt.data)
        if (!coords) return
        const geoDistKm = d3.geoDistance(centerLonLat, coords) * EARTH_RADIUS_KM
        if (!Number.isFinite(geoDistKm) || geoDistKm < 1e-3) return
        const planarDistPx = Math.hypot(pt.x - centerScreen[0], pt.y - centerScreen[1])
        const scaleFactor = planarDistPx / Math.max(geoDistKm, 1e-6)
        const baseScale = baselineScale || scaleFactor
        if (!baseScale) return
        const ratio = (scaleFactor / baseScale) - 1
        const ratioAbs = Math.abs(ratio)
        lookup.set(pt.data, ratioAbs)
        maxRatio = Math.max(maxRatio, ratioAbs)
        let seg = null
        if (distortionMode === 'vectors' && planarDistPx > 0) {
          const gain = 120
          const vecLength = Math.max(-80, Math.min(80, ratio * gain))
          if (Math.abs(vecLength) > 0.5) {
            const ux = (pt.x - centerScreen[0]) / planarDistPx
            const uy = (pt.y - centerScreen[1]) / planarDistPx
            seg = new Path2D()
            seg.moveTo(pt.x, pt.y)
            seg.lineTo(pt.x + ux * vecLength, pt.y + uy * vecLength)
            ctx.stroke(seg)
          }
        }
        vectorEntries.push({
          path: seg,
          feature: pt.data,
          length: ratioAbs,
          ratio,
          name: getCityName(pt.data),
          display: `${(ratio * 100).toFixed(1)} %`
        })
      })
      ctx.restore()
      distortionMapRef.current = lookup
      distortionMaxRef.current = maxRatio
      hitRefs.current.vectorPaths = distortionMode === 'vectors'
        ? vectorEntries.filter(v => v.path)
        : []
      setDistortionStats?.(
        vectorEntries
          .filter(v => Number.isFinite(v.length))
          .sort((a, b) => b.length - a.length)
          .slice(0, 5)
          .map(v => ({ name: v.name, value: v.length, display: v.display }))
      )
    } else {
      hitRefs.current.vectorPaths = []
      setDistortionStats?.([])
    }

    ctx.restore()
  }, [data, size, project, transform, toName, layersVisible, sampledCities, setDistortionStats, fromProjection, toProjection, baselineProjectionKey, distortionMode, distortionReference])

  useEffect(() => {
    if (!canvasRef.current) return
    const zoom = d3.zoom().scaleExtent([0.8, 10]).on('zoom', (e) => setTransform(e.transform))
    zoomRef.current = zoom
    const sel = d3.select(canvasRef.current)
    sel.call(zoom)
    return () => {
      sel.on('.zoom', null)
    }
  }, [])

  const rotateOrthographic = () => {
    setOrthoRotation(v => (v + 90) % 360)
  }

  const resetOrthographicView = () => {
    setOrthoRotation(0)
    setTransform(d3.zoomIdentity)
    if (zoomRef.current && canvasRef.current) {
      d3.select(canvasRef.current).call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }

  const onMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // invert zoom/pan transform for hit tests in map coords
    const inv = transform.invert([x, y])
    const mx = inv[0], my = inv[1]
    const ctx = canvasRef.current.getContext('2d')

    // City hover first (if visible)
    const city = layersVisible.cities && hitRefs.current.cityPoints.find(p => {
      const dx = p.x - mx, dy = p.y - my
      return (dx*dx + dy*dy) <= (p.r + 3) * (p.r + 3)
    })
    if (city) {
      const d = city.data
      const props = d?.properties || {}
      const name = getCityName(d)
      const pop = d?.population ?? d?.pop ?? props.population ?? props.pop
      const distortionVal = distortionMapRef.current.get(d)
      let extra = null
      if (distortionVal && distortionMaxRef.current > 0) {
        extra = distortionReference === 'projection'
          ? `Distortion: ${distortionVal.toFixed(1)} px`
          : `Distortion: ${(distortionVal * 100).toFixed(1)} %`
      }
      setTooltip({ x, y, content: (
        <div>
          <div className="font-semibold">{name}</div>
          {pop != null && <div className="text-xs">Pop: {pop?.toLocaleString?.() || pop}</div>}
          {extra && <div className="text-xs text-indigo-600">{extra}</div>}
        </div>
      )})
      return
    }

    // Distortion vector hover when active
    if (distortionMode === 'vectors' && hitRefs.current.vectorPaths.length) {
      ctx.lineWidth = 4
      for (const v of hitRefs.current.vectorPaths) {
        if (ctx.isPointInStroke(v.path, mx, my)) {
          const label = distortionReference === 'projection'
            ? `${v.length.toFixed(1)} px`
            : `${(v.ratio * 100).toFixed(1)} %`
          setTooltip({
            x,
            y,
            content: (
              <div>
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-indigo-600">Distortion: {label}</div>
              </div>
            )
          })
          return
        }
      }
    }

    // Country hover
    if (layersVisible.countries) for (const c of hitRefs.current.countryPaths) {
      if (ctx.isPointInPath(c.path, mx, my)) {
        const name = c.feature.properties?.name || c.feature.properties?.NAME || 'Country'
        setTooltip({ x, y, content: <div className="font-semibold">{name}</div> })
        return
      }
    }

    // Route hover via stroke hit test with thicker width
    ctx.lineWidth = 6
    if (layersVisible.routes) for (const r of hitRefs.current.routePaths) {
      if (ctx.isPointInStroke(r.path, mx, my)) {
        const name = r.feature.properties?.name || 'Shipping Lane'
        const ratioLabel = Number.isFinite(r.ratio) ? `${(r.ratio * 100).toFixed(1)} %` : null
        const ratioClass = r.ratio > 0 ? 'text-rose-600' : 'text-sky-600'
        setTooltip({
          x,
          y,
          content: (
            <div>
              <div className="font-semibold">{name}</div>
              {ratioLabel && (
                <div className={`text-xs ${ratioClass}`}>
                  길이 왜곡: {ratioLabel}
                </div>
              )}
            </div>
          )
        })
        return
      }
    }

    setTooltip(null)
  }

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="w-full h-full block"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {toProjection === 'orthographic' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <button
            type="button"
            onClick={rotateOrthographic}
            className="bg-white/90 border border-gray-300 shadow-sm rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-white focus:outline-none"
            aria-label="현재 지구본을 회전"
          >
            <svg
              className="w-4 h-4 text-gray-600 transform transition-transform"
              style={{ transform: `rotate(${orthoRotation}deg)` }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10" />
              <path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14" />
            </svg>
            <span>회전 (90°)</span>
          </button>
          <button
            type="button"
            onClick={resetOrthographicView}
            className="bg-white/90 border border-gray-300 shadow-sm rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white focus:outline-none"
            aria-label="지구본 초기화"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  )
}
