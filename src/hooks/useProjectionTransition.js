import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { getProjection, parseProjectionKey } from '../utils/projections.js'

const clampRotation = (rot = []) => [
  rot?.[0] ?? 0,
  rot?.[1] ?? 0,
  rot?.[2] ?? 0
]

const interpolateAngle = (a, b, t) => {
  const start = a ?? 0
  const end = b ?? 0
  let diff = end - start
  diff = ((diff + 180) % 360) - 180
  return start + diff * t
}

export default function useProjectionTransition({ width, height, currentName, duration }) {
  const key = currentName
  const prevNameRef = useRef(key)
  const [t, setT] = useState(1)
  const rafRef = useRef(null)
  const startTimeRef = useRef(0)

  // Start a new transition when the projection key changes
  useEffect(() => {
    if (prevNameRef.current === key) return
    const from = prevNameRef.current
    const to = key
    prevNameRef.current = prevNameRef.current // keep old until finish
    cancelAnimationFrame(rafRef.current)
    startTimeRef.current = performance.now()
    const tick = (now) => {
      const el = Math.min(1, (now - startTimeRef.current) / Math.max(1, duration))
      setT(el)
      if (el < 1) rafRef.current = requestAnimationFrame(tick)
      else prevNameRef.current = to
    }
    setT(0)
    prevNameRef.current = from
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [key, duration])

  const fromName = prevNameRef.current
  const toName = key
  const isTransitioning = t < 1 || fromName !== toName

  const fromProj = getProjection(fromName, width, height)
  const toProj = getProjection(toName, width, height)
  const fromSpec = parseProjectionKey(fromName)
  const toSpec = parseProjectionKey(toName)
  const bothOrtho = fromSpec.baseName === 'orthographic' && toSpec.baseName === 'orthographic'

  let project
  if (bothOrtho) {
    const fromRot = clampRotation(fromProj.meta?.rotation)
    const toRot = clampRotation(toProj.meta?.rotation)
    const interpRot = fromRot.map((start, idx) => interpolateAngle(start, toRot[idx], t))
    const cloneOrthoBase = () => {
      if (toProj?.projection && typeof toProj.projection.copy === 'function') {
        return toProj.projection.copy()
      }
      const fallback = getProjection(toName, width, height)
      if (fallback?.projection && typeof fallback.projection.copy === 'function') {
        return fallback.projection.copy()
      }
      const manual = d3.geoOrthographic()
      manual.fitExtent([[0, 0], [width, height]], { type: 'Sphere' })
      manual.scale(manual.scale() * 0.85)
      return manual
    }
    const ortho = cloneOrthoBase()
    if (typeof ortho.rotate === 'function') {
      ortho.rotate(interpRot)
    }
    const path = d3.geoPath(ortho)
    project = (lonlat) => ortho(lonlat)
    project.path = path
    project.projection = ortho
    project.meta = {
      from: fromSpec,
      to: toSpec,
      viewCenter: [-interpRot[0], -interpRot[1]]
    }
  } else {
    const lerpProject = (lonlat) => {
      const a = fromProj(lonlat)
      const b = toProj(lonlat)
      if (!a && !b) return null
      if (!a) return b
      if (!b) return a
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t
      ]
    }
    project = lerpProject
    if (t === 1) {
      project.path = toProj.path
      project.projection = toProj.projection
    } else {
      project.path = null
      project.projection = null
    }
    project.meta = {
      from: fromSpec,
      to: toSpec,
      viewCenter: toSpec.baseName === 'orthographic'
        ? [-(toProj.meta?.rotation?.[0] ?? 0), -(toProj.meta?.rotation?.[1] ?? 0)]
        : null
    }
  }

  return { project, isTransitioning, fromName, toName, t }
}
