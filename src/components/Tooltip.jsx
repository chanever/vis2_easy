import React from 'react'

export default function Tooltip({ x, y, children, onHide }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x + 12, top: y + 12 }}
      onMouseLeave={onHide}
    >
      <div className="bg-white shadow-md p-2 rounded-md text-sm max-w-xs">
        {children}
      </div>
    </div>
  )
}

