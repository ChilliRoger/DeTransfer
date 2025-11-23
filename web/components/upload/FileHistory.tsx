'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import FileList from './FileList'

interface FileRecord {
  blobId: string
  fileName: string
  fileType: string
  recipientAddress: string
  walletAddress: string
  uploadedAt: string
  isPublic: boolean
}

interface FileHistoryProps {
  userFiles: FileRecord[]
  sharedFiles: FileRecord[]
  shareBlobId: string
  onShare: (blobId: string) => void
  onDownload: (file: FileRecord) => void
  onDelete: (blobId: string) => void
  onClearAll: () => void
  onAccessBlobId: (blobId: string) => void
}

export default function FileHistory({
  userFiles,
  sharedFiles,
  shareBlobId,
  onShare,
  onDownload,
  onDelete,
  onClearAll,
  onAccessBlobId
}: FileHistoryProps) {
  const [historyTab, setHistoryTab] = useState<"uploads" | "shared">("uploads")
  const [accessBlobId, setAccessBlobId] = useState("")

  const handleAccess = () => {
    if (accessBlobId) {
      onAccessBlobId(accessBlobId)
      setAccessBlobId("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setHistoryTab("uploads")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors font-mono ${
            historyTab === "uploads"
              ? "border-eco-accent text-eco-accent"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          My Uploads ({userFiles.length})
        </button>
        <button
          onClick={() => setHistoryTab("shared")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors font-mono ${
            historyTab === "shared"
              ? "border-eco-accent text-eco-accent"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Shared with Me ({sharedFiles.length})
        </button>
      </div>

      {/* Access Shared File by BlobId */}
      <div className="bg-eco-accent/10 border border-eco-accent/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-eco-accent" />
          <label className="text-sm font-medium text-white font-mono">Access Shared File</label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={accessBlobId}
            onChange={(e) => setAccessBlobId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
            placeholder="Enter blob ID (0x...)"
            className="flex-1 text-sm border border-white/10 bg-white/5 rounded-lg p-2.5 focus:ring-eco-accent focus:border-eco-accent text-white placeholder-gray-600 font-mono"
          />
          <button
            onClick={handleAccess}
            className="px-4 py-2 bg-eco-accent text-white text-sm rounded-lg hover:bg-eco-accent/90 transition-all font-mono"
          >
            Access
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-mono">Enter a blob ID to access a file shared with you</p>
      </div>

      {/* Files List */}
      {historyTab === "uploads" ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">My Uploads</h2>
            {userFiles.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 flex items-center gap-1 font-mono transition-all"
              >
                Clear All
              </button>
            )}
          </div>
          <FileList
            files={userFiles}
            shareBlobId={shareBlobId}
            onShare={onShare}
            onDownload={onDownload}
            onDelete={onDelete}
            showDelete={true}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Shared with Me</h2>
          </div>
          <FileList
            files={sharedFiles}
            shareBlobId={shareBlobId}
            onShare={onShare}
            onDownload={onDownload}
            onDelete={onDelete}
            showDelete={false}
          />
        </>
      )}
    </div>
  )
}



