import React, { useMemo, useRef, useState } from 'react'
import ControlPanel from './components/ControlPanel.jsx'
import Legend from './components/Legend.jsx'
import Tooltip from './components/Tooltip.jsx'
import MapCanvas from './components/MapCanvas.jsx'

export default function App() {
  const [projection, setProjection] = useState('orthographic')
  const [duration, setDuration] = useState(1200)
  const [tooltip, setTooltip] = useState(null)
  const [fps, setFps] = useState(0)
  const [layersVisible, setLayersVisible] = useState({ countries: true, cities: true, routes: true })

  const onChangeProjection = (next) => setProjection(next)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="p-3 border-b bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Projection Distortion Visualizer</h1>
          <ControlPanel
            projection={projection}
            duration={duration}
            onChangeProjection={onChangeProjection}
            onChangeDuration={setDuration}
            layersVisible={layersVisible}
            onToggleLayer={(key, val) => setLayersVisible(prev => ({ ...prev, [key]: val }))}
            onToggleAll={(val) => setLayersVisible({ countries: val, cities: val, routes: val })}
          />
        </div>
      </header>
      <main className="flex-1 relative">
        <MapCanvas
          projection={projection}
          duration={duration}
          layersVisible={layersVisible}
          setTooltip={setTooltip}
          setFps={setFps}
        />
        {tooltip && (
          <Tooltip x={tooltip.x} y={tooltip.y} onHide={() => setTooltip(null)}>
            {tooltip.content}
          </Tooltip>
        )}
      </main>
      <footer className="p-2 text-sm text-gray-600 bg-white border-t">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <span>Projection: {projection[0].toUpperCase() + projection.slice(1)}</span>
          <span>FPS: {fps.toFixed(0)}</span>
          <Legend />
        </div>
      </footer>
    </div>
  )
}
