import React from 'react'

const options = [
  { value: 'orthographic', label: 'Orthographic' },
  { value: 'mercator', label: 'Mercator' },
  { value: 'equalEarth', label: 'EqualEarth' },
]

export default function ControlPanel({ projection, duration, onChangeProjection, onChangeDuration }) {
  return (
    <div className="flex items-center gap-3">
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
    </div>
  )
}

