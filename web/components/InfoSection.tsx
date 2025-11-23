'use client'

import React from 'react';
import { motion } from 'framer-motion';

const InfoSection: React.FC = () => {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#050505] via-[#080808]/60 to-[#050505] overflow-hidden">

      {/* Top Transition Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" />

      {/* Blob Animation Background */}
      <div className="absolute inset-0 pointer-events-none">

        {/* Left Top Corner Blob */}
        <motion.div 
          className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[350px] h-[350px] md:w-[520px] md:h-[520px]"
        >

          {/* Primary Blue Blob (lighter) - Optimized */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: 360,
              scale: [1, 1.05, 0.98, 1.02, 1],
            }}
            transition={{
              rotate: { duration: 90, ease: "linear", repeat: Infinity },
              scale: { duration: 30, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full 
              bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_80deg,transparent_200deg)] 
              blur-[60px] md:blur-[100px] opacity-5 mix-blend-screen" 
            />
          </motion.div>

          {/* Secondary Cyan Blob - Optimized */}
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: -360,
              scale: [1, 0.98, 1.02, 0.99, 1],
            }}
            transition={{
              rotate: { duration: 110, ease: "linear", repeat: Infinity },
              scale: { duration: 35, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full 
              bg-[conic-gradient(from_180deg,transparent_0deg,#22d3ee_60deg,transparent_180deg)]
              blur-[60px] md:blur-[100px] opacity-4 mix-blend-screen"
            />
          </motion.div>
        </motion.div>

        {/* Right Bottom Corner Blob - Optimized */}
        <motion.div 
          className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[350px] h-[350px] md:w-[520px] md:h-[520px]"
        >
          <motion.div 
            className="absolute inset-0 will-change-transform"
            animate={{
              rotate: 180,
              scale: [1, 1.03, 0.98, 1.01, 1],
            }}
            transition={{
              rotate: { duration: 85, ease: "linear", repeat: Infinity },
              scale: { duration: 30, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full 
              bg-[radial-gradient(circle,#2A70F1_0%,transparent_75%)]
              blur-[70px] md:blur-[110px] opacity-5 mix-blend-screen"
            />
          </motion.div>
        </motion.div>

      </div>


      {/* CONTENT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-start relative z-10">

        {/* Left text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-sans font-normal text-white leading-tight">
            DeTransfer is a decentralized file-transfer network enabling 
            <span className="text-eco-accent/80"> secure, real-time, and private</span> movement of data across users.
          </h2>
        </motion.div>

        {/* Right text */}
        <div className="space-y-12 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <p className="text-xl md:text-2xl text-gray-400 font-inter font-light leading-relaxed">
              DeTransfer makes file sharing seamless in a Web3 world — combining client-side encryption, decentralized storage, and on-chain access control.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <p className="text-xl md:text-2xl text-gray-400 font-inter font-light leading-relaxed">
              DeTransfer’s programmable access policies and routing ensure flexible, secure, and efficient transfer of files under your control.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mt-12"
          />
        </div>
      </div>

      {/* Gradients */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </section>
  );
};

export default InfoSection;
