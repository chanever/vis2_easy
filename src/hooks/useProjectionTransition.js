import { useEffect, useRef, useState } from 'react'
import { getProjection } from '../utils/projections.js'

export default function useProjectionTransition({ width, height, currentName, duration }) {
  const prevNameRef = useRef(currentName)
  const [t, setT] = useState(1)
  const rafRef = useRef(null)
  const startTimeRef = useRef(0)

  // Start a new transition when currentName changes
  useEffect(() => {
    if (prevNameRef.current === currentName) return
    const from = prevNameRef.current
    const to = currentName
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
  }, [currentName, duration])

  const fromName = prevNameRef.current
  const toName = currentName
  const isTransitioning = t < 1 || fromName !== toName

  const fromProj = getProjection(fromName, width, height)
  const toProj = getProjection(toName, width, height)

  const project = (lonlat) => {
    const a = fromProj(lonlat)
    const b = toProj(lonlat)
    const x = a[0] + (b[0] - a[0]) * t
    const y = a[1] + (b[1] - a[1]) * t
    return [x, y]
  }

  return { project, isTransitioning, fromName, toName, t }
}

