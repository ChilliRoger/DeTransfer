'use client'

import React from 'react'

interface StatusIndicatorProps {
  status: string
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div className="text-center border-t border-white/10 pt-4">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">System Status</span>
      <p className="text-sm font-mono text-gray-400 mt-1">{status}</p>
    </div>
  )
}



