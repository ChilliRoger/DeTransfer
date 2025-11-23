'use client'

import React from 'react'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { FileText } from 'lucide-react'

interface UploadHeaderProps {
  showHistory: boolean
  onToggleHistory: () => void
}

export default function UploadHeader({ showHistory, onToggleHistory }: UploadHeaderProps) {
  const account = useCurrentAccount()

  return (
    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
      <div>
        <h1 className="text-3xl font-sans text-white flex items-center gap-2">DeTransfer</h1>
        <p className="text-xs text-gray-500 mt-1 font-mono">Zero-Knowledge File Sharing</p>
      </div>
      <div className="flex items-center gap-3">
        {account && (
          <button
            onClick={onToggleHistory}
            className="text-sm px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 border border-white/10 transition-all font-mono"
          >
            {showHistory ? 'Upload' : 'History'}
          </button>
        )}
        <ConnectButton />
      </div>
    </div>
  )
}


