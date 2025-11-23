'use client'

import React, { useState, useEffect } from 'react';
import { Lock, Database } from 'lucide-react';

interface MatrixAnimationProps {
  active: boolean;
  message?: string;
  packets?: string;
  gridSize?: number;
}

const MatrixAnimation: React.FC<MatrixAnimationProps> = ({
  active,
  message = "ENCRYPTING",
  packets = "SENDING",
  gridSize = 12
}) => {
  
  const [grid, setGrid] = useState<number[][]>(
    Array(gridSize).fill(0).map(() => Array(gridSize).fill(0))
  );

  useEffect(() => {
    if (!active) {
      setGrid(Array(gridSize).fill(0).map(() => Array(gridSize).fill(0)));
      return;
    }

    const interval = setInterval(() => {
      setGrid(prev =>
        prev.map(row =>
          row.map(() => {
            // Increased blinking activity
            const r = Math.random();

            if (r > 0.92) return 2;  // bright
            if (r > 0.80) return 1;  // dim
            return 0;                // off
          })
        )
      );
    }, 100); // slightly faster animation

    return () => clearInterval(interval);
  }, [active, gridSize]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#080808] rounded-2xl border border-white/10 p-6 relative overflow-hidden min-h-[400px]">

      {/* Scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-eco-accent/5 to-transparent h-[200%] w-full animate-[scan_3s_linear_infinite] pointer-events-none" />

      <div className="flex justify-between w-full mb-6 px-2 relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Status</span>
          <span className="text-xs font-mono text-eco-accent animate-pulse">{message}</span>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Packets</span>
          <span className="text-xs font-mono text-white">{packets}</span>
        </div>
      </div>

      {/* Square Grid */}
      <div
        className="grid gap-2 relative z-10"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`
        }}
      >
        {grid.flat().map((value, i) => (
          <div
            key={i}
            className={`transition-all duration-150 w-4 h-4 rounded-md
              ${
                value === 2
                  ? 'bg-eco-accent shadow-[0_0_10px_rgba(42,112,241,0.9)]'
                  : value === 1
                  ? 'bg-eco-accent/40'
                  : 'bg-[#111]'
              }
            `}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 w-full flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-gray-500" />
          <span className="text-[10px] text-gray-500 font-mono">AES-256-GCM</span>
        </div>
        <div className="flex items-center gap-2">
          <Database size={12} className="text-gray-500" />
          <span className="text-[10px] text-gray-500 font-mono">Walrus Blob</span>
        </div>
      </div>

    </div>
  );
};

export default MatrixAnimation;
