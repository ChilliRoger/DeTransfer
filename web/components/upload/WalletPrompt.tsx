'use client'

import React from 'react'
import { FileText } from 'lucide-react'

export default function WalletPrompt() {
  return (
    <div className="text-center py-10 bg-white/5 rounded-xl border-2 border-dashed border-white/10">
      <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
        <FileText className="text-gray-500" />
      </div>
      <p className="text-gray-300 font-medium font-mono">Wallet Not Connected</p>
      <p className="text-xs text-gray-500 mt-2 px-8 font-mono">
        Please connect your Sui Wallet (Testnet) to start uploading files.
      </p>
    </div>
  )
}


