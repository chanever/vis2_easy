import React from 'react'

const options = [
  { value: 'orthographic', label: 'Orthographic' },
  { value: 'mercator', label: 'Mercator' },
  { value: 'equalEarth', label: 'EqualEarth' },
]

export default function ControlPanel({ projection, duration, onChangeProjection, onChangeDuration, layersVisible, onToggleLayer, onToggleAll }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex items-center gap-3 relative">
      <label className="text-sm text-gray-700">Projection</label>
      <select
        className="border rounded px-2 py-1 bg-white"
        value={projection}
        onChange={(e) => onChangeProjection(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label className="text-sm text-gray-700 ml-3">Transition (ms)</label>
      <input
        type="range"
        min="200"
        max="4000"
        step="100"
        value={duration}
        onChange={(e) => onChangeDuration(+e.target.value)}
      />
      <span className="w-12 text-right text-sm text-gray-600">{duration}</span>

      <div className="ml-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="border rounded px-2 py-1 bg-white text-sm hover:bg-gray-50"
        >
          Datasets ▾
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow z-10">
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
          </div>
        )}
      </div>
    </div>
  )
}
