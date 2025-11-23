'use client'

import React from 'react'
import { UploadCloud, Lock, Share2, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'

interface UploadFormProps {
  file: File | null
  recipientAddress: string
  isPublic: boolean
  currentStep: number
  uploadProgress: number
  remainingTime: number
  status: string
  error: string
  onFileChange: (file: File | null) => void
  onRecipientChange: (address: string) => void
  onTogglePublic: (isPublic: boolean) => void
  onUpload: () => void
}

export default function UploadForm({
  file,
  recipientAddress,
  isPublic,
  currentStep,
  uploadProgress,
  remainingTime,
  status,
  error,
  onFileChange,
  onRecipientChange,
  onTogglePublic,
  onUpload
}: UploadFormProps) {
  const account = useCurrentAccount()

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Select File</label>
        <input
          type="file"
          disabled={currentStep > 0}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-eco-accent/20 file:text-eco-accent hover:file:bg-eco-accent/30 cursor-pointer border border-white/10 bg-white/5 rounded-lg p-2 transition-all disabled:opacity-50 font-mono"
        />
      </div>

      {/* Upload Type Toggle */}
      <div className="bg-white/5 p-1 rounded-lg flex border border-white/10">
        <button
          onClick={() => onTogglePublic(false)}
          disabled={currentStep > 0}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all font-mono ${
            !isPublic 
              ? 'bg-eco-accent/20 text-eco-accent shadow-sm' 
              : 'text-gray-500 hover:text-gray-300'
          } disabled:opacity-50`}
        >
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            Private (Encrypted)
          </div>
        </button>
        <button
          onClick={() => onTogglePublic(true)}
          disabled={currentStep > 0}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all font-mono ${
            isPublic 
              ? 'bg-eco-accent/20 text-eco-accent shadow-sm' 
              : 'text-gray-500 hover:text-gray-300'
          } disabled:opacity-50`}
        >
          <div className="flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Public (Shareable)
          </div>
        </button>
      </div>

      {/* Recipient Address (Only for Private) */}
      {!isPublic && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Recipient Wallet Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => onRecipientChange(e.target.value)}
              disabled={currentStep > 0}
              placeholder="0x..."
              className="block w-full text-sm border border-white/10 bg-white/5 rounded-lg p-2.5 focus:ring-eco-accent focus:border-eco-accent text-white placeholder-gray-600 font-mono disabled:opacity-50"
            />
            <button
              onClick={() => onRecipientChange(account?.address || "")}
              className="px-3 py-2 text-xs bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 whitespace-nowrap border border-white/10 transition-all font-mono disabled:opacity-50"
              disabled={currentStep > 0}
            >
              Use My Address
            </button>
          </div>
          <p className="text-xs text-gray-500 font-mono">Only this address will be able to decrypt the file.</p>
        </div>
      )}

      {/* Public Info */}
      {isPublic && (
        <div className="bg-eco-accent/10 text-eco-accent p-4 rounded-lg text-sm flex items-start gap-3 border border-eco-accent/20">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold font-mono">Public File</p>
            <p className="mt-1 text-gray-400 font-mono text-xs">
              This file will be stored on Walrus without encryption. Anyone with the Blob ID can access it.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-lg text-sm border border-red-500/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-mono">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {file && (
        <div className="space-y-3 pt-2">
          <button
            onClick={onUpload}
            disabled={currentStep !== 0}
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              currentStep > 0
                ? "border-eco-accent/50 bg-eco-accent/10 text-eco-accent"
                : "border-eco-accent bg-eco-accent/20 text-white hover:bg-eco-accent/30 hover:shadow-lg hover:shadow-eco-accent/20"
            } disabled:opacity-50`}
          >
            <span className="flex items-center gap-3 font-semibold font-mono">
              <UploadCloud className="w-5 h-5" />
              {isPublic ? 'Upload Public File' : 'Encrypt & Upload to Walrus'}
            </span>
            {status.includes("Uploading") && <Loader2 className="animate-spin w-5 h-5" />}
            {currentStep > 0 && <CheckCircle className="w-5 h-5" />}
          </button>

          {/* Progress Bar */}
          {status.includes("Uploading") && (
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-eco-accent h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>{uploadProgress}% Uploaded</span>
                <span>{remainingTime > 0 ? `~${remainingTime}s remaining` : 'Calculating...'}</span>
              </div>
            </div>
          )}

          {/* Finalizing Status */}
          {status.includes("Finalizing") && (
            <div className="flex items-center gap-2 text-xs text-eco-accent bg-eco-accent/10 p-2 rounded border border-eco-accent/20 font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing on Walrus network... this may take a moment.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



