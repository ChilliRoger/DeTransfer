'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// --- Digital Sprite Component ---
// Simulates a low-res digital display animation found in retro-futuristic UIs
const DigitalSprite: React.FC<{ active: boolean }> = ({ active }) => {
  const [frame, setFrame] = useState(0);

  // 3x3 Grid patterns
  const frames = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1], // X shapeish
    [0, 1, 0, 1, 1, 1, 0, 1, 0], // Plus
    [1, 1, 1, 1, 0, 1, 1, 1, 1], // Square ring
    [0, 0, 0, 0, 1, 0, 0, 0, 0], // Center dot
  ];

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 150); // Speed of animation
    return () => clearInterval(interval);
  }, [active]);

  const currentPattern = frames[frame];

  return (
    <div className="grid grid-cols-3 gap-[2px] w-[18px] h-[18px]">
      {currentPattern.map((isOn, i) => (
        <div
          key={i}
          className={`w-full h-full rounded-[1px] transition-colors duration-75 ${
            isOn && active ? 'bg-eco-accent shadow-[0_0_4px_#2A70F1]' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
};

// --- Roadmap Data ---
const milestones = [
  {
    id: '01',
    quarter: 'Q1 2025',
    title: 'Genesis',
    description: 'Seal encryption and Walrus storage are now implemented, enabling the complete sender-side process of encrypting & transferring files.',
    status: 'completed'
  },
  {
    id: '02',
    quarter: 'Q2 2025',
    title: 'Convergence',
    description: 'Integrated Seal key servers in threshold mode. Indexer-ready metadata model for decentralized inbound file discovery.',
    status: 'active'
  },
  {
    id: '03',
    quarter: 'Q3 2025',
    title: 'Expansion',
    description: 'Integrate Nautilus to run malware/virus checks and authenticity scoring. Produce cryptographic proofs and attach them to transfers.',
    status: 'upcoming'
  },
  {
    id: '04',
    quarter: 'Q4 2025',
    title: 'Ubiquity',
    description: 'On-chain proof publishing on Sui for transparent, verifiable transfers. Move toward decentralized governance and policy control.',
    status: 'upcoming'
  }
];

const RoadmapSection: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="roadmap" className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#050505] via-[#080808]/40 to-[#050505] overflow-hidden">
      {/* Blob Animation Background - Right Side */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/2 right-0 translate-x-1/4 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px]"
        >
          {/* Primary Blue Blob - Optimized */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: 360,
              scale: [1, 1.05, 0.98, 1.02, 1],
            }}
            transition={{
              rotate: { duration: 80, ease: "linear", repeat: Infinity },
              scale: { duration: 30, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[80px] md:blur-[120px] opacity-15 mix-blend-screen" />
          </motion.div>

          {/* Secondary Cyan Blob - Optimized */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: -360,
              scale: [1, 0.98, 1.02, 0.99, 1],
            }}
            transition={{
              rotate: { duration: 100, ease: "linear", repeat: Infinity },
              scale: { duration: 35, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_180deg,transparent_0deg,#22d3ee_90deg,transparent_210deg)] blur-[80px] md:blur-[120px] opacity-10 mix-blend-screen" />
          </motion.div>
        </motion.div>
      </div>
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-sans text-white mb-6 tracking-tight">
            Protocol Roadmap
          </h2>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
            The path to decentralization
          </p>
        </motion.div>
      </div>

      {/* Roadmap List */}
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Desktop Horizontal Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10 hidden md:block">
          <motion.div
             initial={{ scaleX: 0 }}
             whileInView={{ scaleX: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
             className="h-full w-full bg-gradient-to-r from-eco-accent/20 via-eco-accent to-eco-accent/20 origin-left"
          />
        </div>

        {/* Mobile Vertical Line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-[1px] bg-white/10 md:hidden">
           <motion.div
             initial={{ scaleY: 0 }}
             whileInView={{ scaleY: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
             className="w-full h-full bg-gradient-to-b from-eco-accent/20 via-eco-accent to-eco-accent/20 origin-top"
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {milestones.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="relative flex flex-col gap-6 group md:pt-12"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Timeline Node - Desktop */}
              <div className="hidden md:flex absolute top-0 left-0 -translate-y-1/2 w-[19px] h-[19px] bg-[#050505] border border-white/20 rounded-full items-center justify-center z-10 group-hover:border-eco-accent transition-colors duration-300">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  hoveredIndex === index || item.status === 'active' ? 'bg-eco-accent' : 'bg-white/20'
                }`} />
              </div>

              {/* Timeline Node - Mobile */}
              <div className="md:hidden absolute left-[18px] -translate-x-1/2 top-0 w-[19px] h-[19px] bg-[#050505] border border-white/20 rounded-full flex items-center justify-center z-10">
                <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-eco-accent' : 'bg-white/20'}`} />
              </div>

              {/* Quarter & Sprite */}
              <div className="pl-12 md:pl-0">
                <span className={`font-mono text-sm transition-colors duration-300 ${
                  hoveredIndex === index ? 'text-eco-accent' : 'text-gray-500'
                }`}>
                  {item.quarter}
                </span>
                <div className="mt-2 h-6">
                   <div className={`transition-opacity duration-300 ${hoveredIndex === index ? 'opacity-100' : 'opacity-0'}`}>
                      <DigitalSprite active={hoveredIndex === index} />
                   </div>
                </div>
              </div>

              {/* Content Card */}
              <div className="pl-12 md:pl-0 flex-1">
                <div className="relative p-6 border border-white/5 bg-white/[0.02] rounded-sm transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/10 min-h-[200px] flex flex-col">
                  
                  {/* Hover Decoration Lines */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eco-accent/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eco-accent/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-75" />

                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-xs font-mono text-gray-600 border border-white/10 px-2 py-1 rounded">
                      PHASE {item.id}
                    </span>
                    {item.status === 'active' && (
                      <span className="flex items-center gap-2 text-xs font-mono text-eco-accent">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eco-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-eco-accent"></span>
                        </span>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-sans text-white mb-3 group-hover:text-eco-accent transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 font-inter font-light leading-relaxed text-sm group-hover:text-gray-300 transition-colors">
                    {item.description}
                  </p>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative Background Gradients */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-t from-eco-accent/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Transition Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" />
      
      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </section>
  );
};

export default RoadmapSection;
