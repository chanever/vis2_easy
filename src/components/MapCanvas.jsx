import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import useProjectionTransition from '../hooks/useProjectionTransition.js'
import { avgLatitude, distortionColorByLatitude, getProjection } from '../utils/projections.js'
import drawCountries from '../utils/drawCountries.js'
import drawCities from '../utils/drawCities.js'
import drawRoutes from '../utils/drawRoutes.js'

export default function MapCanvas({ projection, duration, layersVisible, setTooltip, setFps }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const zoomRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 500 })
  const [data, setData] = useState({ countries: null, cities: null, lanes: null })
  const [transform, setTransform] = useState(d3.zoomIdentity)
  const hitRefs = useRef({ countryPaths: [], cityPoints: [], routePaths: [] })
  const lastFrameRef = useRef(performance.now())
  const debugLogRef = useRef(true)
  const lastLogKeyRef = useRef('')
  const [orthoRotation, setOrthoRotation] = useState(0)

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
      setData({ countries, cities: cities?.features || cities, lanes })
    }).catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (projection !== 'orthographic') setOrthoRotation(0)
  }, [projection])

  const projectionKey = useMemo(() => {
    if (projection !== 'orthographic') return projection
    return `orthographic:rot-${orthoRotation}`
  }, [projection, orthoRotation])

  const { project, isTransitioning, fromName, toName, t } = useProjectionTransition({
    width: size.width,
    height: size.height,
    currentName: projectionKey,
    duration
  })

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

    // Countries
    hitRefs.current.countryPaths = []
    if (layersVisible.countries) {
      hitRefs.current.countryPaths = drawCountries(
        ctx,
        data.countries.features,
        project,
        {
          stroke: '#ccc',
          fillFn: (f) => distortionColorByLatitude(avgLatitude(f))
        }
      )
    }

    // Shipping lanes
    hitRefs.current.routePaths = []
    if (layersVisible.routes) {
      hitRefs.current.routePaths = drawRoutes(ctx, data.lanes.features || data.lanes, project, { stroke: '#1e88e5', width: 1 })
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
      hitRefs.current.cityPoints = drawCities(
        ctx,
        data.cities.features || data.cities,
        project,
        { r: 2.2, fill: '#ff5722', visible: visFn }
      )
    }

    // Distortion vectors (Orthographic vs Mercator) when Mercator selected
    if (toName === 'mercator' && layersVisible.cities) {
      const ortho = getProjection('orthographic', width, height)
      ctx.save()
      ctx.strokeStyle = '#8b5cf6'
      ctx.globalAlpha = 0.7
      ctx.lineWidth = 0.6
      ;(data.cities.features || data.cities).forEach(d => {
        const a = ortho([d.longitude || d.lon || d.lng, d.latitude || d.lat])
        const b = project([d.longitude || d.lon || d.lng, d.latitude || d.lat])
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
      })
      ctx.restore()
    }

    // Dev logging: show projection change and high-latitude country colors
    if (debugLogRef.current && data?.countries?.features) {
      const stage = t < 0.02 ? 'start' : (t > 0.98 ? 'end' : '')
      if (stage) {
        const key = toName + ':' + stage
        if (key !== lastLogKeyRef.current) {
          lastLogKeyRef.current = key
          const highs = data.countries.features
            .map(f => ({ f, lat: avgLatitude(f) }))
            .filter(d => d.lat >= 60)
            .sort((a, b) => b.lat - a.lat)
            .slice(0, 5)
          // Fallback: if none >= 60, take top 5 by latitude
          const sample = highs.length ? highs : data.countries.features
            .map(f => ({ f, lat: avgLatitude(f) }))
            .sort((a, b) => b.lat - a.lat)
            .slice(0, 5)

          // Note: fill color is latitude-based and does not change across projections
          console.group(`[Projection] ${fromName} -> ${toName} (${stage}), t=${t.toFixed(2)}`)
          console.info('Info: country fill uses latitude-based color; constant across projections.')
          sample.forEach(({ f, lat }) => {
            const name = f.properties?.name || f.properties?.NAME || 'Country'
            const color = distortionColorByLatitude(lat)
            console.log(`${name}: avgLat=${lat.toFixed(2)}, color=${color}`)
          })
          console.groupEnd()
        }
      }
    }

    ctx.restore()
  }, [data, size, project, transform, toName, layersVisible])

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

    // City hover first (if visible)
    const city = layersVisible.cities && hitRefs.current.cityPoints.find(p => {
      const dx = p.x - mx, dy = p.y - my
      return (dx*dx + dy*dy) <= (p.r + 3) * (p.r + 3)
    })
    if (city) {
      const d = city.data
      const props = d?.properties || {}
      const name = d?.name || d?.city || props.name || props.city || 'City'
      const pop = d?.population ?? d?.pop ?? props.population ?? props.pop
      setTooltip({ x, y, content: (
        <div>
          <div className="font-semibold">{name}</div>
          {pop != null && <div className="text-xs">Pop: {pop?.toLocaleString?.() || pop}</div>}
        </div>
      )})
      return
    }

    // Country hover
    const ctx = canvasRef.current.getContext('2d')
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
        setTooltip({ x, y, content: <div className="font-semibold">{name}</div> })
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
      {projection === 'orthographic' && (
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
