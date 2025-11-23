'use client'

import React from 'react'
import { CheckCircle, Share2, Download, Trash2 } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'

interface FileRecord {
  blobId: string
  fileName: string
  fileType: string
  recipientAddress: string
  walletAddress: string
  uploadedAt: string
  isPublic: boolean
}

interface FileListProps {
  files: FileRecord[]
  shareBlobId: string
  onShare: (blobId: string) => void
  onDownload: (file: FileRecord) => void
  onDelete: (blobId: string) => void
  showDelete?: boolean
}

export default function FileList({ 
  files, 
  shareBlobId, 
  onShare, 
  onDownload, 
  onDelete,
  showDelete = true 
}: FileListProps) {
  const account = useCurrentAccount()

  if (files.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8 font-mono text-sm">No files found</p>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {files.map((fileRecord) => (
        <div 
          key={fileRecord.blobId} 
          className="flex items-center justify-between p-4 bg-white/5 rounded-lg group hover:bg-white/10 border border-white/10 transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">{fileRecord.fileName}</p>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {fileRecord.isPublic ? (
                <span className="text-eco-accent font-semibold">Public File</span>
              ) : (
                <>To: {fileRecord.recipientAddress.slice(0, 8)}...{fileRecord.recipientAddress.slice(-6)}</>
              )}
              {' • '}{new Date(fileRecord.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onShare(fileRecord.blobId)}
              className="p-2 bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 transition-all"
              title="Copy blob ID to share"
            >
              {shareBlobId === fileRecord.blobId ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onDownload(fileRecord)}
              className="text-xs px-3 py-2 bg-eco-accent/20 text-eco-accent rounded-lg hover:bg-eco-accent/30 transition-all font-mono"
            >
              Download
            </button>
            {showDelete && (
              <button
                onClick={() => onDelete(fileRecord.blobId)}
                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


