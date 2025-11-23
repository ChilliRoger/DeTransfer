'use client'

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { SuiLogo, WalrusLogo, SealLogo } from './Logos';

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  // Subtle zoom out and fade as user scrolls
  const scale = useTransform(scrollY, [0, 600], [1, 0.9]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 500], [0, 50]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-32 pb-24 overflow-hidden">
      
      {/* Animated Hollow Globe Blob - Optimized */}
      <motion.div 
        style={{ scale, opacity }}
        className="absolute inset-0 m-auto w-[600px] h-[600px] md:w-[900px] md:h-[900px] pointer-events-none z-0"
      >
        <motion.div 
          className="w-full h-full relative will-change-transform"
          animate={{ 
            rotate: 360,
            scale: [1, 1.05, 0.95, 1]
          }}
          transition={{
            rotate: { duration: 100, ease: "linear", repeat: Infinity },
            scale: { duration: 15, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
          }}
        >
           {/* Globe Atmosphere (Faint Glow) - Reduced blur */}
           <div className="absolute inset-0 rounded-full bg-eco-accent/5 blur-[60px] md:blur-[80px] will-change-transform" />

           {/* Organic Inner Layer 1 - Simplified animation */}
           <motion.div 
              className="absolute inset-[10%] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-gradient-to-tr from-eco-accent/10 via-eco-accent/5 to-transparent blur-[40px] md:blur-[50px] will-change-transform"
              animate={{ 
                 rotate: 180 
              }}
              transition={{
                rotate: { duration: 40, repeat: Infinity, ease: "linear" }
              }}
           />

           {/* Organic Inner Layer 2 - Simplified animation */}
           <motion.div 
              className="absolute inset-[10%] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-gradient-to-bl from-white/5 via-white/5 to-transparent blur-[35px] md:blur-[45px] will-change-transform"
               animate={{ 
                 rotate: -180 
              }}
              transition={{
                rotate: { duration: 50, repeat: Infinity, ease: "linear" }
              }}
           />
           
           {/* The Hollow Core - Reduced blur */}
           <div className="absolute inset-[30%] bg-[#050505] rounded-full blur-[30px] md:blur-[40px]" />
           
           {/* Thin Orbit Ring */}
           <motion.div 
              className="absolute inset-[15%] rounded-full border border-white/5 opacity-30 will-change-transform"
              animate={{ rotate: -360 }}
              transition={{ 
                rotate: { duration: 80, ease: "linear", repeat: Infinity }
              }}
           />
        </motion.div>
      </motion.div>

      <motion.div
        style={{ y }}
        className="max-w-6xl z-10 flex flex-col items-center relative"
      >
        <motion.h1 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-[9rem] font-sans tracking-tighter text-white leading-[1.1] md:leading-[0.95] mb-8"
        >
          DeTransfer
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="space-y-6"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
            Private, Decentralized and Trustless
          </h2>
          <p className="text-lg md:text-xl text-gray-400 font-mono font-light tracking-wide">
            Anonymous & Zero-Knowledge File Sharing
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-24 flex flex-col items-center gap-6 z-10"
      >
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">Powered by</span>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-all duration-500 grayscale hover:grayscale-0">
           <a href="#" className="group transition-opacity duration-300 hover:opacity-80">
              <WalrusLogo className="h-8 md:h-10 w-auto text-white" />
           </a>
           
           <a href="#" className="group transition-opacity duration-300 hover:opacity-80">
              <SuiLogo className="h-6 md:h-8 w-auto text-white" />
           </a>

           <a href="#" className="group transition-opacity duration-300 hover:opacity-80">
              <SealLogo className="h-6 md:h-8 w-auto text-white" />
           </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
      </motion.div>

      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />
      
      {/* Seamless InfoSection Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#080808]/60 pointer-events-none" />
    </section>
  );
};

export default Hero;
