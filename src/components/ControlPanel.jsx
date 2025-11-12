import React from 'react'

const projectionOptions = [
  { value: 'orthographic', label: 'Orthographic' },
  { value: 'mercator', label: 'Mercator' },
  { value: 'equalEarth', label: 'EqualEarth' },
]

const citySampleOptions = [
  { value: 'all', label: '전체 도시' },
  { value: 'top100', label: '상위 100개' },
  { value: 'top50', label: '상위 50개' },
]

export default function ControlPanel({
  fromProjection,
  toProjection,
  duration,
  onChangeFrom,
  onChangeTo,
  onChangeDuration,
  layersVisible,
  onToggleLayer,
  onToggleAll,
  citySample,
  onChangeCitySample,
  distortionMode,
  onChangeDistortionMode,
  distortionReference,
  onChangeDistortionReference
}) {
  const [open, setOpen] = React.useState(false)
  const isGeodesic = distortionReference === 'geodesic'
  return (
    <div className="flex flex-wrap items-center gap-4 relative">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="rounded"
          checked={isGeodesic}
          onChange={(e) => onChangeDistortionReference(e.target.checked ? 'geodesic' : 'projection')}
        />
        <span>Geodesic reference</span>
      </label>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">From projection</label>
        <select
          className="border rounded px-2 py-1 bg-white text-sm"
          value={fromProjection}
          onChange={(e) => onChangeFrom(e.target.value)}
          disabled={isGeodesic}
        >
          {projectionOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">To projection</label>
        <select
          className="border rounded px-2 py-1 bg-white text-sm"
          value={toProjection}
          onChange={(e) => onChangeTo(e.target.value)}
        >
          {projectionOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700 whitespace-nowrap">Transition (ms)</label>
        <input
          type="range"
          min="200"
          max="4000"
          step="100"
          value={duration}
          onChange={(e) => onChangeDuration(+e.target.value)}
        />
        <span className="w-12 text-right text-sm text-gray-600">{duration}</span>
      </div>

      <div className="ml-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="border rounded px-2 py-1 bg-white text-sm hover:bg-gray-50"
        >
          Datasets ▾
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-56 bg-white border rounded shadow z-10">
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <span className="text-xs text-gray-600">Toggle datasets</span>
              <button className="text-xs text-blue-600" onClick={() => onToggleAll(true)}>All</button>
              <button className="text-xs text-blue-600" onClick={() => onToggleAll(false)}>None</button>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!layersVisible.countries} onChange={(e) => onToggleLayer('countries', e.target.checked)} />
              <span className="text-sm">Countries</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!layersVisible.cities} onChange={(e) => onToggleLayer('cities', e.target.checked)} />
              <span className="text-sm">Cities</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!layersVisible.routes} onChange={(e) => onToggleLayer('routes', e.target.checked)} />
              <span className="text-sm">Shipping Lanes</span>
            </label>
            <div className="px-3 py-2 border-t">
              <div className="text-xs text-gray-500 mb-1">City sample</div>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={citySample}
                onChange={(e) => onChangeCitySample(e.target.value)}
              >
                {citySampleOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="text-[11px] text-gray-400 mt-1">인구(population) 기준</div>
            </div>
            <div className="px-3 py-2 border-t">
              <div className="text-xs text-gray-500 mb-1">왜곡 표시 방식</div>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={distortionMode}
                onChange={(e) => onChangeDistortionMode(e.target.value)}
              >
                <option value="vectors">보라색 선분</option>
                <option value="nodes">노드 색상</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
