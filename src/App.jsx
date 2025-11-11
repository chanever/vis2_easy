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
  const [citySample, setCitySample] = useState('all')
  const [distortionStats, setDistortionStats] = useState([])

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
            citySample={citySample}
            onChangeCitySample={setCitySample}
          />
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        {(projection === 'mercator' || projection === 'equalEarth') && (
          <aside className="w-64 border-r bg-white p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Top 5 Distortions</h2>
            <p className="text-xs text-gray-500 mb-3">
              Orthographic 대비 현재 투영에서 가장 멀리 이동한 도시 (픽셀 기준)
            </p>
            <ol className="space-y-2 text-sm">
              {distortionStats?.length ? distortionStats.map((d, idx) => (
                <li key={d.name || idx} className="flex items-center justify-between">
                  <span className="text-gray-700">{idx + 1}. {d.name}</span>
                  <span className="text-indigo-600 font-semibold">{d.length.toFixed(1)}px</span>
                </li>
              )) : (
                <li className="text-gray-400 text-xs">데이터 계산 중...</li>
              )}
            </ol>
          </aside>
        )}
        <div className="flex-1 relative">
          <MapCanvas
            projection={projection}
            duration={duration}
            layersVisible={layersVisible}
            citySample={citySample}
            setTooltip={setTooltip}
            setFps={setFps}
            setDistortionStats={setDistortionStats}
          />
          {tooltip && (
            <Tooltip x={tooltip.x} y={tooltip.y} onHide={() => setTooltip(null)}>
              {tooltip.content}
            </Tooltip>
          )}
        </div>
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
