'use client'

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const BackgroundEffect: React.FC = () => {
  const { scrollY } = useScroll();
  
  // Map scroll position to opacity and scale for the fade-out effect
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.1]);
  const rotate = useTransform(scrollY, [0, 600], [0, -10]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#050505] -z-50 pointer-events-none">
      {/* Static Grain Texture - Reduced opacity for performance */}
      <div 
        className="absolute inset-0 opacity-[0.04] z-[1] mix-blend-overlay will-change-auto"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div 
        style={{ opacity, scale, rotate }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vh] h-[90vh] md:w-[140vh] md:h-[140vh] will-change-transform"
      >
        <div className="relative w-full h-full">
          {/* Primary Blue Aura Layer - Simplified animation */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              rotate: { duration: 60, ease: "linear", repeat: Infinity },
              scale: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
             <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[50px] md:blur-[80px] opacity-40 mix-blend-screen" />
          </motion.div>

          {/* Secondary Cyan Aura Layer - Simplified animation */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: -360,
              scale: [1, 0.9, 1.05, 0.95, 1],
            }}
            transition={{
              rotate: { duration: 70, ease: "linear", repeat: Infinity },
              scale: { duration: 25, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
             <div className="w-full h-full rounded-full bg-[conic-gradient(from_180deg,transparent_0deg,#22d3ee_90deg,transparent_210deg)] blur-[50px] md:blur-[80px] opacity-25 mix-blend-screen" />
          </motion.div>

          {/* Inner Hollow Mask - Simplified */}
          <div className="absolute inset-[25%] bg-[#050505] rounded-full blur-[40px] md:blur-[60px]" />
        </div>
      </motion.div>
    </div>
  );
};

export default BackgroundEffect;
