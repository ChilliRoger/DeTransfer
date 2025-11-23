'use client'

import React from 'react'
import { UploadCloud, Download, CheckCircle, Copy, QrCode, Link as LinkIcon, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface SuccessViewProps {
  blobId: string
  fileName: string | undefined
  isPublic: boolean
  shareBlobId: string
  isDownloading: boolean
  onCopyBlobId: () => void
  onCopyLink: () => void
  onDownload: () => void
  onReset: () => void
}

export default function SuccessView({
  blobId,
  fileName,
  isPublic,
  shareBlobId,
  isDownloading,
  onCopyBlobId,
  onCopyLink,
  onDownload,
  onReset
}: SuccessViewProps) {
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/upload?blobId=${blobId}` : `.../?blobId=${blobId}`

  return (
    <div className="bg-eco-accent/10 border border-eco-accent/20 rounded-xl p-6 text-center space-y-4">
      <div className="w-14 h-14 bg-eco-accent/20 text-eco-accent rounded-full flex items-center justify-center mx-auto">
        <UploadCloud className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">Upload Successful!</h3>
        <p className="text-sm text-gray-400 font-mono mt-1">
          Your {isPublic ? 'public' : 'encrypted'} file has been permanently stored.
        </p>
      </div>
      
      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Blob ID</p>
          <button
            onClick={onCopyBlobId}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-eco-accent/20 text-eco-accent rounded hover:bg-eco-accent/30 transition-all font-mono"
            title="Copy blob ID"
          >
            {shareBlobId === blobId ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs font-mono text-gray-500 break-all select-all">{blobId}</p>
      </div>

      {/* Share Link & QR Code (For Public Files) */}
      {isPublic && (
        <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              Shareable Link
            </p>
            <button
              onClick={onCopyLink}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-eco-accent/20 text-eco-accent rounded hover:bg-eco-accent/30 transition-all font-mono"
              title="Copy Link"
            >
              {shareBlobId === "link-" + blobId ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy Link
                </>
              )}
            </button>
          </div>
          <p className="text-xs font-mono text-gray-500 break-all select-all bg-black/20 p-2 rounded border border-white/5">
            {shareLink}
          </p>

          <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              Scan to Download
            </p>
            <div className="bg-white p-2 rounded border border-white/10">
              <QRCodeSVG
                value={shareLink}
                size={128}
                level={"M"}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 text-sm font-medium text-white bg-eco-accent px-4 py-2 rounded-lg hover:bg-eco-accent/90 transition-colors shadow-lg shadow-eco-accent/20 disabled:opacity-70 font-mono"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isPublic ? 'Download File' : 'Decrypt & Download'}
        </button>
        <button
          onClick={onReset}
          className="text-sm font-medium text-gray-300 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors border border-white/10 font-mono"
        >
          New Upload
        </button>
      </div>
    </div>
  )
}


