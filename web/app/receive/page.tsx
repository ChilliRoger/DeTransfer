'use client'

import SharedWithMe from '@/components/SharedWithMe'
import { motion } from 'framer-motion'

export default function Receive() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center pt-32 pb-32 px-4 md:px-6 relative overflow-hidden bg-[#050505]">
      {/* Blob Animation Background - Optimized */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] md:w-[900px] md:h-[900px]"
        >
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              rotate: { duration: 55, ease: "linear", repeat: Infinity },
              scale: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[60px] md:blur-[80px] opacity-35 mix-blend-screen" />
          </motion.div>
        </motion.div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-6xl font-sans text-white mb-4 tracking-tight">Shared with Me</h1>
          <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">Testnet Storage + Sui Registry + Seal Decryption</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
          
          <SharedWithMe />
        </motion.div>
      </div>

      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />
      
      {/* Seamless Footer Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
    </main>
  )
}

