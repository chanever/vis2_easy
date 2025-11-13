import React, { useMemo, useRef, useState } from 'react'
import ControlPanel from './components/ControlPanel.jsx'
import Legend from './components/Legend.jsx'
import Tooltip from './components/Tooltip.jsx'
import MapCanvas from './components/MapCanvas.jsx'

export default function App() {
  const [fromProjection, setFromProjection] = useState('orthographic')
  const [toProjection, setToProjection] = useState('mercator')
  const [duration, setDuration] = useState(1200)
  const [tooltip, setTooltip] = useState(null)
  const [fps, setFps] = useState(0)
  const [layersVisible, setLayersVisible] = useState({ countries: true, cities: true, routes: true })
  const [citySample, setCitySample] = useState('all')
  const [distortionStats, setDistortionStats] = useState([])
  const [distortionMode, setDistortionMode] = useState('vectors')
  const [distortionReference, setDistortionReference] = useState('geodesic')

  const infoDetails = useMemo(() => {
    const referenceText = distortionReference === 'geodesic'
      ? 'Reference: Geodesic – 실제 지표 거리 대비 To 투영의 축척 오차를 표시합니다. From 설정은 비활성화됩니다.'
      : `Reference: Projection – ${fromProjection} → ${toProjection} 화면 좌표 이동량을 비교합니다.`
    const displayText = distortionMode === 'vectors'
      ? 'Display: 보라색 선분 – 길이/방향으로 왜곡 크기를 봅니다.'
      : 'Display: 노드 색상 – 주황(오차 적음)→검정(오차 큼) 그라데이션으로 왜곡 크기를 봅니다.'
    const datasetTips = [
      'Countries: 위도 기반 색으로 면적 왜곡을 지속적으로 강조합니다.',
      'Cities: 샘플링 옵션으로 과밀을 조절하며, 벡터/색으로 위치·축척 왜곡을 확인합니다.',
      'Shipping Lanes: To 투영에서의 곡률 변화를 통해 대권항로와의 차이를 비교합니다.'
    ]
    return { referenceText, displayText, datasetTips }
  }, [distortionReference, distortionMode, fromProjection, toProjection])

  return (
    <div className="min-h-full flex flex-col">
      <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur flex flex-wrap items-center gap-5 px-4 py-3 shadow relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400/80 to-cyan-300/70 text-indigo-950 flex items-center justify-center font-bold text-base shadow-[0_10px_25px_rgba(99,102,241,0.45)]">PD</div>
          <h1 className="text-xl font-semibold text-white whitespace-nowrap drop-shadow">Projection Distortion Visualizer</h1>
        </div>
        <div className="flex-1 min-w-[320px]">
          <div className="bg-white/5 border border-white/10 rounded-2xl shadow-inner px-4 py-3 backdrop-blur">
            <ControlPanel
              fromProjection={fromProjection}
              toProjection={toProjection}
              duration={duration}
              onChangeFrom={setFromProjection}
              onChangeTo={setToProjection}
              onChangeDuration={setDuration}
              layersVisible={layersVisible}
              onToggleLayer={(key, val) => setLayersVisible(prev => ({ ...prev, [key]: val }))}
              onToggleAll={(val) => setLayersVisible({ countries: val, cities: val, routes: val })}
              citySample={citySample}
              onChangeCitySample={setCitySample}
              distortionMode={distortionMode}
              onChangeDistortionMode={setDistortionMode}
              distortionReference={distortionReference}
              onChangeDistortionReference={setDistortionReference}
            />
          </div>
        </div>
      </header>
     <main className="flex-1 flex overflow-hidden rounded-none lg:rounded-3xl bg-slate-900/40 border border-white/5 lg:border-white/10 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur-lg mx-0 lg:mx-4 my-4 lg:my-6">
       {(fromProjection !== toProjection || distortionReference === 'geodesic') && (
          <aside className="w-64 border-r border-white/10 bg-white/5 p-4 overflow-y-auto text-slate-100">
            <h2 className="text-sm font-semibold mb-2 text-white">Top 5 Distortions</h2>
            <p className="text-xs text-white/80 mb-3">
              {distortionReference === 'projection'
                ? 'From → To 투영으로 이동할 때 가장 크게 움직인 도시'
                : '지오데식 거리 기준 가장 크게 왜곡된 도시'}
            </p>
            <ol className="space-y-2 text-sm">
              {distortionStats?.length ? distortionStats.map((d, idx) => (
                <li key={d.name || idx} className="flex items-center justify-between text-white">
                  <span>{idx + 1}. {d.name}</span>
                  <span className="font-semibold">{d.display}</span>
                </li>
              )) : (
                <li className="text-white/70 text-xs">데이터 계산 중...</li>
              )}
            </ol>
          </aside>
       )}
        <div className="flex-1 relative">
          <div className="absolute top-4 right-4 z-10">
            <div className="group relative inline-block">
              <button
                type="button"
                className="w-9 h-9 rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 shadow-[0_10px_25px_rgba(15,23,42,0.4)] backdrop-blur"
                aria-label="정보 안내"
              >
                i
              </button>
              <div className="absolute right-0 mt-3 w-80 bg-slate-900/85 border border-white/10 rounded-xl shadow-2xl text-xs text-slate-100 p-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity backdrop-blur-xl">
                <p className="font-semibold text-slate-50 mb-1">현재 왜곡 해석</p>
                <p className="mb-1">{infoDetails.referenceText}</p>
                <p className="mb-2">{infoDetails.displayText}</p>
                <p className="font-semibold text-slate-50 mb-1">Dataset tips</p>
                <ul className="space-y-1 list-disc pl-4">
                  {infoDetails.datasetTips.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <MapCanvas
            fromProjection={fromProjection}
            toProjection={toProjection}
            duration={duration}
            layersVisible={layersVisible}
            citySample={citySample}
            distortionMode={distortionMode}
            distortionReference={distortionReference}
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
      <footer className="text-sm text-slate-200 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 shadow-[0_12px_35px_rgba(2,6,23,0.45)]">
        <div className="flex items-center gap-4">
          <span>From: {fromProjection[0].toUpperCase() + fromProjection.slice(1)}</span>
          <span>To: {toProjection[0].toUpperCase() + toProjection.slice(1)}</span>
          <span>FPS: {fps.toFixed(0)}</span>
          <Legend />
        </div>
      </footer>
    </div>
  )
}
