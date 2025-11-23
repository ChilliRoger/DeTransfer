'use client'

import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Wallet, Upload, Lock, Download, Share2, CheckCircle, ArrowRight, FileText, Shield, Database } from 'lucide-react';

// --- Utility Components ---
const GlyphLabel: React.FC<{ text: string, className?: string }> = ({ text, className = "" }) => {
    const [display, setDisplay] = useState(text);
    
    useEffect(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]{}*&^%$#@!';
      let iterations = 0;
      const interval = setInterval(() => {
        setDisplay(text.split('').map((char, index) => {
          if (index < iterations) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        if (iterations >= text.length) clearInterval(interval);
        iterations += 1/2; 
      }, 30);
      return () => clearInterval(interval);
    }, [text]);
  
    return <span className={`font-mono ${className}`}>{display}</span>;
};

// --- Tutorial Step Visual Sprites ---

const ConnectWalletSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] rounded-xl p-6 shadow-2xl flex flex-col overflow-hidden font-mono text-sm relative border border-white/10">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Wallet className="w-48 h-48 text-white transform rotate-12" />
        </div>

        {/* Window Controls */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 z-10">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <span className="ml-4 text-gray-500 text-xs flex items-center">detransfer.io</span>
        </div>

        {/* Content Area */}
        <div className="space-y-4 z-10 font-mono text-sm md:text-base overflow-hidden text-gray-300">
            <div className="flex items-center gap-4">
                <span className="text-gray-600 select-none w-6 text-right">1</span>
                <div className="flex gap-2">
                    <span className="text-eco-accent">Welcome to</span> 
                    <span className="text-white font-semibold">DeTransfer</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-gray-600 select-none w-6 text-right">2</span>
                <span></span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-gray-600 select-none w-6 text-right">3</span>
                <div className="flex gap-2">
                    <span className="text-gray-500">Click</span>
                    <span className="text-white font-semibold">"Connect Wallet"</span>
                </div>
            </div>
            
            {/* Wallet Connection Block */}
            <motion.div 
                className="ml-10 bg-white/5 p-4 rounded-lg border-l-2 border-eco-accent my-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
            >
                 <div className="flex items-center gap-2 mb-2 text-xs text-eco-accent uppercase tracking-wider font-bold">
                    <div className="w-1.5 h-1.5 bg-eco-accent rounded-full animate-pulse" />
                    Connecting Wallet...
                 </div>
                 <motion.div 
                    className="text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                 >
                    <span className="text-white">Sui Wallet Extension</span><br/>
                    <span className="text-gray-500">✓ Connected: 0x1234...5678</span>
                 </motion.div>
            </motion.div>

            <div className="flex items-center gap-4">
                 <span className="text-gray-600 select-none w-6 text-right">8</span>
                 <span className="text-gray-500">// Ready to transfer files</span>
            </div>
        </div>
    </div>
);

const UploadFilesSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Browser Chrome */}
        <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-4 rounded-t-lg">
             <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
             </div>
             <div className="flex-1 bg-white/5 border border-white/10 rounded-md h-8 shadow-sm mx-4 flex items-center px-3 text-xs text-gray-500 font-mono">
                detransfer.io/upload
             </div>
        </div>

        {/* Browser Content */}
        <div className="flex-1 p-6 relative bg-[#050505]">
            <div className="space-y-4">
                {/* File Upload Area */}
                <div className="h-40 bg-white/5 border-2 border-dashed border-white/20 rounded-lg w-full relative overflow-hidden group flex items-center justify-center">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                    <motion.div 
                        className="bg-eco-accent text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg z-10"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Upload className="w-4 h-4" />
                        Select Files
                    </motion.div>
                    
                    {/* Scanning Effect */}
                    <motion.div 
                       className="absolute inset-0 border-2 border-eco-accent/30 z-0" 
                       initial={{ clipPath: "inset(0 100% 0 0)" }}
                       animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 100%)"] }}
                       transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                {/* File List */}
                <div className="space-y-2">
                    {['document.pdf', 'image.jpg', 'video.mp4'].map((file, i) => (
                        <motion.div 
                            key={i}
                            className="h-12 bg-white/5 border border-white/10 rounded-lg flex items-center px-4 gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.2 }}
                        >
                            <FileText className="w-4 h-4 text-eco-accent" />
                            <span className="text-sm text-white font-mono flex-1">{file}</span>
                            <span className="text-xs text-gray-500">2.4 MB</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const EncryptSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] rounded-xl p-8 font-mono text-sm md:text-base text-gray-300 shadow-2xl overflow-hidden relative border border-white/10">
        <div className="absolute right-0 top-0 p-8 opacity-5">
            <Lock className="w-40 h-40 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm">
                <span className="text-eco-accent font-bold">🔒</span>
                <span className="text-gray-500">Encrypting files...</span>
            </div>

            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 1, duration: 0.5 }}
                className="border-l-2 border-eco-accent/50 pl-4 space-y-2 text-sm"
            >
                <div className="flex justify-between w-full max-w-md">
                    <span className="text-gray-500">Initializing Seal SDK...</span>
                    <span className="text-eco-accent font-medium">Done</span>
                </div>
                <div className="flex justify-between w-full max-w-md">
                    <span className="text-gray-500">Generating encryption keys...</span>
                    <span className="text-eco-accent font-medium">Done</span>
                </div>
                
                <div className="mt-4 space-y-2">
                    <div className="bg-white/5 p-3 rounded border border-eco-accent/30 flex items-center justify-between">
                        <span className="text-white">document.pdf</span>
                        <span className="text-xs bg-eco-accent/20 text-eco-accent px-2 py-1 rounded uppercase tracking-wide font-bold">Encrypted</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded border border-white/10 flex items-center justify-between">
                        <span className="text-gray-400">image.jpg</span>
                        <span className="text-xs bg-white/10 text-gray-500 px-2 py-1 rounded uppercase tracking-wide">Encrypting...</span>
                    </div>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
                className="mt-2 text-eco-accent font-medium flex items-center gap-2"
            >
                <CheckCircle className="w-4 h-4" />
                All files encrypted. Ready for upload.
            </motion.div>
        </div>
    </div>
);

const UploadToWalrusSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] border border-white/10 rounded-xl p-8 flex flex-col relative overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-white/5 border-b border-white/10 p-4 flex items-center gap-3 z-20">
             <div className="w-8 h-8 rounded bg-eco-accent/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-eco-accent" />
             </div>
             <div>
                <div className="text-sm font-bold text-white">Uploading to Walrus</div>
                <div className="text-xs text-gray-500">Decentralized Storage Network</div>
             </div>
        </div>

        <div className="mt-16 space-y-6 relative z-10">
            {/* Upload Progress */}
            <motion.div 
                className="flex gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="w-10 h-10 rounded bg-eco-accent/20 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-eco-accent" />
                </div>
                <div className="w-full">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-sm text-white">Upload Progress</span>
                        <span className="text-xs text-gray-400">45%</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 text-gray-300 p-4 rounded-lg text-sm w-full">
                        <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-xs">
                                <span>document.pdf</span>
                                <span className="text-eco-accent">✓ Complete</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-eco-accent origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 2 }}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>image.jpg</span>
                                <span className="text-gray-500">Uploading...</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-eco-accent origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 0.45 }}
                                    transition={{ duration: 2, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
);

const RegisterOnChainSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] border border-white/10 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-2xl font-mono text-sm">
        {/* Header */}
        <div className="border-b border-white/10 pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-eco-accent" />
                <span className="font-sans font-bold text-white">Registering on Sui</span>
                <span className="px-2 py-0.5 bg-eco-accent/20 text-eco-accent rounded-full text-xs font-sans font-medium">Pending</span>
            </div>
            <div className="text-xs text-gray-500">Transaction</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
            <div className="space-y-1">
                 <div className="flex bg-white/5 border-l-2 border-white/20 opacity-50 px-2 py-1">
                    <span className="w-6 text-gray-500 select-none">-</span>
                    <span className="text-gray-400">Blob ID: 0xabc123...</span>
                 </div>
                 <div className="flex bg-eco-accent/10 border-l-2 border-eco-accent px-2 py-1 relative">
                    <span className="w-6 text-gray-500 select-none">+</span>
                    <span className="text-white">FileRecord registered</span>
                    
                    {/* Cursor Animation */}
                     <motion.div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-eco-accent"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                     />
                 </div>
                 <div className="px-4 py-1 text-gray-500">
                    // Metadata stored on-chain
                 </div>
            </div>

            {/* Success Message */}
            <motion.div 
                className="absolute top-1/2 left-8 right-8 bg-white/5 border border-eco-accent rounded-lg shadow-lg p-4 z-10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-eco-accent" />
                    <span className="font-bold text-xs text-white">Transaction Confirmed</span>
                    <span className="text-xs text-gray-500">Just now</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                    File metadata registered on Sui blockchain. Transfer complete!
                </p>
            </motion.div>
        </div>
    </div>
);

const DownloadSprite = () => (
    <div className="w-full h-full bg-[#0A0A0A] border border-white/10 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-2xl text-gray-300 font-mono text-sm">
        {/* Pipeline Header */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
             <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-eco-accent" />
                <span className="font-bold text-white">Download File</span>
             </div>
             <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-eco-accent animate-pulse" />
                Processing
             </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-8 px-2 relative">
             {['Query Sui', 'Download Blob', 'Decrypt', 'Ready'].map((stage, i) => (
                 <div key={stage} className="relative z-10 flex items-center gap-3">
                     <motion.div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center border ${i < 3 ? 'bg-eco-accent border-eco-accent text-white' : i === 3 ? 'border-eco-accent text-eco-accent bg-white/5' : 'border-white/20 text-gray-500 bg-white/5'}`}
                        initial={i === 3 ? { scale: 1 } : {}}
                        animate={i === 3 ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                     >
                        {i < 3 ? <CheckCircle className="w-4 h-4" /> : i === 3 ? <Download className="w-4 h-4" /> : <div className="w-2 h-2 bg-gray-500 rounded-full" />}
                     </motion.div>
                     <span className={`text-sm ${i === 3 ? 'text-white font-bold' : 'text-gray-400'}`}>{stage}</span>
                 </div>
             ))}
        </div>

        {/* Logs Console */}
        <div className="flex-1 bg-white/5 rounded-lg p-4 font-mono text-xs overflow-hidden flex flex-col border border-white/10">
            <div className="space-y-2">
                 <div className="text-gray-500">10:42:01 [info] Querying Sui for file metadata...</div>
                 <div className="text-gray-500">10:42:05 [info] FileRecord found</div>
                 <div className="text-white font-medium">10:42:06 [job] Downloading from Walrus...</div>
                 
                 <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.5 }}
                    className="text-eco-accent font-bold"
                 >
                    10:42:08 [info] Blob downloaded (2.4 MB)
                 </motion.div>
                 
                 <motion.div 
                     className="pl-4 border-l-2 border-eco-accent my-2 text-gray-400 italic"
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     transition={{ delay: 1.5 }}
                 >
                     Decrypting with Seal SDK...<br/>
                     {'>'} Session key approved
                 </motion.div>

                 <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 3 }}
                    className="text-white font-bold mt-2 flex items-center gap-2"
                 >
                    <CheckCircle className="w-4 h-4 text-eco-accent" /> 10:42:10 [success] File ready to download.
                 </motion.div>
            </div>
        </div>
    </div>
);

// --- Data & Types ---

const tutorialSteps = [
  {
    id: 'connect',
    label: 'Connect Wallet',
    num: '01',
    title: 'Start by connecting your Sui wallet.',
    subtitle: 'Wallet Connection',
    desc: 'Connect your Sui wallet to begin transferring files. DeTransfer uses your wallet for authentication and transaction signing.',
    visual: <ConnectWalletSprite />
  },
  {
    id: 'upload',
    label: 'Select Files',
    num: '02',
    title: 'Choose files to transfer.',
    subtitle: 'File Selection',
    desc: 'Select one or multiple files from your device. DeTransfer supports batch uploads for efficient transfers.',
    visual: <UploadFilesSprite />
  },
  {
    id: 'encrypt',
    label: 'Encrypt Files',
    num: '03',
    title: 'Files are encrypted client-side.',
    subtitle: 'End-to-End Encryption',
    desc: 'Private files are encrypted using Seal SDK before upload. Only the recipient can decrypt them.',
    visual: <EncryptSprite />
  },
  {
    id: 'walrus',
    label: 'Upload to Walrus',
    num: '04',
    title: 'Files stored on decentralized storage.',
    subtitle: 'Decentralized Storage',
    desc: 'Encrypted files are uploaded to Walrus, a decentralized storage network with redundancy and high availability.',
    visual: <UploadToWalrusSprite />
  },
  {
    id: 'register',
    label: 'Register on Sui',
    num: '05',
    title: 'File metadata stored on-chain.',
    subtitle: 'Blockchain Registry',
    desc: 'File metadata is registered on Sui blockchain, providing immutable proof of transfer and ownership.',
    visual: <RegisterOnChainSprite />
  },
  {
    id: 'download',
    label: 'Download Files',
    num: '06',
    title: 'Recipients can download securely.',
    subtitle: 'Secure Download',
    desc: 'Recipients view shared files, download from Walrus, and decrypt using their wallet signature.',
    visual: <DownloadSprite />
  }
];

// --- Feature Item Component for Sticky Scroll ---

const TutorialItem: React.FC<{ step: any, index: number, setIndex: (i: number) => void }> = ({ step, index, setIndex }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-50%", once: false });
  
  useEffect(() => {
    if (isInView) {
      setIndex(index);
    }
  }, [isInView, index, setIndex]);

  return (
    <div id={`tutorial-step-${index}`} ref={ref} className="min-h-screen flex items-center py-24 px-4 md:px-8">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Step Number & Label */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-eco-accent font-mono text-sm md:text-base font-bold tracking-wider">
                {step.num}
              </span>
              <div className="h-px w-12 bg-eco-accent/50" />
              <span className="text-gray-400 font-mono text-xs md:text-sm uppercase tracking-wider">
                {step.subtitle}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl">
            {step.desc}
          </p>

          {/* Label Badge */}
          <div className="flex items-center gap-2 pt-4">
            <div className="px-4 py-2 bg-eco-accent/10 border border-eco-accent/30 rounded-full">
              <span className="text-eco-accent font-mono text-xs md:text-sm font-semibold uppercase tracking-wider">
                {step.label}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// --- Main Tutorial Section Component ---

const TutorialSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section 
      id="tutorial" 
      className="relative bg-[#050505] overflow-hidden"
      ref={containerRef}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-eco-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pt-24 pb-12 px-4 md:px-8 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-eco-accent" />
            <span className="text-eco-accent font-mono text-xs md:text-sm uppercase tracking-widest">
              How It Works
            </span>
            <div className="h-px w-12 bg-eco-accent" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Simple, Secure File Transfer
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Follow these steps to transfer files securely using blockchain technology
          </p>
        </motion.div>

        {/* Sticky Visual Container */}
        <div className="sticky top-0 h-screen flex items-center justify-center px-4 md:px-8 z-10">
          <div className="w-full max-w-4xl h-[600px] md:h-[700px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
              >
                {tutorialSteps[activeIndex].visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-20">
          {tutorialSteps.map((step, index) => (
            <TutorialItem
              key={step.id}
              step={step}
              index={index}
              setIndex={setActiveIndex}
            />
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="sticky bottom-8 flex justify-center gap-3 z-30 px-4">
          {tutorialSteps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                setActiveIndex(index);
                const element = document.getElementById(`tutorial-step-${index}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`transition-all duration-300 ${
                activeIndex === index
                  ? 'w-8 h-2 bg-eco-accent rounded-full'
                  : 'w-2 h-2 bg-white/20 rounded-full hover:bg-white/40'
              }`}
              aria-label={`Go to step ${index + 1}: ${step.label}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </section>
  );
};

export default TutorialSection;