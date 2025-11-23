'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Lock, Upload, Download, FileText, AlertCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const faqData: FAQItem[] = [
  {
    question: 'What is the difference between public and private files?',
    answer: 'Private files are encrypted client-side before upload using Seal SDK. Only the specified recipient wallet can decrypt them. Public files are stored unencrypted on Walrus and can be accessed by anyone with the blob ID. Use private files for sensitive data and public files for sharing with multiple people.',
    icon: <Lock className="w-5 h-5" />
  },
  {
    question: 'How do I share files with someone?',
    answer: 'For private files: Enter the recipient\'s wallet address when uploading. They will see the file in their "Shared with Me" section. For public files: Share the blob ID or the download link. You can also generate a QR code for easy sharing. Public files can be accessed by anyone with the link.',
    icon: <Upload className="w-5 h-5" />
  },
  {
    question: 'How do I download files shared with me?',
    answer: 'Navigate to the "Receive" or "Shared with Me" page. You\'ll see all files shared with your wallet address. Click "Download" on any file. For private files, you\'ll need to sign a personal message and approve a seal_approve transaction to decrypt the file. Public files download directly.',
    icon: <Download className="w-5 h-5" />
  },
  {
    question: 'Can I upload multiple files at once?',
    answer: 'Yes! DeTransfer supports batch file upload. You can select multiple files and upload them all in a single transaction. Each file is processed sequentially (encrypted if private, then uploaded to Walrus), and all file metadata is registered on the blockchain in one batch transaction.',
    icon: <Upload className="w-5 h-5" />
  },
  {
    question: 'What happens if I lose my wallet?',
    answer: 'If you lose access to your wallet, you cannot decrypt private files that were encrypted for that wallet address. However, if you have the seed phrase or private key backup, you can recover your wallet and regain access. Always backup your wallet seed phrase securely.',
    icon: <AlertCircle className="w-5 h-5" />
  },
  {
    question: 'Can I change the recipient after uploading?',
    answer: 'No, once a file is uploaded and registered on the blockchain, the recipient address cannot be changed. The file is encrypted for the specific recipient address you provided. If you need to share with a different recipient, you\'ll need to upload the file again with the new recipient address.',
    icon: <Lock className="w-5 h-5" />
  }
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#050505] via-[#080808]/60 to-[#050505] overflow-hidden">
      {/* Top Transition Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" />

      {/* Blob Animation Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px]"
        >
          <motion.div 
            className="absolute inset-0"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              rotate: { duration: 60, ease: "linear", repeat: Infinity },
              scale: { duration: 25, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_100deg,transparent_220deg)] blur-[100px] md:blur-[140px] opacity-30 mix-blend-screen" />
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-eco-accent/10 border border-eco-accent/20 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-eco-accent" />
            <span className="text-xs font-mono text-eco-accent uppercase tracking-wider">Frequently Asked Questions</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-sans font-normal text-white leading-tight mb-4">
            Everything you need to know
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Get answers to common questions about how to use DeTransfer.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left group"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1 text-eco-accent/60 group-hover:text-eco-accent transition-colors">
                    {faq.icon}
                  </div>
                  <h3 className="text-lg font-medium text-white group-hover:text-eco-accent transition-colors">
                    {faq.question}
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 text-gray-400 group-hover:text-white transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pl-14 border-t border-white/5">
                      <p className="text-gray-300 leading-relaxed pt-4">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050505] pointer-events-none" />
    </section>
  );
};

export default FAQSection;

