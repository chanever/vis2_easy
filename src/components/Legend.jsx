import React from 'react'

export default function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-700">
      <div className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#ff5722' }} />
        <span>Cities</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 border border-gray-300" style={{ background: '#f9fafb' }} />
        <span>Countries (stroke #ccc)</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5" style={{ background: '#1e88e5' }} />
        <span>Shipping Lanes</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5" style={{ background: '#8b5cf6' }} />
        <span>Distortion Vectors</span>
      </div>
    </div>
  )
}

