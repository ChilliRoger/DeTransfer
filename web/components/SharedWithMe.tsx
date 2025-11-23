'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex, normalizeSuiAddress } from '@mysten/sui/utils';
import { SealClient, SessionKey } from '@mysten/seal';
import { Download, FileText, Loader2, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { getFilesByRecipient, getFileByBlobId } from '@/app/lib/sui';
import CircularProgress from '@/components/CircularProgress';

/* -------------------------------------------------------------------------- */
/* SDK INITIALIZATION                                                         */
/* -------------------------------------------------------------------------- */
const client = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

// Seal Configuration – using simple_recipient access policy for recipient-only decryption
const SEAL_PACKAGE_ID = "0xd1d471dd362206f61194c711d9dfcd1f8fd2d3e44df102efc15fa07332996247";
const SEAL_MODULE = "simple_recipient";

const sealClient = new SealClient({
  suiClient: client,
  serverConfigs: [
    { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
    { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
  ],
});

interface SharedFile {
  blobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  walletAddress: string;
  recipientAddress: string;
  uploadedAt: string | number;
  isPublic: boolean;
}

const SharedWithMe: React.FC = () => {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [accessBlobId, setAccessBlobId] = useState("");

  // Load shared files (files shared with user as recipient)
  const loadSharedFiles = async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      const normalizedAddress = normalizeSuiAddress(account.address);
      const files = await getFilesByRecipient(client, normalizedAddress);
      // Map FileMetadata to SharedFile format
      const sharedFiles: SharedFile[] = files.map(file => ({
        blobId: file.blobId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        walletAddress: file.uploader,
        recipientAddress: file.recipient,
        uploadedAt: file.uploadedAt,
        isPublic: file.isPublic,
      }));
      setSharedFiles(sharedFiles);
      setError("");
    } catch (e) {
      console.error("Failed to load shared files from blockchain", e);
      setError("Failed to load shared files from blockchain");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      loadSharedFiles();
    }
  }, [account]);

  const handleDownload = async (fileRecord: SharedFile) => {
    if (!account) {
      setError("Please connect your wallet to download files.");
      return;
    }

    setDownloadingId(fileRecord.blobId);
    setError("");

    try {
      // Fetch metadata to check if public
      let isFilePublic = fileRecord.isPublic;
      let decryptRecipientAddress = fileRecord.recipientAddress || (fileRecord as any).recipient;

      // Download using HTTP API with progress tracking
      const { downloadFromWalrus } = await import('@/app/lib/walrus/client');
      setDownloadProgress(prev => ({ ...prev, [fileRecord.blobId]: 0 }));
      const downloadedBlob = await downloadFromWalrus(fileRecord.blobId, (progress) => {
        setDownloadProgress(prev => ({ ...prev, [fileRecord.blobId]: progress }));
      });

      let finalBlob = downloadedBlob;

      // If NOT public, decrypt
      if (!isFilePublic) {
        const encryptedBytes = new Uint8Array(await downloadedBlob.arrayBuffer());

        // Normalize address for session key creation
        const normalizedAccountAddress = normalizeSuiAddress(account.address);
        const sessionKey = await SessionKey.create({
          address: normalizedAccountAddress,
          packageId: SEAL_PACKAGE_ID,
          ttlMin: 5,
          suiClient: client,
        });

        // Sign the session key's personal message
        const { signature } = await signPersonalMessage({
          message: sessionKey.getPersonalMessage(),
        });
        sessionKey.setPersonalMessageSignature(signature);

        // Normalize addresses for comparison
        const normalizedAccount = normalizeSuiAddress(account.address);
        const normalizedRecipient = normalizeSuiAddress(decryptRecipientAddress);

        // Verify that the current user is the recipient
        if (normalizedAccount !== normalizedRecipient) {
          throw new Error("Access denied: This file was encrypted for a different wallet address. Only the intended recipient can decrypt this file.");
        }

        const tx = new Transaction();
        tx.setSender(normalizedAccount);
        tx.moveCall({
          target: `${SEAL_PACKAGE_ID}::${SEAL_MODULE}::seal_approve`,
          arguments: [tx.pure.vector("u8", fromHex(normalizedRecipient))],
        });

        // @ts-ignore
        const txBytes = await tx.build({ client, onlyTransactionKind: true });
        // @ts-ignore
        const decryptedBytes = await sealClient.decrypt({ data: encryptedBytes, sessionKey, txBytes });

        setDownloadProgress(prev => ({ ...prev, [fileRecord.blobId]: 80 })); // Decrypting
        const decryptedArray = new Uint8Array(decryptedBytes);
        finalBlob = new Blob([decryptedArray], { type: fileRecord.fileType || "application/octet-stream" });
      }

      let downloadName = fileRecord.fileName || `walrus_file_${fileRecord.blobId.slice(0, 6)}`;

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadProgress(prev => ({ ...prev, [fileRecord.blobId]: 100 }));
    } catch (e: any) {
      console.error(e);
      // Sanitize error message - remove sensitive details
      let errorMessage = "Download failed";
      if (e.message) {
        if (e.message.includes("Access denied")) {
          errorMessage = "Access denied: This file was encrypted for a different wallet address. Only the intended recipient can decrypt this file.";
        } else if (e.message.includes("recipient") || e.message.includes("address")) {
          errorMessage = "Access denied: You don't have permission to decrypt this file.";
        } else if (e.message.includes("network") || e.message.includes("fetch")) {
          errorMessage = "Network error: Please check your connection and try again.";
        } else {
          errorMessage = "Download failed: " + e.message.replace(/0x[a-fA-F0-9]{64}/g, "[address]").substring(0, 100);
        }
      }
      setError(errorMessage);
      setDownloadProgress(prev => ({ ...prev, [fileRecord.blobId]: 0 }));
    } finally {
      setDownloadingId(null);
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileRecord.blobId];
          return newProgress;
        });
      }, 1000);
    }
  };

  const handleAccessByBlobId = async () => {
    if (!accessBlobId) return;
    try {
      const fileRecord = await getFileByBlobId(client, accessBlobId);
      if (fileRecord) {
        // Convert FileMetadata to SharedFile format
        const sharedFile: SharedFile = {
          blobId: fileRecord.blobId,
          fileName: fileRecord.fileName,
          fileType: fileRecord.fileType,
          fileSize: fileRecord.fileSize,
          walletAddress: fileRecord.uploader,
          recipientAddress: fileRecord.recipient,
          uploadedAt: new Date(fileRecord.uploadedAt * 1000).toISOString(),
          isPublic: fileRecord.isPublic,
        };
        await handleDownload(sharedFile);
        setAccessBlobId("");
      } else {
        setError("File not found on blockchain");
      }
    } catch (e) {
      console.error("Failed to access file from blockchain", e);
      setError("Failed to access file from blockchain");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!account) {
    return (
      <div className="text-center py-16 bg-white/5 rounded-xl border-2 border-dashed border-white/10">
        <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <FileText className="text-gray-400" size={32} />
        </div>
        <p className="text-white font-medium text-lg mb-2">Wallet Not Connected</p>
        <p className="text-sm text-gray-400 mt-2 px-8">
          Please connect your wallet to view shared files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadSharedFiles}
          disabled={isLoading}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group disabled:opacity-50"
          title="Refresh shared files"
        >
          <RefreshCw size={18} className={`text-gray-400 group-hover:text-white transition-colors ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Access Shared File by BlobId */}
      <div className="bg-eco-accent/10 border border-eco-accent/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-eco-accent" />
          <label className="text-sm font-medium text-white">Access Shared File</label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={accessBlobId}
            onChange={(e) => setAccessBlobId(e.target.value)}
            placeholder="Enter blob ID (0x...)"
            className="flex-1 text-sm bg-white/5 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-eco-accent/50 focus:bg-white/10 transition-all font-mono"
          />
          <button
            onClick={handleAccessByBlobId}
            className="px-4 py-2.5 bg-eco-accent text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Access
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Enter a blob ID to access a file shared with you</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl text-sm border border-red-500/20 break-words overflow-hidden">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="flex-1 break-words overflow-wrap-anywhere">{error}</p>
        </div>
      )}

      {/* Files List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-eco-accent" />
        </div>
      ) : sharedFiles.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No files shared with you yet</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {sharedFiles.map((fileRecord, index) => (
            <motion.div
              key={fileRecord.blobId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex-1">
                <p className="font-medium text-sm text-white">{fileRecord.fileName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  From: {fileRecord.walletAddress.slice(0, 8)}...{fileRecord.walletAddress.slice(-6)} • {formatFileSize(fileRecord.fileSize)} • {new Date(typeof fileRecord.uploadedAt === 'number' ? fileRecord.uploadedAt * 1000 : fileRecord.uploadedAt).toLocaleDateString()}
                </p>
                {fileRecord.isPublic && (
                  <span className="inline-block mt-1 text-xs text-eco-accent font-semibold">Public File</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(fileRecord)}
                  disabled={downloadingId === fileRecord.blobId}
                  className="text-xs px-4 py-2 bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 border border-eco-accent/20 transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  {downloadingId === fileRecord.blobId ? (
                    <>
                      <CircularProgress 
                        progress={downloadProgress[fileRecord.blobId] || 0} 
                        size={16} 
                        strokeWidth={2} 
                      />
                      <span>Downloading {downloadProgress[fileRecord.blobId] || 0}%</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedWithMe;

